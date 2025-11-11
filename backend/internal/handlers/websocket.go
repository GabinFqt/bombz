package handlers

import (
	"bombs/internal/models"
	"bombs/internal/service"
	"bombs/internal/utils"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

// WebSocketHandler handles WebSocket connections
type WebSocketHandler struct {
	gameService *service.GameService
	upgrader    websocket.Upgrader
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(gameService *service.GameService) *WebSocketHandler {
	return &WebSocketHandler{
		gameService: gameService,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins in development
			},
		},
	}
}

// WebSocketMessage represents a message sent over WebSocket
type WebSocketMessage struct {
	Type      string          `json:"type"`
	SessionID string          `json:"sessionId,omitempty"`
	PlayerID  string          `json:"playerId,omitempty"`
	Data      json.RawMessage `json:"data,omitempty"`
}

// HandleWebSocket handles WebSocket connections at /ws/{sessionId}
func (h *WebSocketHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionId"]
	
	if sessionID == "" {
		WriteBadRequest(w, "Session ID required")
		return
	}
	
	session, exists := h.gameService.GetSession(sessionID)
	if !exists {
		WriteNotFound(w, "Session not found")
		return
	}
	
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	
	// Check if hostId is provided in query parameter
	// If it matches the session's hostId, use it as playerID
	hostIDParam := r.URL.Query().Get("hostId")
	var playerID string
	if hostIDParam != "" && session.IsHost(hostIDParam) {
		// This is the host connecting, use their hostId as playerID
		playerID = hostIDParam
	} else {
		// Generate new player ID for regular players
		var err error
		playerID, err = utils.GeneratePlayerID()
		if err != nil {
			log.Printf("Failed to generate player ID: %v", err)
			WriteInternalServerError(w, "Failed to generate player ID")
			return
		}
	}
	
	// Create connection wrapper
	wsConn := &models.Connection{
		Send: make(chan []byte, 256),
	}
	
	// Default player type (will be reassigned when game starts)
	playerType := models.PlayerTypeDefuser
	
	// Add player to session
	session.AddPlayer(playerID, playerType, wsConn)
	
	// Set up broadcast function if not already set
	session.SetBroadcastFunc(func(msg []byte) {
		session.Broadcast(msg)
	})
	
	// Broadcast lobby update when player joins
	if session.GetLobbyState() == models.LobbyStateWaiting {
		h.broadcastLobbyUpdate(session)
	}
	
	// Start goroutines for reading and writing
	go h.writePump(conn, wsConn, session, playerID)
	go h.readPump(conn, session, playerID)
	
	// Start broadcast loop only if game is active and not already running
	if session.GetLobbyState() == models.LobbyStateActive && session.StartBroadcast() {
		go h.broadcastLoop(session)
	}
	
	// Send initial state via channel (lobby or game state)
	if session.GetLobbyState() == models.LobbyStateWaiting {
		h.sendLobbyStateToConnection(wsConn, session, playerID)
	} else if session.Bomb != nil {
		h.sendGameStateToConnection(wsConn, session, playerID)
	}
}

// readPump reads messages from the WebSocket connection
func (h *WebSocketHandler) readPump(conn *websocket.Conn, session *models.GameSession, playerID string) {
	defer func() {
		session.RemovePlayer(playerID)
		// Broadcast lobby update when player leaves (if in lobby)
		if session.GetLobbyState() == models.LobbyStateWaiting {
			h.broadcastLobbyUpdate(session)
		}
		conn.Close()
	}()
	
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	
	for {
		_, messageBytes, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
		
		var msg WebSocketMessage
		if err := json.Unmarshal(messageBytes, &msg); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}
		
		h.handleMessage(conn, session, playerID, &msg)
	}
}

// writePump writes messages to the WebSocket connection
func (h *WebSocketHandler) writePump(conn *websocket.Conn, wsConn *models.Connection, session *models.GameSession, playerID string) {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		conn.Close()
	}()
	
	for {
		select {
		case message, ok := <-wsConn.Send:
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			
			w, err := conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)
			
			// Add queued messages
			n := len(wsConn.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-wsConn.Send)
			}
			
			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage processes incoming WebSocket messages
func (h *WebSocketHandler) handleMessage(conn *websocket.Conn, session *models.GameSession, playerID string, msg *WebSocketMessage) {
	switch msg.Type {
	case "cutWire":
		// Only allow cutting wires if game is active
		if session.GetLobbyState() != models.LobbyStateActive || session.Bomb == nil {
			return
		}
		
		var data struct {
			ModuleIndex int `json:"moduleIndex"`
			WireIndex   int `json:"wireIndex"`
		}
		if err := json.Unmarshal(msg.Data, &data); err != nil {
			return
		}
		
		correct := session.Bomb.CutWire(data.ModuleIndex, data.WireIndex)
		
		// Broadcast updated state to all players
		h.broadcastGameState(session)
		
		// Send response to the player who cut the wire via their connection channel
		player, exists := session.GetPlayer(playerID)
		if exists && player.Conn != nil {
			response := WebSocketMessage{
				Type:     "wireCutResult",
				PlayerID: playerID,
				Data:     mustMarshal(map[string]interface{}{"correct": correct, "moduleIndex": data.ModuleIndex, "wireIndex": data.WireIndex}),
			}
			responseBytes, _ := json.Marshal(response)
			select {
			case player.Conn.Send <- responseBytes:
			default:
				// Channel full, skip
			}
		}
		
	case "updateLobbySettings":
		// Only allow host to update settings, and only in waiting state
		if session.GetLobbyState() != models.LobbyStateWaiting {
			return
		}
		
		if !session.IsHost(playerID) {
			return
		}
		
		var data struct {
			ModuleCount    int    `json:"moduleCount"`
			DefuserID      string `json:"defuserId"`
			IsRandomDefuser bool  `json:"isRandomDefuser"`
		}
		if err := json.Unmarshal(msg.Data, &data); err != nil {
			return
		}
		
		// Update module count
		if data.ModuleCount > 0 {
			if err := session.SetModuleCount(data.ModuleCount); err != nil {
				return
			}
		}
		
		// Update defuser settings
		session.SetDefuser(data.DefuserID, data.IsRandomDefuser)
		
		// Broadcast lobby update
		h.broadcastLobbyUpdate(session)
		
	case "startGame":
		// Only allow host to start game, and only in waiting state
		if session.GetLobbyState() != models.LobbyStateWaiting {
			return
		}
		
		if !session.IsHost(playerID) {
			return
		}
		
		// Start the game
		if err := h.gameService.StartGame(session.ID); err != nil {
			// Send error to host
			player, exists := session.GetPlayer(playerID)
			if exists && player.Conn != nil {
				response := WebSocketMessage{
					Type:     "error",
					PlayerID: playerID,
					Data:     mustMarshal(map[string]interface{}{"message": err.Error()}),
				}
				responseBytes, _ := json.Marshal(response)
				select {
				case player.Conn.Send <- responseBytes:
				default:
				}
			}
			return
		}
		
		// Refresh session
		session, _ = h.gameService.GetSession(session.ID)
		
		// Broadcast lobby update with updated player types
		h.broadcastLobbyUpdate(session)
		
		// Start broadcast loop if not already running
		if session.StartBroadcast() {
			go h.broadcastLoop(session)
		}
		
		// Broadcast game starting message
		h.broadcastGameStarting(session)
		
		// Broadcast initial game state
		h.broadcastGameState(session)
		
	case "returnToLobby":
		// Only allow host to return to lobby
		if !session.IsHost(playerID) {
			return
		}
		
		// Return to lobby
		if err := h.gameService.ReturnToLobby(session.ID, playerID); err != nil {
			// Send error to host
			player, exists := session.GetPlayer(playerID)
			if exists && player.Conn != nil {
				response := WebSocketMessage{
					Type:     "error",
					PlayerID: playerID,
					Data:     mustMarshal(map[string]interface{}{"message": err.Error()}),
				}
				responseBytes, _ := json.Marshal(response)
				select {
				case player.Conn.Send <- responseBytes:
				default:
				}
			}
			return
		}
		
		// Refresh session
		session, _ = h.gameService.GetSession(session.ID)
		
		// Broadcast returned to lobby message
		h.broadcastReturnedToLobby(session)
		
		// Broadcast updated lobby state
		h.broadcastLobbyUpdate(session)
		
	case "ping":
		// Respond to ping via connection channel
		player, exists := session.GetPlayer(playerID)
		if exists && player.Conn != nil {
			response := WebSocketMessage{Type: "pong"}
			responseBytes, _ := json.Marshal(response)
			select {
			case player.Conn.Send <- responseBytes:
			default:
				// Channel full, skip
			}
		}
	}
}

// sendGameStateToConnection sends the current game state to a connection via channel
// Sends bomb state to defusers, manual content to experts
func (h *WebSocketHandler) sendGameStateToConnection(wsConn *models.Connection, session *models.GameSession, playerID string) {
	player, exists := session.GetPlayer(playerID)
	if !exists {
		return
	}

	var content interface{}
	var messageType string

	if player.Type == models.PlayerTypeExpert {
		// Send manual content with bomb state to experts (so they can see wire configurations)
		content = models.GetManualContent(session.Bomb)
		messageType = "manualContent"
	} else {
		// Send bomb state to defusers
		content = session.Bomb
		messageType = "gameState"
	}

	msg := WebSocketMessage{
		Type:      messageType,
		SessionID: session.ID,
		Data:      mustMarshal(content),
	}
	msgBytes, _ := json.Marshal(msg)
	select {
	case wsConn.Send <- msgBytes:
	default:
		// Channel full, skip
	}
}

// broadcastGameState broadcasts the current game state to all players in the session
// Sends bomb state to defusers, manual content to experts
func (h *WebSocketHandler) broadcastGameState(session *models.GameSession) {
	if session.Bomb == nil {
		return
	}
	
	// Get players copy to iterate safely
	playersMap := session.GetPlayersCopy()
	
	// Send role-specific content to each player
	for _, player := range playersMap {
		var content interface{}
		var messageType string

		if player.Type == models.PlayerTypeExpert {
			// Send manual content with bomb state to experts (so they can see wire configurations)
			content = models.GetManualContent(session.Bomb)
			messageType = "manualContent"
		} else {
			// Send bomb state to defusers
			content = session.Bomb
			messageType = "gameState"
		}

		msg := WebSocketMessage{
			Type:      messageType,
			SessionID: session.ID,
			Data:      mustMarshal(content),
		}
		msgBytes, _ := json.Marshal(msg)
		
		// Send to specific player's connection
		if player.Conn != nil {
			select {
			case player.Conn.Send <- msgBytes:
			default:
				// Channel full, skip
			}
		}
	}
}

// broadcastLobbyUpdate broadcasts lobby state to all players
func (h *WebSocketHandler) broadcastLobbyUpdate(session *models.GameSession) {
	lobbyData := buildLobbyData(session, "")
	
	msg := WebSocketMessage{
		Type:      "lobbyUpdate",
		SessionID: session.ID,
		Data:      mustMarshal(lobbyData),
	}
	msgBytes, _ := json.Marshal(msg)
	session.Broadcast(msgBytes)
}

// broadcastGameStarting broadcasts that the game is starting
func (h *WebSocketHandler) broadcastGameStarting(session *models.GameSession) {
	msg := WebSocketMessage{
		Type:      "gameStarting",
		SessionID: session.ID,
	}
	msgBytes, _ := json.Marshal(msg)
	session.Broadcast(msgBytes)
}

// broadcastReturnedToLobby broadcasts that the game has returned to lobby
func (h *WebSocketHandler) broadcastReturnedToLobby(session *models.GameSession) {
	msg := WebSocketMessage{
		Type:      "returnedToLobby",
		SessionID: session.ID,
	}
	msgBytes, _ := json.Marshal(msg)
	session.Broadcast(msgBytes)
}

// sendLobbyStateToConnection sends the current lobby state to a connection
func (h *WebSocketHandler) sendLobbyStateToConnection(wsConn *models.Connection, session *models.GameSession, playerID string) {
	lobbyData := buildLobbyData(session, playerID)
	
	msg := WebSocketMessage{
		Type:      "lobbyUpdate",
		SessionID: session.ID,
		Data:      mustMarshal(lobbyData),
	}
	msgBytes, _ := json.Marshal(msg)
	select {
	case wsConn.Send <- msgBytes:
	default:
		// Channel full, skip
	}
}

// broadcastLoop periodically broadcasts game state updates
func (h *WebSocketHandler) broadcastLoop(session *models.GameSession) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	
	for range ticker.C {
		session.Update()
		h.broadcastGameState(session)
		
		// Stop broadcasting if game is over
		if session.Bomb.State != models.BombStateActive {
			break
		}
	}
}

// Helper functions
func mustMarshal(v interface{}) json.RawMessage {
	data, _ := json.Marshal(v)
	return json.RawMessage(data)
}


