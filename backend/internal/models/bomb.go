package models

import (
	"time"
)

// BombState represents the current state of the bomb
type BombState string

const (
	BombStateActive   BombState = "active"
	BombStateDefused  BombState = "defused"
	BombStateExploded BombState = "exploded"
)

// Bomb represents the bomb with its modules and state
type Bomb struct {
	ID            string         `json:"id"`
	State         BombState      `json:"state"`
	Strikes       int            `json:"strikes"`
	MaxStrikes    int            `json:"maxStrikes"`
	TimeRemaining int            `json:"timeRemaining"` // seconds
	TimeLimit     int            `json:"-"`             // initial time limit (not serialized)
	StartTime     time.Time      `json:"startTime"`
	WiresModules  []*WiresModule `json:"wiresModules"` // 6 wire modules
}

// NewBomb creates a new bomb with initial configuration
func NewBomb(id string, timeLimit int, moduleCount int) *Bomb {
	// Validate module count
	if moduleCount < 1 {
		moduleCount = 1
	}
	if moduleCount > 6 {
		moduleCount = 6
	}
	
	// Create wire modules
	wiresModules := make([]*WiresModule, moduleCount)
	for i := 0; i < moduleCount; i++ {
		wiresModules[i] = NewWiresModule()
	}

	return &Bomb{
		ID:            id,
		State:         BombStateActive,
		Strikes:       0,
		MaxStrikes:    3,
		TimeRemaining: timeLimit,
		TimeLimit:     timeLimit,
		StartTime:     time.Now(),
		WiresModules:  wiresModules,
	}
}

// UpdateTimeRemaining updates the time remaining based on elapsed time
func (b *Bomb) UpdateTimeRemaining() {
	if b.State != BombStateActive {
		return
	}

	elapsed := int(time.Since(b.StartTime).Seconds())
	b.TimeRemaining = b.TimeLimit - elapsed

	if b.TimeRemaining <= 0 {
		b.State = BombStateExploded
		b.TimeRemaining = 0
	}
}

// AddStrike adds a strike to the bomb
func (b *Bomb) AddStrike() {
	b.Strikes++
	if b.Strikes >= b.MaxStrikes {
		b.State = BombStateExploded
	}
}

// CutWire attempts to cut a wire in a specific wires module
func (b *Bomb) CutWire(moduleIndex int, wireIndex int) bool {
	if b.State != BombStateActive {
		return false
	}

	if moduleIndex < 0 || moduleIndex >= len(b.WiresModules) {
		return false // Invalid module index
	}

	module := b.WiresModules[moduleIndex]
	if module.IsSolved {
		return false // Already solved
	}

	correct := module.CutWire(wireIndex)
	if !correct {
		b.AddStrike()
		return false
	}

	// Check if all modules are solved
	b.CheckWinCondition()

	return true
}

// CheckWinCondition checks if the bomb is defused
func (b *Bomb) CheckWinCondition() {
	allSolved := true
	for _, module := range b.WiresModules {
		if !module.IsSolved {
			allSolved = false
			break
		}
	}

	if allSolved {
		b.State = BombStateDefused
	}
}
