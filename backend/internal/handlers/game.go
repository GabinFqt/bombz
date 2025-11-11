package handlers

import (
	"bombs/internal/models"
	"bombs/internal/service"
	"bombs/internal/utils"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

// GameHandler handles REST API requests for game management
type GameHandler struct {
	gameService *service.GameService
}

// NewGameHandler creates a new game handler
func NewGameHandler(gameService *service.GameService) *GameHandler {
	return &GameHandler{
		gameService: gameService,
	}
}

// CreateGameRequest represents a request to create a new game
type CreateGameRequest struct {
	TimeLimit   int `json:"timeLimit"`   // in seconds
	ModuleCount int `json:"moduleCount"` // 1-6, default 6
}

// CreateGameResponse represents the response when creating a game
type CreateGameResponse struct {
	SessionID string              `json:"sessionId"`
	HostID    string              `json:"hostId"`
	Lobby     *LobbyStateResponse `json:"lobby"`
}

// LobbyStateResponse represents the lobby state
type LobbyStateResponse struct {
	State           models.LobbyState `json:"state"`
	HostID          string            `json:"hostId"`
	Players         []*PlayerInfo     `json:"players"`
	ModuleCount     int               `json:"moduleCount"`
	DefuserID       string            `json:"defuserId"`
	IsRandomDefuser bool              `json:"isRandomDefuser"`
}

// PlayerInfo represents player information in lobby
type PlayerInfo struct {
	ID       string            `json:"id"`
	Type     models.PlayerType `json:"type"`
	JoinedAt string            `json:"joinedAt"`
}

// JoinGameRequest represents a request to join a game
type JoinGameRequest struct {
	SessionID string `json:"sessionId"`
}

// JoinGameResponse represents the response when joining a game
type JoinGameResponse struct {
	SessionID string              `json:"sessionId"`
	Lobby     *LobbyStateResponse `json:"lobby"`
}

// UpdateLobbySettingsRequest represents a request to update lobby settings
type UpdateLobbySettingsRequest struct {
	ModuleCount     int    `json:"moduleCount"` // 1-6
	DefuserID       string `json:"defuserId"`   // Empty if random
	IsRandomDefuser bool   `json:"isRandomDefuser"`
}

// StartGameRequest represents a request to start the game
type StartGameRequest struct {
	SessionID string `json:"sessionId"`
}

// CreateGame handles POST /api/game
func (h *GameHandler) CreateGame(w http.ResponseWriter, r *http.Request) {
	var req CreateGameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteBadRequest(w, "Invalid request body")
		return
	}

	if req.TimeLimit <= 0 {
		req.TimeLimit = 300 // Default 5 minutes
	}

	if req.ModuleCount < 1 || req.ModuleCount > 6 {
		req.ModuleCount = 6 // Default 6 modules
	}

	// Generate session ID
	sessionID, err := utils.GenerateSessionID()
	if err != nil {
		WriteInternalServerError(w, "Failed to generate session ID")
		return
	}

	// Generate host ID
	hostID, err := utils.GenerateHostID()
	if err != nil {
		WriteInternalServerError(w, "Failed to generate host ID")
		return
	}

	session := h.gameService.CreateSession(sessionID, hostID, req.TimeLimit)

	// Set initial module count
	session.SetModuleCount(req.ModuleCount)

	response := CreateGameResponse{
		SessionID: sessionID,
		HostID:    hostID,
		Lobby:     h.buildLobbyStateResponse(session),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// JoinGame handles POST /api/game/join
func (h *GameHandler) JoinGame(w http.ResponseWriter, r *http.Request) {
	var req JoinGameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteBadRequest(w, "Invalid request body")
		return
	}

	session, exists := h.gameService.GetSession(req.SessionID)
	if !exists {
		WriteNotFound(w, "Session not found")
		return
	}

	response := JoinGameResponse{
		SessionID: session.ID,
		Lobby:     h.buildLobbyStateResponse(session),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetGameState handles GET /api/game/{sessionId}
// Optional query parameter: playerId - if provided, returns role-specific content
func (h *GameHandler) GetGameState(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionId"]
	playerID := r.URL.Query().Get("playerId")

	session, exists := h.gameService.GetSession(sessionID)
	if !exists {
		WriteNotFound(w, "Session not found")
		return
	}

	// Return bomb if game is active, otherwise return lobby state
	if session.GetLobbyState() == models.LobbyStateActive && session.Bomb != nil {
		w.Header().Set("Content-Type", "application/json")

		// If playerId is provided, return role-specific content
		if playerID != "" {
			player, exists := session.GetPlayer(playerID)
			if exists && player.Type == models.PlayerTypeExpert {
				// Return manual content for experts
				json.NewEncoder(w).Encode(models.GetManualContent(session.Bomb))
				return
			}
		}

		// Default: return bomb state (for defusers or when playerId not provided)
		json.NewEncoder(w).Encode(session.Bomb)
	} else {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(h.buildLobbyStateResponse(session))
	}
}

// GetLobbyState handles GET /api/game/{sessionId}/lobby
func (h *GameHandler) GetLobbyState(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionId"]

	session, exists := h.gameService.GetSession(sessionID)
	if !exists {
		WriteNotFound(w, "Session not found")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.buildLobbyStateResponse(session))
}

// UpdateLobbySettings handles POST /api/game/{sessionId}/lobby/settings
func (h *GameHandler) UpdateLobbySettings(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionId"]

	// Get host ID from query parameter or header
	hostID := r.URL.Query().Get("hostId")
	if hostID == "" {
		WriteBadRequest(w, "Host ID required")
		return
	}

	session, exists := h.gameService.GetSession(sessionID)
	if !exists {
		WriteNotFound(w, "Session not found")
		return
	}

	if !session.IsHost(hostID) {
		WriteForbidden(w, "Only host can update lobby settings")
		return
	}

	var req UpdateLobbySettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteBadRequest(w, "Invalid request body")
		return
	}

	// Update module count
	if req.ModuleCount > 0 {
		if err := session.SetModuleCount(req.ModuleCount); err != nil {
			WriteBadRequest(w, err.Error())
			return
		}
	}

	// Update defuser settings
	session.SetDefuser(req.DefuserID, req.IsRandomDefuser)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.buildLobbyStateResponse(session))
}

// StartGame handles POST /api/game/{sessionId}/start
func (h *GameHandler) StartGame(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionId"]

	// Get host ID from query parameter or header
	hostID := r.URL.Query().Get("hostId")
	if hostID == "" {
		WriteBadRequest(w, "Host ID required")
		return
	}

	session, exists := h.gameService.GetSession(sessionID)
	if !exists {
		WriteNotFound(w, "Session not found")
		return
	}

	if !session.IsHost(hostID) {
		WriteForbidden(w, "Only host can start the game")
		return
	}

	if err := h.gameService.StartGame(sessionID); err != nil {
		WriteBadRequest(w, err.Error())
		return
	}

	// Refresh session after starting
	session, _ = h.gameService.GetSession(sessionID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.buildLobbyStateResponse(session))
}

// ReturnToLobby handles POST /api/game/{sessionId}/return-to-lobby
func (h *GameHandler) ReturnToLobby(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionId"]

	// Get host ID from query parameter
	hostID := r.URL.Query().Get("hostId")
	if hostID == "" {
		http.Error(w, "Host ID required", http.StatusBadRequest)
		return
	}

	session, exists := h.gameService.GetSession(sessionID)
	if !exists {
		WriteNotFound(w, "Session not found")
		return
	}

	if !session.IsHost(hostID) {
		WriteForbidden(w, "Only host can return to lobby")
		return
	}

	if err := h.gameService.ReturnToLobby(sessionID, hostID); err != nil {
		WriteBadRequest(w, err.Error())
		return
	}

	// Refresh session after returning to lobby
	session, _ = h.gameService.GetSession(sessionID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.buildLobbyStateResponse(session))
}

// buildLobbyStateResponse builds a lobby state response from a session
func (h *GameHandler) buildLobbyStateResponse(session *models.GameSession) *LobbyStateResponse {
	lobbyData := buildLobbyData(session, "")

	// Convert PlayerData to PlayerInfo
	players := make([]*PlayerInfo, 0, len(lobbyData.Players))
	for _, p := range lobbyData.Players {
		players = append(players, &PlayerInfo{
			ID:       p.ID,
			Type:     p.Type,
			JoinedAt: p.JoinedAt,
		})
	}

	return &LobbyStateResponse{
		State:           lobbyData.State,
		HostID:          lobbyData.HostID,
		Players:         players,
		ModuleCount:     lobbyData.ModuleCount,
		DefuserID:       lobbyData.DefuserID,
		IsRandomDefuser: lobbyData.IsRandomDefuser,
	}
}
