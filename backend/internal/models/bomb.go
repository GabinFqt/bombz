package models

import (
	"fmt"
	"math/rand"
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
	ID            string                    `json:"id"`
	State         BombState                 `json:"state"`
	Strikes       int                       `json:"strikes"`
	MaxStrikes    int                       `json:"maxStrikes"`
	TimeRemaining int                       `json:"timeRemaining"` // seconds
	TimeLimit     int                       `json:"-"`             // initial time limit (not serialized)
	StartTime     time.Time                 `json:"startTime"`
	WiresModules  []*WiresModule             `json:"wiresModules"` // 6 wire modules
	ModuleRules   map[string]*ModuleManual `json:"moduleRules"`   // Rules for each module type
	Seed          int64                     `json:"seed"`          // Random seed used for rule generation (ensures manual and modules are aligned)
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
	
	// Generate a random seed for this bomb
	// This seed will be used for both manual and module rules to ensure they are aligned
	seed := rand.Int63()
	
	// Store module rules - each module will have its own manual
	moduleRules := make(map[string]*ModuleManual)
	
	// Create wire modules - each generates its own rules based on wire count using the random seed
	// Each module uses seed + moduleIndex to ensure different wire configurations while keeping rules aligned
	wiresModules := make([]*WiresModule, moduleCount)
	for i := 0; i < moduleCount; i++ {
		// Use seed + moduleIndex to differentiate each module's wire generation
		// But still use the base seed for rules to match the manual
		moduleSeed := seed + int64(i)*1000000 // Large multiplier to avoid overlap with rule seeds
		module, moduleManual := NewWiresModuleWithRules(moduleSeed, seed)
		wiresModules[i] = module
		
		// Store manual with module index key (e.g., "wireModule0", "wireModule1")
		moduleRules[fmt.Sprintf("wireModule%d", i)] = moduleManual
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
		ModuleRules:   moduleRules,
		Seed:          seed,
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
