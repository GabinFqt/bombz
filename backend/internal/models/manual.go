package models

import (
	"math/rand"
)

// ManualRule represents a single rule in the manual
type ManualRule struct {
	Number      int    `json:"number"`
	Description string `json:"description"`
}

// WireRuleEvaluator is a function that evaluates a condition on wires and returns the wire index to cut if condition matches, or -1 if it doesn't match
type WireRuleEvaluator func(wires []WireColor) int

// WireRule represents a rule with both description and evaluator function
type WireRule struct {
	Number      int               `json:"number"`
	Description string            `json:"description"`
	Evaluator   WireRuleEvaluator `json:"-"` // Not serialized, used for evaluation
}

// ModuleManual represents the manual content for any module type
type ModuleManual struct {
	Title        string       `json:"title"`
	Rules        []ManualRule `json:"rules"`
	Instructions string       `json:"instructions"`
	// Module-specific data (e.g., WireColors for wire module)
	ModuleData map[string]interface{} `json:"moduleData,omitempty"`
}

// WireModuleManual contains the manual content for the wires module
// Kept for backward compatibility with frontend
type WireModuleManual struct {
	Title        string       `json:"title"`
	Rules        []ManualRule `json:"rules"`
	WireColors   []string     `json:"wireColors"`
	Instructions string       `json:"instructions"`
}

// WireRuleSet contains the rules with evaluators for a wire module
type WireRuleSet struct {
	Rules []WireRule `json:"-"`
}

// GenerateWireModuleRules generates random rules for wire modules
func GenerateWireModuleRules() (*WireRuleSet, *ModuleManual) {
	// Pools of conditions and actions
	conditions := []struct {
		name      string
		evaluator WireRuleEvaluator
	}{
		{
			name: "there are no red wires",
			evaluator: func(wires []WireColor) int {
				for _, w := range wires {
					if w == Red {
						return -1 // Condition doesn't match
					}
				}
				return 0 // Condition matches (0 means true, -1 means false)
			},
		},
		{
			name: "the last wire is white",
			evaluator: func(wires []WireColor) int {
				if len(wires) > 0 && wires[len(wires)-1] == White {
					return 0 // Condition matches
				}
				return -1 // Condition doesn't match
			},
		},
		{
			name: "there is more than one blue wire",
			evaluator: func(wires []WireColor) int {
				count := 0
				for _, w := range wires {
					if w == Blue {
						count++
					}
				}
				if count > 1 {
					return 0 // Condition matches
				}
				return -1 // Condition doesn't match
			},
		},
		{
			name: "there are exactly three wires",
			evaluator: func(wires []WireColor) int {
				if len(wires) == 3 {
					return 0 // Condition matches
				}
				return -1 // Condition doesn't match
			},
		},
		{
			name: "there are no blue wires",
			evaluator: func(wires []WireColor) int {
				for _, w := range wires {
					if w == Blue {
						return -1 // Condition doesn't match
					}
				}
				return 0 // Condition matches
			},
		},
		{
			name: "there is more than one yellow wire",
			evaluator: func(wires []WireColor) int {
				count := 0
				for _, w := range wires {
					if w == Yellow {
						count++
					}
				}
				if count > 1 {
					return 0 // Condition matches
				}
				return -1 // Condition doesn't match
			},
		},
		{
			name: "the first wire is black",
			evaluator: func(wires []WireColor) int {
				if len(wires) > 0 && wires[0] == Black {
					return 0
				}
				return -1
			},
		},
		{
			name: "there are exactly four wires",
			evaluator: func(wires []WireColor) int {
				if len(wires) == 4 {
					return 0 // Condition matches
				}
				return -1 // Condition doesn't match
			},
		},
		{
			name: "there is more than one red wire",
			evaluator: func(wires []WireColor) int {
				count := 0
				for _, w := range wires {
					if w == Red {
						count++
					}
				}
				if count > 1 {
					return 0 // Condition matches
				}
				return -1 // Condition doesn't match
			},
		},
		{
			name: "the last wire is yellow",
			evaluator: func(wires []WireColor) int {
				if len(wires) > 0 && wires[len(wires)-1] == Yellow {
					return 0 // Condition matches
				}
				return -1 // Condition doesn't match
			},
		},
	}

	actions := []struct {
		name     string
		executor func(wires []WireColor) int
	}{
		{
			name: "cut the second one",
			executor: func(wires []WireColor) int {
				if len(wires) >= 2 {
					return 1
				}
				return len(wires) - 1
			},
		},
		{
			name: "cut the last one",
			executor: func(wires []WireColor) int {
				return len(wires) - 1
			},
		},
		{
			name: "cut the first one",
			executor: func(wires []WireColor) int {
				return 0
			},
		},
		{
			name: "cut the last red one",
			executor: func(wires []WireColor) int {
				lastIndex := -1
				for i, w := range wires {
					if w == Red {
						lastIndex = i
					}
				}
				if lastIndex >= 0 {
					return lastIndex
				}
				return len(wires) - 1
			},
		},
		{
			name: "cut the last blue one",
			executor: func(wires []WireColor) int {
				lastIndex := -1
				for i, w := range wires {
					if w == Blue {
						lastIndex = i
					}
				}
				if lastIndex >= 0 {
					return lastIndex
				}
				return len(wires) - 1
			},
		},
		{
			name: "cut the first blue one",
			executor: func(wires []WireColor) int {
				for i, w := range wires {
					if w == Blue {
						return i
					}
				}
				return len(wires) - 1
			},
		},
		{
			name: "cut the last yellow one",
			executor: func(wires []WireColor) int {
				lastIndex := -1
				for i, w := range wires {
					if w == Yellow {
						lastIndex = i
					}
				}
				if lastIndex >= 0 {
					return lastIndex
				}
				return len(wires) - 1
			},
		},
		{
			name: "cut the third one",
			executor: func(wires []WireColor) int {
				if len(wires) >= 3 {
					return 2
				}
				return len(wires) - 1
			},
		},
	}

	// Generate 3-5 random rules
	numRules := rand.Intn(3) + 3 // 3-5 rules
	rules := make([]WireRule, 0, numRules)
	manualRules := make([]ManualRule, 0, numRules+1) // +1 for default rule

	// Track used condition indices to avoid duplicates
	usedConditions := make(map[int]bool)

	for i := 0; i < numRules; i++ {
		// Pick a random condition (avoid duplicates)
		var condIndex int
		for {
			condIndex = rand.Intn(len(conditions))
			if !usedConditions[condIndex] {
				usedConditions[condIndex] = true
				break
			}
			// If all conditions used, allow reuse
			if len(usedConditions) >= len(conditions) {
				break
			}
		}

		// Pick a random action
		actionIndex := rand.Intn(len(actions))
		condition := conditions[condIndex]
		action := actions[actionIndex]

		// Create combined evaluator
		// The condition evaluator checks if condition matches (returns >= 0 if match)
		// If it matches, we execute the action
		evaluator := func(wires []WireColor) int {
			// Check if condition matches
			conditionResult := condition.evaluator(wires)
			if conditionResult >= 0 {
				// Condition matched, execute the action
				return action.executor(wires)
			}
			// Condition didn't match
			return -1
		}

		// Create description - combine condition and action naturally
		description := "If " + condition.name + ", " + action.name + "."

		rules = append(rules, WireRule{
			Number:      i + 1,
			Description: description,
			Evaluator:   evaluator,
		})

		manualRules = append(manualRules, ManualRule{
			Number:      i + 1,
			Description: description,
		})
	}

	// Add default rule
	manualRules = append(manualRules, ManualRule{
		Number:      len(manualRules) + 1,
		Description: "Otherwise, cut the last one.",
	})

	// Create ModuleManual
	moduleManual := &ModuleManual{
		Title:        "Bombz Manual - Wires Module",
		Rules:        manualRules,
		Instructions: "As an expert, your job is to guide the defuser through the wires module using these rules. Look at the wires configuration and tell the defuser which wire to cut based on the rules above.",
		ModuleData: map[string]interface{}{
			"wireColors": []string{"red", "blue", "black", "white", "yellow"},
		},
	}

	return &WireRuleSet{Rules: rules}, moduleManual
}

// GetWireModuleManual returns the manual content for the wires module
func GetWireModuleManual() *WireModuleManual {
	return &WireModuleManual{
		Title: "Bombz Manual - Wires Module",
		Rules: []ManualRule{
			{
				Number:      1,
				Description: "If there are no red wires, cut the second wire.",
			},
			{
				Number:      2,
				Description: "If the last wire is white, cut the last wire.",
			},
			{
				Number:      3,
				Description: "If there is more than one blue wire, cut the last blue wire.",
			},
			{
				Number:      4,
				Description: "Otherwise, cut the last wire.",
			},
		},
		WireColors:   []string{"red", "blue", "black", "white", "yellow"},
		Instructions: "As an expert, your job is to guide the defuser through the wires module using these rules. Look at the wires configuration and tell the defuser which wire to cut based on the rules above.",
	}
}

// ManualContent represents the complete manual content for a game session
type ManualContent struct {
	WireModule *WireModuleManual        `json:"wireModule,omitempty"` // For backward compatibility
	Modules    map[string]*ModuleManual `json:"modules,omitempty"`    // New extensible format
	BombState  *Bomb                    `json:"bombState,omitempty"`  // Include bomb state so experts can see wire configurations
}

// GetManualContent returns the complete manual content
// If bomb is provided (non-nil), it will use the bomb's stored rules
func GetManualContent(bomb *Bomb) *ManualContent {
	content := &ManualContent{}

	if bomb != nil {
		content.BombState = bomb

		// Use bomb's stored module rules if available
		if len(bomb.ModuleRules) > 0 {
			content.Modules = make(map[string]*ModuleManual)
			for moduleType, moduleManual := range bomb.ModuleRules {
				content.Modules[moduleType] = moduleManual

				// Also populate WireModule for backward compatibility if it's a wire module
				if moduleType == "wireModule" {
					wireColors := []string{"red", "blue", "black", "white", "yellow"}
					if colors, ok := moduleManual.ModuleData["wireColors"].([]string); ok {
						wireColors = colors
					}
					content.WireModule = &WireModuleManual{
						Title:        moduleManual.Title,
						Rules:        moduleManual.Rules,
						WireColors:   wireColors,
						Instructions: moduleManual.Instructions,
					}
				}
			}
		} else {
			// Fallback to static manual if bomb has no rules (shouldn't happen in normal flow)
			content.WireModule = GetWireModuleManual()
		}
	} else {
		// No bomb provided, return static manual
		content.WireModule = GetWireModuleManual()
	}

	return content
}
