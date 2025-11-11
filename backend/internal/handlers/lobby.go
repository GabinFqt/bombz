package handlers

import (
	"bombs/internal/models"
	"sort"
	"time"
)

// LobbyData represents the lobby state data structure
type LobbyData struct {
	State           models.LobbyState `json:"state"`
	HostID          string            `json:"hostId"`
	PlayerID        string            `json:"playerId,omitempty"` // Optional, only included for specific player
	Players         []PlayerData      `json:"players"`
	ModuleCount     int               `json:"moduleCount"`
	DefuserID       string            `json:"defuserId"`
	IsRandomDefuser bool              `json:"isRandomDefuser"`
	TimeLimit       int               `json:"timeLimit"`
}

// PlayerData represents player information in lobby data
type PlayerData struct {
	ID       string            `json:"id"`
	Name     string            `json:"name"`
	Type     models.PlayerType `json:"type"`
	JoinedAt string            `json:"joinedAt"`
}

// buildLobbyData builds lobby data from a session
// playerID is optional - if provided, it will be included in the response
func buildLobbyData(session *models.GameSession, playerID string) *LobbyData {
	// Get lobby info safely
	state, moduleCount, defuserID, isRandomDefuser := session.GetLobbyInfo()

	// Get host ID safely
	hostID := session.GetHostID()

	// Get players list safely
	playersMap := session.GetPlayersCopy()
	players := make([]PlayerData, 0, len(playersMap))
	for _, player := range playersMap {
		players = append(players, PlayerData{
			ID:       player.ID,
			Name:     player.Name,
			Type:     player.Type,
			JoinedAt: player.JoinedAt.Format(time.RFC3339),
		})
	}

	// Sort players: host first, then by JoinedAt (most recent first)
	sort.Slice(players, func(i, j int) bool {
		// Host always comes first
		if players[i].ID == hostID && players[j].ID != hostID {
			return true
		}
		if players[i].ID != hostID && players[j].ID == hostID {
			return false
		}
		// If both are host or both are not host, sort by JoinedAt (most recent first)
		timeI, errI := time.Parse(time.RFC3339, players[i].JoinedAt)
		timeJ, errJ := time.Parse(time.RFC3339, players[j].JoinedAt)
		if errI != nil || errJ != nil {
			// If parsing fails, maintain original order
			return false
		}
		// Most recent first (descending order)
		return timeI.After(timeJ)
	})

	// Get time limit safely
	timeLimit := session.GetTimeLimit()

	lobbyData := &LobbyData{
		State:           state,
		HostID:          hostID,
		Players:         players,
		ModuleCount:     moduleCount,
		DefuserID:       defuserID,
		IsRandomDefuser: isRandomDefuser,
		TimeLimit:       timeLimit,
	}

	// Include playerID if provided
	if playerID != "" {
		lobbyData.PlayerID = playerID
	}

	return lobbyData
}

