package models

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

// PlayerType represents the type of player
type PlayerType string

const (
	PlayerTypeDefuser PlayerType = "defuser"
	PlayerTypeExpert  PlayerType = "expert"
)

// LobbyState represents the state of the lobby/game
type LobbyState string

const (
	LobbyStateWaiting  LobbyState = "waiting"  // In lobby, waiting to start
	LobbyStateStarting LobbyState = "starting" // Game is starting
	LobbyStateActive   LobbyState = "active"   // Game is active
)

// Player represents a connected player
type Player struct {
	ID       string    `json:"id"`
	Type     PlayerType `json:"type"`
	Conn     *Connection `json:"-"`
	JoinedAt time.Time `json:"joinedAt"`
}

// Connection wraps a WebSocket connection with a mutex for thread safety
type Connection struct {
	Send chan []byte
	mu   sync.Mutex
}

// GameSession manages a multiplayer game session
type GameSession struct {
	ID              string             `json:"id"`
	Bomb            *Bomb              `json:"bomb,omitempty"` // Only set when game is active
	Players         map[string]*Player `json:"players"`
	LobbyState      LobbyState         `json:"lobbyState"`
	HostID          string             `json:"hostId"`
	ModuleCount     int                `json:"moduleCount"`     // 1-6, default 6
	DefuserID       string             `json:"defuserId"`       // Empty if random
	IsRandomDefuser bool               `json:"isRandomDefuser"` // True if defuser should be random
	TimeLimit       int                `json:"timeLimit"`      // Time limit in seconds
	broadcastFunc   func([]byte)       // Function to broadcast messages
	broadcastActive bool               // Track if broadcast loop is running
	mu              sync.RWMutex
}

// NewGameSession creates a new game session in lobby state
func NewGameSession(id string, hostID string, timeLimit int) *GameSession {
	return &GameSession{
		ID:              id,
		Bomb:            nil, // Bomb created when game starts
		Players:         make(map[string]*Player),
		LobbyState:      LobbyStateWaiting,
		HostID:          hostID,
		ModuleCount:     6, // Default 6 modules
		DefuserID:       "",
		IsRandomDefuser: true, // Default to random defuser
		TimeLimit:       timeLimit,
	}
}

// AddPlayer adds a player to the session
func (gs *GameSession) AddPlayer(playerID string, playerType PlayerType, conn *Connection) {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	
	gs.Players[playerID] = &Player{
		ID:       playerID,
		Type:     playerType,
		Conn:     conn,
		JoinedAt: time.Now(),
	}
}

// RemovePlayer removes a player from the session
func (gs *GameSession) RemovePlayer(playerID string) {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	
	delete(gs.Players, playerID)
}

// GetPlayer returns a player by ID
func (gs *GameSession) GetPlayer(playerID string) (*Player, bool) {
	gs.mu.RLock()
	defer gs.mu.RUnlock()
	
	player, exists := gs.Players[playerID]
	return player, exists
}

// Broadcast sends a message to all players in the session
func (gs *GameSession) Broadcast(message []byte) {
	gs.mu.RLock()
	defer gs.mu.RUnlock()
	
	for _, player := range gs.Players {
		select {
		case player.Conn.Send <- message:
		default:
			// Skip if channel is full
		}
	}
}

// SetBroadcastFunc sets the function to use for broadcasting
func (gs *GameSession) SetBroadcastFunc(fn func([]byte)) {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	gs.broadcastFunc = fn
}

// StartBroadcast marks the broadcast loop as active
func (gs *GameSession) StartBroadcast() bool {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	if gs.broadcastActive {
		return false
	}
	gs.broadcastActive = true
	return true
}

// SetModuleCount sets the number of modules (1-6)
func (gs *GameSession) SetModuleCount(count int) error {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	
	if count < 1 || count > 6 {
		return fmt.Errorf("module count must be between 1 and 6")
	}
	
	gs.ModuleCount = count
	return nil
}

// SetDefuser sets the defuser selection
func (gs *GameSession) SetDefuser(defuserID string, isRandom bool) {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	
	gs.DefuserID = defuserID
	gs.IsRandomDefuser = isRandom
}

// StartGame creates the bomb and transitions to active state
func (gs *GameSession) StartGame() error {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	
	if gs.LobbyState != LobbyStateWaiting {
		return fmt.Errorf("game can only be started from waiting state")
	}
	
	if len(gs.Players) < 2 {
		return fmt.Errorf("at least 2 players required to start game")
	}
	
	// Determine defuser
	defuserID := gs.DefuserID
	if gs.IsRandomDefuser || defuserID == "" {
		// Select random player
		playerIDs := make([]string, 0, len(gs.Players))
		for id := range gs.Players {
			playerIDs = append(playerIDs, id)
		}
		if len(playerIDs) > 0 {
			// Use math/rand for better randomness
			rand.Seed(time.Now().UnixNano())
			defuserID = playerIDs[rand.Intn(len(playerIDs))]
		}
	}
	
	// Create bomb with specified module count
	gs.Bomb = NewBomb(gs.ID, gs.TimeLimit, gs.ModuleCount)
	
	// Set all players as experts first, then set the defuser
	for id, player := range gs.Players {
		if id == defuserID {
			player.Type = PlayerTypeDefuser
		} else {
			player.Type = PlayerTypeExpert
		}
	}
	
	gs.LobbyState = LobbyStateActive
	return nil
}

// ReturnToLobby resets the game state back to lobby
func (gs *GameSession) ReturnToLobby() error {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	
	if gs.LobbyState != LobbyStateActive {
		return fmt.Errorf("can only return to lobby from active game state")
	}
	
	// Clear the bomb
	gs.Bomb = nil
	
	// Reset lobby state
	gs.LobbyState = LobbyStateWaiting
	
	// Reset player types back to default (defuser)
	// They will be reassigned when the game starts again
	for _, player := range gs.Players {
		player.Type = PlayerTypeDefuser
	}
	
	// Stop broadcast loop if running
	gs.broadcastActive = false
	
	return nil
}

// GetLobbyState returns the current lobby state
func (gs *GameSession) GetLobbyState() LobbyState {
	gs.mu.RLock()
	defer gs.mu.RUnlock()
	return gs.LobbyState
}

// IsHost checks if a player is the host
func (gs *GameSession) IsHost(playerID string) bool {
	gs.mu.RLock()
	defer gs.mu.RUnlock()
	return gs.HostID == playerID
}

// GetLobbyInfo returns lobby information in a thread-safe way
func (gs *GameSession) GetLobbyInfo() (LobbyState, int, string, bool) {
	gs.mu.RLock()
	defer gs.mu.RUnlock()
	return gs.LobbyState, gs.ModuleCount, gs.DefuserID, gs.IsRandomDefuser
}

// GetHostID returns the host ID in a thread-safe way
func (gs *GameSession) GetHostID() string {
	gs.mu.RLock()
	defer gs.mu.RUnlock()
	return gs.HostID
}

// GetPlayersCopy returns a copy of the players map in a thread-safe way
func (gs *GameSession) GetPlayersCopy() map[string]*Player {
	gs.mu.RLock()
	defer gs.mu.RUnlock()
	
	playersCopy := make(map[string]*Player, len(gs.Players))
	for id, player := range gs.Players {
		playersCopy[id] = player
	}
	return playersCopy
}

// Update updates the bomb state (time remaining, etc.)
func (gs *GameSession) Update() {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	
	if gs.Bomb != nil {
		gs.Bomb.UpdateTimeRemaining()
	}
}

