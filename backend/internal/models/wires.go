package models

import (
	"math/rand"
)

// WireColor represents the color of a wire
type WireColor string

const (
	Red    WireColor = "red"
	Blue   WireColor = "blue"
	Black  WireColor = "black"
	White  WireColor = "white"
	Yellow WireColor = "yellow"
)

// WiresModule represents the wires module on the bomb
type WiresModule struct {
	Wires      []WireColor  `json:"wires"`
	CutWires   []int        `json:"cutWires"` // Indices of cut wires
	IsSolved   bool         `json:"isSolved"`
	CorrectCut int          `json:"correctCut"` // Index of the correct wire to cut
	RuleSet    *WireRuleSet `json:"-"`          // Rules for this module (not serialized)
}

// NewWiresModule creates a new wires module with random wire configuration
func NewWiresModule() *WiresModule {
	// Generate 3-6 wires randomly
	numWires := rand.Intn(4) + 3 // 3-6 wires
	colors := []WireColor{Red, Blue, Black, White, Yellow}

	wires := make([]WireColor, numWires)
	for i := 0; i < numWires; i++ {
		wires[i] = colors[rand.Intn(len(colors))]
	}

	module := &WiresModule{
		Wires:    wires,
		CutWires: []int{},
		IsSolved: false,
	}

	module.CorrectCut = module.determineCorrectWire()
	return module
}

// NewWiresModuleWithRules creates a new wires module with random wire configuration and rules
func NewWiresModuleWithRules(ruleSet *WireRuleSet) *WiresModule {
	// Generate 3-6 wires randomly
	numWires := rand.Intn(4) + 3 // 3-6 wires
	colors := []WireColor{Red, Blue, Black, White, Yellow}

	wires := make([]WireColor, numWires)
	for i := 0; i < numWires; i++ {
		wires[i] = colors[rand.Intn(len(colors))]
	}

	module := &WiresModule{
		Wires:    wires,
		CutWires: []int{},
		IsSolved: false,
		RuleSet:  ruleSet,
	}

	module.CorrectCut = module.determineCorrectWire()
	return module
}

// determineCorrectWire calculates which wire should be cut based on rules
func (wm *WiresModule) determineCorrectWire() int {
	// If rules are available, use them
	if wm.RuleSet != nil && len(wm.RuleSet.Rules) > 0 {
		// Evaluate rules in order
		for _, rule := range wm.RuleSet.Rules {
			result := rule.Evaluator(wm.Wires)
			if result >= 0 {
				return result
			}
		}
		// No rule matched, use default: cut last wire
		return len(wm.Wires) - 1
	}

	// Fallback to old static rules for backward compatibility
	numWires := len(wm.Wires)

	// Rule 1: If there are no red wires, cut the second wire
	hasRed := false
	for _, wire := range wm.Wires {
		if wire == Red {
			hasRed = true
			break
		}
	}
	if !hasRed {
		return 1 // Second wire (0-indexed)
	}

	// Rule 2: If the last wire is white, cut the last wire
	if wm.Wires[numWires-1] == White {
		return numWires - 1
	}

	// Rule 3: If there is more than one blue wire, cut the last blue wire
	blueCount := 0
	lastBlueIndex := -1
	for i, wire := range wm.Wires {
		if wire == Blue {
			blueCount++
			lastBlueIndex = i
		}
	}
	if blueCount > 1 {
		return lastBlueIndex
	}

	// Rule 4: Otherwise, cut the last wire
	return numWires - 1
}

// CutWire attempts to cut a wire at the given index
// Returns true if correct, false if wrong (strike)
func (wm *WiresModule) CutWire(index int) bool {
	// Check if wire is already cut
	for _, cutIndex := range wm.CutWires {
		if cutIndex == index {
			return false // Already cut
		}
	}

	// Add to cut wires
	wm.CutWires = append(wm.CutWires, index)

	// Check if correct wire was cut
	if index == wm.CorrectCut {
		wm.IsSolved = true
		return true
	}

	return false // Wrong wire = strike
}
