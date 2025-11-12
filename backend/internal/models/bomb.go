package models

import (
	"fmt"
	"math/rand"
	"strings"
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
	ID              string                   `json:"id"`
	State           BombState                `json:"state"`
	Strikes         int                      `json:"strikes"`
	MaxStrikes      int                      `json:"maxStrikes"`
	TimeRemaining   int                      `json:"timeRemaining"` // seconds
	TimeLimit       int                      `json:"-"`             // initial time limit (not serialized)
	StartTime       time.Time                `json:"startTime"`
	WiresModules    []*WiresModule           `json:"wiresModules"`    // Wire modules
	ButtonModules   []*ButtonModule          `json:"buttonModules"`   // Button modules
	TerminalModules []*TerminalModule        `json:"terminalModules"` // Terminal modules
	ModuleRules     map[string]*ModuleManual `json:"moduleRules"`     // Rules for each module type
	Seed            int64                    `json:"seed"`            // Random seed used for rule generation (ensures manual and modules are aligned)
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

	// Randomly split moduleCount between wire, button, and terminal modules
	// Create a seeded RNG for module type distribution
	moduleTypeRNG := rand.New(rand.NewSource(seed))

	// First decide how many terminal modules (0 to moduleCount/2, but at least 0)
	numTerminalModules := moduleTypeRNG.Intn((moduleCount / 2) + 1)
	remainingModules := moduleCount - numTerminalModules

	// Split remaining between wire and button modules
	numWireModules := moduleTypeRNG.Intn(remainingModules + 1) // 0 to remainingModules
	numButtonModules := remainingModules - numWireModules

	// Store module rules - each module will have its own manual
	moduleRules := make(map[string]*ModuleManual)

	// Create wire modules - each generates its own rules based on wire count using the random seed
	wiresModules := make([]*WiresModule, numWireModules)
	for i := 0; i < numWireModules; i++ {
		// Use seed + moduleIndex to differentiate each module's wire generation
		// But still use the base seed for rules to match the manual
		moduleSeed := seed + int64(i)*1000000 // Large multiplier to avoid overlap with rule seeds
		module, moduleManual := NewWiresModuleWithRules(moduleSeed, seed)
		wiresModules[i] = module

		// Store manual with module index key (e.g., "wireModule0", "wireModule1")
		moduleRules[fmt.Sprintf("wireModule%d", i)] = moduleManual
	}

	// Create button modules - each generates its own rules using the random seed
	buttonModules := make([]*ButtonModule, numButtonModules)
	for i := 0; i < numButtonModules; i++ {
		// Use seed + offset + moduleIndex to differentiate each module's button generation
		buttonSeed := seed + int64(10000000) + int64(i)*1000000 // Different offset from wire modules
		module, moduleManual := NewButtonModuleWithRules(buttonSeed, seed)
		buttonModules[i] = module

		// Store manual with module index key (e.g., "buttonModule0", "buttonModule1")
		moduleRules[fmt.Sprintf("buttonModule%d", i)] = moduleManual
	}

	// Create terminal modules - each randomly selects 3 of 20 rules from the comprehensive manual
	// First, generate the comprehensive manual with 20 rules
	comprehensiveManual := GenerateComprehensiveTerminalModuleManual(seed)
	moduleRules["terminalModule"] = comprehensiveManual

	// Parse the 20 rules from the manual to create a lookup map
	ruleMap := make(map[string]string) // terminal text -> command
	for _, rule := range comprehensiveManual.Rules {
		// Parse rule description: "If terminal says \"X\", type Y."
		// Extract terminal text and command
		desc := rule.Description
		if strings.Contains(desc, "If terminal says \"") {
			start := strings.Index(desc, "\"") + 1
			end := strings.Index(desc[start:], "\"")
			if end > 0 {
				terminalText := desc[start : start+end]
				// Extract command (after "type ")
				cmdStart := strings.Index(desc, "type ") + 5
				cmdEnd := strings.Index(desc[cmdStart:], ".")
				if cmdEnd > 0 {
					command := desc[cmdStart : cmdStart+cmdEnd]
					ruleMap[terminalText] = command
				}
			}
		}
	}

	// Create terminal modules - each randomly selects 3 rules
	terminalModules := make([]*TerminalModule, numTerminalModules)
	for i := 0; i < numTerminalModules; i++ {
		// Use seed + offset + moduleIndex for deterministic random selection per module
		moduleRNG := rand.New(rand.NewSource(seed + int64(20000000) + int64(i)*1000000))

		// Get all terminal texts from the rule map
		allTexts := make([]string, 0, len(ruleMap))
		for text := range ruleMap {
			allTexts = append(allTexts, text)
		}

		// Randomly select 3 unique terminal texts (and their corresponding commands)
		selectedTexts := make([]string, 0, 3)
		selectedCommands := make([]string, 0, 3)
		usedIndices := make(map[int]bool)

		for len(selectedTexts) < 3 && len(selectedTexts) < len(allTexts) {
			idx := moduleRNG.Intn(len(allTexts))
			if !usedIndices[idx] {
				usedIndices[idx] = true
				text := allTexts[idx]
				selectedTexts = append(selectedTexts, text)
				selectedCommands = append(selectedCommands, ruleMap[text])
			}
		}

		// Create rule set for this module
		rules := make([]TerminalRule, 0, 3)
		for j := 0; j < len(selectedTexts); j++ {
			text := selectedTexts[j]
			cmd := selectedCommands[j]

			evaluator := func(inputText string) string {
				if strings.Contains(strings.ToUpper(inputText), strings.ToUpper(text)) {
					return cmd
				}
				return ""
			}

			rules = append(rules, TerminalRule{
				Number:      j + 1,
				Description: fmt.Sprintf("If terminal says \"%s\", type %s.", text, cmd),
				Evaluator:   evaluator,
				Command:     cmd,
			})
		}

		ruleSet := &TerminalRuleSet{Rules: rules}

		module := &TerminalModule{
			TerminalTexts:   selectedTexts,
			CurrentStep:     0,
			EnteredCommands: []string{},
			CorrectCommands: selectedCommands,
			IsSolved:        false,
			RuleSet:         ruleSet,
			TerminalSeed:    seed + int64(20000000) + int64(i)*1000000,
		}
		terminalModules[i] = module
	}

	return &Bomb{
		ID:              id,
		State:           BombStateActive,
		Strikes:         0,
		MaxStrikes:      3,
		TimeRemaining:   timeLimit,
		TimeLimit:       timeLimit,
		StartTime:       time.Now(),
		WiresModules:    wiresModules,
		ButtonModules:   buttonModules,
		TerminalModules: terminalModules,
		ModuleRules:     moduleRules,
		Seed:            seed,
	}
}

// UpdateTimeRemaining updates the time remaining based on elapsed time
// Also updates gauge colors for button modules
func (b *Bomb) UpdateTimeRemaining() {
	if b.State != BombStateActive {
		return
	}

	elapsed := int(time.Since(b.StartTime).Seconds())
	b.TimeRemaining = b.TimeLimit - elapsed

	if b.TimeRemaining <= 0 {
		b.State = BombStateExploded
		b.TimeRemaining = 0
		return
	}

	// Gauge colors are now static and only shown when button is pressed
	// No need to update them here
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

// PressButton handles pressing a button in a specific button module
func (b *Bomb) PressButton(moduleIndex int) bool {
	if b.State != BombStateActive {
		return false
	}

	if moduleIndex < 0 || moduleIndex >= len(b.ButtonModules) {
		return false // Invalid module index
	}

	module := b.ButtonModules[moduleIndex]
	if module == nil {
		return false
	}
	if module.IsSolved {
		return false // Already solved
	}

	correct := module.PressButton()
	if !correct {
		b.AddStrike()
		return false
	}

	// Check if all modules are solved
	b.CheckWinCondition()

	return true
}

// HoldButton handles holding a button in a specific button module
func (b *Bomb) HoldButton(moduleIndex int) bool {
	if b.State != BombStateActive {
		return false
	}

	if moduleIndex < 0 || moduleIndex >= len(b.ButtonModules) {
		return false // Invalid module index
	}

	module := b.ButtonModules[moduleIndex]
	if module == nil {
		return false
	}
	if module.IsSolved {
		return false // Already solved
	}

	correct := module.HoldButton()
	if !correct {
		b.AddStrike()
		return false
	}

	return true
}

// ReleaseButton handles releasing a button in a specific button module
func (b *Bomb) ReleaseButton(moduleIndex int) bool {
	if b.State != BombStateActive {
		return false
	}

	if moduleIndex < 0 || moduleIndex >= len(b.ButtonModules) {
		return false // Invalid module index
	}

	module := b.ButtonModules[moduleIndex]
	if module == nil {
		return false
	}
	if module.IsSolved {
		return false // Already solved
	}

	correct := module.ReleaseButton(b.TimeRemaining)
	if !correct {
		b.AddStrike()
		return false
	}

	// Check if all modules are solved
	b.CheckWinCondition()

	return true
}

// EnterTerminalCommand handles entering a command in a specific terminal module
func (b *Bomb) EnterTerminalCommand(moduleIndex int, command string) bool {
	if b.State != BombStateActive {
		return false
	}

	if moduleIndex < 0 || moduleIndex >= len(b.TerminalModules) {
		return false // Invalid module index
	}

	module := b.TerminalModules[moduleIndex]
	if module == nil {
		return false
	}
	if module.IsSolved {
		return false // Already solved
	}

	correct := module.EnterCommand(command)
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

	// Check wire modules
	for _, module := range b.WiresModules {
		if module != nil && !module.IsSolved {
			allSolved = false
			break
		}
	}

	// Check button modules
	if allSolved {
		for _, module := range b.ButtonModules {
			if module != nil && !module.IsSolved {
				allSolved = false
				break
			}
		}
	}

	// Check terminal modules
	if allSolved {
		for _, module := range b.TerminalModules {
			if module != nil && !module.IsSolved {
				allSolved = false
				break
			}
		}
	}

	if allSolved {
		b.State = BombStateDefused
	}
}
