package service

import (
	"bombs/internal/models"
	"fmt"
	"sync"
	"time"
)

// GameService manages all game sessions
type GameService struct {
	sessions map[string]*models.GameSession
	mu       sync.RWMutex
}

// NewGameService creates a new game service
func NewGameService() *GameService {
	gs := &GameService{
		sessions: make(map[string]*models.GameSession),
	}

	// Start background task to update bomb timers
	go gs.updateLoop()

	return gs
}

// CreateSession creates a new game session in lobby state
func (gs *GameService) CreateSession(sessionID string, hostID string, timeLimit int) *models.GameSession {
	gs.mu.Lock()
	defer gs.mu.Unlock()

	session := models.NewGameSession(sessionID, hostID, timeLimit)
	gs.sessions[sessionID] = session
	return session
}

// StartGame starts the game for a session
func (gs *GameService) StartGame(sessionID string) error {
	gs.mu.RLock()
	session, exists := gs.sessions[sessionID]
	gs.mu.RUnlock()

	if !exists {
		return fmt.Errorf("session not found")
	}

	return session.StartGame()
}

// ReturnToLobby returns the game to lobby state
func (gs *GameService) ReturnToLobby(sessionID string, hostID string) error {
	gs.mu.RLock()
	session, exists := gs.sessions[sessionID]
	gs.mu.RUnlock()

	if !exists {
		return fmt.Errorf("session not found")
	}

	if !session.IsHost(hostID) {
		return fmt.Errorf("only host can return to lobby")
	}

	return session.ReturnToLobby()
}

// GetSession retrieves a game session by ID
func (gs *GameService) GetSession(sessionID string) (*models.GameSession, bool) {
	gs.mu.RLock()
	defer gs.mu.RUnlock()

	session, exists := gs.sessions[sessionID]
	return session, exists
}

// updateLoop periodically updates all active sessions
func (gs *GameService) updateLoop() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		gs.mu.RLock()
		sessions := make([]*models.GameSession, 0, len(gs.sessions))
		for _, session := range gs.sessions {
			sessions = append(sessions, session)
		}
		gs.mu.RUnlock()

		for _, session := range sessions {
			session.Update()
			// The WebSocket handler's broadcastLoop handles broadcasting updates
		}
	}
}
