package models

import (
	"fmt"
	"math/rand"
	"strings"
)

// getOrdinalSuffix returns the ordinal suffix for a number (st, nd, rd, th)
func getOrdinalSuffix(n int) string {
	if n >= 11 && n <= 13 {
		return "th"
	}
	switch n % 10 {
	case 1:
		return "st"
	case 2:
		return "nd"
	case 3:
		return "rd"
	default:
		return "th"
	}
}

// isDefaultRule checks if a rule description is a default "Otherwise" rule
func isDefaultRule(description string) bool {
	return len(description) > 0 && description[:9] == "Otherwise"
}

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

// GenerateWireModuleRules generates random rules for wire modules based on the number of wires
// Uses global random source (not deterministic)
func GenerateWireModuleRules(numWires int) (*WireRuleSet, *ModuleManual) {
	seed := rand.Int63()
	return generateWireModuleRulesWithRNG(numWires, rand.New(rand.NewSource(seed)), seed)
}

// GenerateComprehensiveWireModuleManual generates a manual with rules for all wire counts (3, 4, 5, 6)
// Uses a seed to ensure deterministic generation (rules don't change)
func GenerateComprehensiveWireModuleManual(seed int64) *WireModuleManual {
	allRules := []ManualRule{}
	ruleNumber := 1

	// Generate rules for each wire count (3, 4, 5, 6)
	for wireCount := 3; wireCount <= 6; wireCount++ {
		// Add section header
		allRules = append(allRules, ManualRule{
			Number:      ruleNumber,
			Description: fmt.Sprintf("=== Rules for %d wires ===", wireCount),
		})
		ruleNumber++

		// Generate rules for this wire count with a deterministic seed
		// Use seed + wireCount to get different but deterministic rules for each count
		_, moduleManual := GenerateWireModuleRulesWithSeed(wireCount, seed+int64(wireCount))

		// Add rules from this wire count (excluding the default "Otherwise" rule for now)
		for _, rule := range moduleManual.Rules {
			// Skip the default rule as we'll add our own
			if !isDefaultRule(rule.Description) {
				allRules = append(allRules, ManualRule{
					Number:      ruleNumber,
					Description: rule.Description,
				})
				ruleNumber++
			}
		}

		// Add default rule for this wire count
		// Use the same seed calculation as in generateWireModuleRulesWithRNG
		// The seed passed to GenerateWireModuleRulesWithSeed is seed + int64(wireCount)
		// In generateWireModuleRulesWithRNG, the default wire seed is: (seed + int64(wireCount)) + 777777 + int64(wireCount)
		// Which simplifies to: seed + 2*int64(wireCount) + 777777
		ruleSeed := seed + int64(wireCount) // This is what's passed to GenerateWireModuleRulesWithSeed
		defaultRNG := rand.New(rand.NewSource(ruleSeed + 777777 + int64(wireCount)))
		defaultWireIndex := defaultRNG.Intn(wireCount)
		wirePosition := "first"
		if defaultWireIndex == wireCount-1 {
			wirePosition = "last"
		} else if defaultWireIndex == 1 {
			wirePosition = "second"
		} else if defaultWireIndex == 2 {
			wirePosition = "third"
		} else {
			wirePosition = fmt.Sprintf("%d%s", defaultWireIndex+1, getOrdinalSuffix(defaultWireIndex+1))
		}

		allRules = append(allRules, ManualRule{
			Number:      ruleNumber,
			Description: fmt.Sprintf("For %d wires, otherwise cut the %s one.", wireCount, wirePosition),
		})
		ruleNumber++

		// Add spacing between sections
		if wireCount < 6 {
			allRules = append(allRules, ManualRule{
				Number:      ruleNumber,
				Description: "",
			})
			ruleNumber++
		}
	}

	return &WireModuleManual{
		Title:        "Bombz Manual - Wires Module",
		Rules:        allRules,
		WireColors:   []string{"red", "blue", "green", "white", "yellow"},
		Instructions: "As an expert, your job is to guide the defuser through the wires module using these rules. Look at the number of wires in each module and use the corresponding rules section. Tell the defuser which wire to cut based on the rules above.",
	}
}

// GenerateWireModuleRulesWithSeed generates random rules for wire modules with a specific seed for determinism
func GenerateWireModuleRulesWithSeed(numWires int, seed int64) (*WireRuleSet, *ModuleManual) {
	// Create a new random source with the given seed
	rng := rand.New(rand.NewSource(seed))

	// Use the same logic as GenerateWireModuleRules but with the seeded RNG
	return generateWireModuleRulesWithRNG(numWires, rng, seed)
}

// generateWireModuleRulesWithRNG is the internal implementation that uses a specific RNG
// seed is the original seed used to create the RNG, needed for deterministic default wire selection
func generateWireModuleRulesWithRNG(numWires int, rng *rand.Rand, seed int64) (*WireRuleSet, *ModuleManual) {
	// Pools of all possible conditions and actions
	allConditions := []struct {
		name      string
		evaluator WireRuleEvaluator
		appliesTo func(int) bool
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
			appliesTo: func(n int) bool { return true }, // Works for all counts
		},
		{
			name: "the last wire is white",
			evaluator: func(wires []WireColor) int {
				if len(wires) > 0 && wires[len(wires)-1] == White {
					return 0 // Condition matches
				}
				return -1 // Condition doesn't match
			},
			appliesTo: func(n int) bool { return true }, // Works for all counts
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
			appliesTo: func(n int) bool { return true }, // Works for all counts
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
			appliesTo: func(n int) bool { return true }, // Works for all counts
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
			appliesTo: func(n int) bool { return true }, // Works for all counts
		},
		{
			name: "the first wire is green",
			evaluator: func(wires []WireColor) int {
				if len(wires) > 0 && wires[0] == Green {
					return 0
				}
				return -1
			},
			appliesTo: func(n int) bool { return true }, // Works for all counts
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
			appliesTo: func(n int) bool { return true }, // Works for all counts
		},
		{
			name: "the last wire is yellow",
			evaluator: func(wires []WireColor) int {
				if len(wires) > 0 && wires[len(wires)-1] == Yellow {
					return 0 // Condition matches
				}
				return -1 // Condition doesn't match
			},
			appliesTo: func(n int) bool { return true }, // Works for all counts
		},
	}

	allActions := []struct {
		name      string
		executor  func(wires []WireColor) int
		appliesTo func(int) bool // Function to check if action applies to wire count
	}{
		{
			name: "cut the second one",
			executor: func(wires []WireColor) int {
				if len(wires) >= 2 {
					return 1
				}
				return len(wires) - 1
			},
			appliesTo: func(n int) bool { return n >= 2 }, // Requires at least 2 wires
		},
		{
			name: "cut the last one",
			executor: func(wires []WireColor) int {
				return len(wires) - 1
			},
			appliesTo: func(n int) bool { return true }, // Works for all counts
		},
		{
			name: "cut the first one",
			executor: func(wires []WireColor) int {
				return 0
			},
			appliesTo: func(n int) bool { return true }, // Works for all counts
		},
		{
			name: "cut the third one",
			executor: func(wires []WireColor) int {
				if len(wires) >= 3 {
					return 2
				}
				return len(wires) - 1
			},
			appliesTo: func(n int) bool { return n >= 3 }, // Requires at least 3 wires
		},
	}

	// Filter conditions and actions based on wire count
	conditions := make([]struct {
		name      string
		evaluator WireRuleEvaluator
	}, 0)
	for _, cond := range allConditions {
		if cond.appliesTo(numWires) {
			conditions = append(conditions, struct {
				name      string
				evaluator WireRuleEvaluator
			}{
				name:      cond.name,
				evaluator: cond.evaluator,
			})
		}
	}

	actions := make([]struct {
		name     string
		executor func(wires []WireColor) int
	}, 0)
	for _, act := range allActions {
		if act.appliesTo(numWires) {
			actions = append(actions, struct {
				name     string
				executor func(wires []WireColor) int
			}{
				name:     act.name,
				executor: act.executor,
			})
		}
	}

	// Ensure we have at least some valid conditions and actions
	if len(conditions) == 0 {
		// Fallback: use all conditions if filtering removed everything (shouldn't happen)
		for _, cond := range allConditions {
			conditions = append(conditions, struct {
				name      string
				evaluator WireRuleEvaluator
			}{
				name:      cond.name,
				evaluator: cond.evaluator,
			})
		}
	}
	if len(actions) == 0 {
		// Fallback: use all actions if filtering removed everything (shouldn't happen)
		for _, act := range allActions {
			actions = append(actions, struct {
				name     string
				executor func(wires []WireColor) int
			}{
				name:     act.name,
				executor: act.executor,
			})
		}
	}

	// Generate 3-5 random rules using the seeded RNG
	numRules := rng.Intn(3) + 3 // 3-5 rules
	rules := make([]WireRule, 0, numRules)
	manualRules := make([]ManualRule, 0, numRules+1)

	// Track used condition indices to avoid duplicates
	usedConditions := make(map[int]bool)

	for i := 0; i < numRules; i++ {
		// Pick a random condition (avoid duplicates) using seeded RNG
		var condIndex int
		for {
			condIndex = rng.Intn(len(conditions))
			if !usedConditions[condIndex] {
				usedConditions[condIndex] = true
				break
			}
			if len(usedConditions) >= len(conditions) {
				break
			}
		}

		// Pick a random action using seeded RNG
		actionIndex := rng.Intn(len(actions))
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

	// Add default rule with random wire selection (deterministic based on seed)
	// Use a deterministic seed for the default wire to ensure consistency between
	// GenerateComprehensiveWireModuleManual and generateWireModuleRulesWithRNG
	// We use seed + 777777 + numWires to create a unique but deterministic seed
	defaultRNG := rand.New(rand.NewSource(seed + 777777 + int64(numWires)))
	defaultWireIndex := defaultRNG.Intn(numWires)
	wirePosition := "first"
	if defaultWireIndex == numWires-1 {
		wirePosition = "last"
	} else if defaultWireIndex == 1 {
		wirePosition = "second"
	} else if defaultWireIndex == 2 {
		wirePosition = "third"
	} else {
		wirePosition = fmt.Sprintf("%d%s", defaultWireIndex+1, getOrdinalSuffix(defaultWireIndex+1))
	}

	manualRules = append(manualRules, ManualRule{
		Number:      len(manualRules) + 1,
		Description: fmt.Sprintf("Otherwise, cut the %s one.", wirePosition),
	})

	// Create default rule evaluator that always returns the chosen wire index
	defaultEvaluator := func(wires []WireColor) int {
		return defaultWireIndex
	}

	rules = append(rules, WireRule{
		Number:      len(rules) + 1,
		Description: fmt.Sprintf("Otherwise, cut the %s one.", wirePosition),
		Evaluator:   defaultEvaluator,
	})

	// Create ModuleManual
	moduleManual := &ModuleManual{
		Title:        "Bombz Manual - Wires Module",
		Rules:        manualRules,
		Instructions: "As an expert, your job is to guide the defuser through the wires module using these rules. Look at the wires configuration and tell the defuser which wire to cut based on the rules above.",
		ModuleData: map[string]interface{}{
			"wireColors": []string{"red", "blue", "green", "white", "yellow"},
		},
	}

	return &WireRuleSet{Rules: rules}, moduleManual
}

// ButtonRuleResult represents the result of evaluating a button rule
type ButtonRuleResult struct {
	Action           ButtonAction
	WaitForGauge     GaugeColor
	TargetTimerDigit int // Which timer digit to wait for (0-9)
}

// ButtonRuleEvaluator is a function that evaluates a condition on button text and color
// Returns nil if condition doesn't match, or ButtonRuleResult if it matches
type ButtonRuleEvaluator func(text ButtonText, color ButtonColor) *ButtonRuleResult

// ButtonRule represents a rule with both description and evaluator function
type ButtonRule struct {
	Number      int                 `json:"number"`
	Description string              `json:"description"`
	Evaluator   ButtonRuleEvaluator `json:"-"` // Not serialized, used for evaluation
}

// ButtonRuleSet contains the rules with evaluators for a button module
type ButtonRuleSet struct {
	Rules                []ButtonRule       `json:"-"`
	GaugeColorToDigitMap map[GaugeColor]int `json:"-"` // Maps gauge color to timer digit (same for all buttons in game)
}

// GenerateButtonModuleRulesWithSeed generates random rules for button modules with a specific seed for determinism
func GenerateButtonModuleRulesWithSeed(seed int64) (*ButtonRuleSet, *ModuleManual) {
	// Create a new random source with the given seed
	rng := rand.New(rand.NewSource(seed))

	// Pools of all possible conditions (button text + color combinations)
	// These only check if the condition matches - action (press/hold) is randomly assigned
	allConditions := []struct {
		name  string
		text  ButtonText
		color ButtonColor
	}{
		{
			name:  "button says \"ABORT\" and is red",
			text:  ButtonTextAbort,
			color: ButtonColorRed,
		},
		{
			name:  "button says \"DETONATE\" and is white",
			text:  ButtonTextDetonate,
			color: ButtonColorWhite,
		},
		{
			name:  "button says \"HOLD\" and is blue",
			text:  ButtonTextHold,
			color: ButtonColorBlue,
		},
		{
			name:  "button says \"PRESS\" and is red",
			text:  ButtonTextPress,
			color: ButtonColorRed,
		},
		{
			name:  "button says \"OTHER\" and is any color",
			text:  ButtonTextOther,
			color: "", // Any color
		},
		// Additional random combinations
		{
			name:  "button says \"ABORT\" and is blue",
			text:  ButtonTextAbort,
			color: ButtonColorBlue,
		},
		{
			name:  "button says \"DETONATE\" and is red",
			text:  ButtonTextDetonate,
			color: ButtonColorRed,
		},
		{
			name:  "button says \"HOLD\" and is red",
			text:  ButtonTextHold,
			color: ButtonColorRed,
		},
		{
			name:  "button says \"PRESS\" and is blue",
			text:  ButtonTextPress,
			color: ButtonColorBlue,
		},
		{
			name:  "button says \"ABORT\" and is white",
			text:  ButtonTextAbort,
			color: ButtonColorWhite,
		},
	}

	// Generate gauge color -> timer digit mapping rules (separate rule set)
	// This determines which timer digit to wait for based on gauge color
	gaugeColorToDigitRules := make(map[GaugeColor]int)
	gaugeColors := []GaugeColor{GaugeColorRed, GaugeColorBlue, GaugeColorWhite}

	// Create deterministic mapping: each gauge color maps to a specific timer digit
	for _, gaugeColor := range gaugeColors {
		// Use different seed offsets for each gauge color to ensure deterministic but different mappings
		var colorSeedOffset int64
		switch gaugeColor {
		case GaugeColorRed:
			colorSeedOffset = 100
		case GaugeColorBlue:
			colorSeedOffset = 200
		case GaugeColorWhite:
			colorSeedOffset = 300
		}
		colorDigitRNG := rand.New(rand.NewSource(seed + 777777 + colorSeedOffset))
		gaugeColorToDigitRules[gaugeColor] = colorDigitRNG.Intn(10)
	}

	// Generate 3-5 random rules using the seeded RNG
	numRules := rng.Intn(3) + 3 // 3-5 rules
	rules := make([]ButtonRule, 0, numRules)
	preHoldRules := make([]ManualRule, 0, numRules+2) // Pre-hold rules section

	// Track used condition indices to avoid duplicates
	usedConditions := make(map[int]bool)

	// Add section title for pre-hold logic (Number 0 indicates it's a title, not a rule)
	preHoldRules = append(preHoldRules, ManualRule{
		Number:      0,
		Description: "Pre-Hold Logic: Press vs Hold",
	})

	ruleNum := 1
	for i := 0; i < numRules; i++ {
		// Pick a random condition (avoid duplicates) using seeded RNG
		var condIndex int
		for {
			condIndex = rng.Intn(len(allConditions))
			if !usedConditions[condIndex] {
				usedConditions[condIndex] = true
				break
			}
			if len(usedConditions) >= len(allConditions) {
				break
			}
		}

		condition := allConditions[condIndex]

		// Randomly assign action type (press or hold) for this condition
		// Use a deterministic seed based on condition index to ensure same assignment per game
		actionRNG := rand.New(rand.NewSource(seed + int64(condIndex*1000)))
		actionType := ButtonActionHold
		if actionRNG.Intn(2) == 0 { // 50% chance for press, 50% for hold
			actionType = ButtonActionPress
		}

		// Create evaluator that only checks the condition and returns the action
		// Gauge color will be randomly selected when button is pressed (for hold actions)
		finalEvaluator := func(text ButtonText, color ButtonColor) *ButtonRuleResult {
			// Check if condition matches
			matches := false
			if condition.color == "" {
				// "Any color" condition - only check text
				matches = (text == condition.text)
			} else {
				// Specific color condition - check both text and color
				matches = (text == condition.text && color == condition.color)
			}

			if matches {
				return &ButtonRuleResult{
					Action:           actionType,
					WaitForGauge:     "", // Will be randomly selected when button is pressed
					TargetTimerDigit: 0,  // Will be set based on randomly selected gauge color
				}
			}
			return nil
		}

		// Create description
		var description string
		if actionType == ButtonActionPress {
			description = fmt.Sprintf("If %s, press and release immediately.", condition.name)
		} else {
			description = fmt.Sprintf("If %s, hold the button. When pressed, a random gauge color will appear.", condition.name)
		}

		rules = append(rules, ButtonRule{
			Number:      i + 1,
			Description: description,
			Evaluator:   finalEvaluator,
		})

		preHoldRules = append(preHoldRules, ManualRule{
			Number:      ruleNum,
			Description: description,
		})
		ruleNum++
	}

	// Add default rule: hold (gauge color will be randomly selected when pressed)
	defaultDescription := "Otherwise, hold the button. When pressed, a random gauge color will appear."

	preHoldRules = append(preHoldRules, ManualRule{
		Number:      ruleNum,
		Description: defaultDescription,
	})
	ruleNum++

	// Create default rule evaluator (matches any condition not covered by specific rules)
	defaultEvaluator := func(text ButtonText, color ButtonColor) *ButtonRuleResult {
		return &ButtonRuleResult{
			Action:           ButtonActionHold,
			WaitForGauge:     "", // Will be randomly selected when button is pressed
			TargetTimerDigit: 0,  // Will be set based on randomly selected gauge color
		}
	}

	rules = append(rules, ButtonRule{
		Number:      len(rules) + 1,
		Description: defaultDescription,
		Evaluator:   defaultEvaluator,
	})

	// Add section title for post-hold logic (Number 0 indicates it's a title, not a rule)
	postHoldRules := []ManualRule{}
	postHoldRules = append(postHoldRules, ManualRule{
		Number:      0,
		Description: "Post-Hold Logic: Gauge Color to Timer Digit",
	})

	for _, gaugeColor := range gaugeColors {
		digit := gaugeColorToDigitRules[gaugeColor]
		postHoldRules = append(postHoldRules, ManualRule{
			Number:      ruleNum,
			Description: fmt.Sprintf("If gauge shows %s, release when timer's last digit is %d.", gaugeColor, digit),
		})
		ruleNum++
	}

	// Combine pre-hold and post-hold rules
	allManualRules := append(preHoldRules, postHoldRules...)

	// Create ModuleManual
	moduleManual := &ModuleManual{
		Title:        "Bombz Manual - Button Module",
		Rules:        allManualRules,
		Instructions: "As an expert, your job is to guide the defuser through the button module using these rules. First, look at the button text and color to determine if you should press immediately or hold. If holding, when the button is pressed, a random gauge color (red, white, or blue) will appear. Use the gauge color mapping rules to determine which timer digit to wait for. Release the button when the timer's last digit matches the specified value.",
		ModuleData: map[string]interface{}{
			"buttonTexts":  []string{"ABORT", "DETONATE", "HOLD", "PRESS", "OTHER"},
			"buttonColors": []string{"red", "blue", "white"},
			"gaugeColors":  []string{"red", "blue", "white"},
		},
	}

	return &ButtonRuleSet{
		Rules:                rules,
		GaugeColorToDigitMap: gaugeColorToDigitRules,
	}, moduleManual
}

// GenerateComprehensiveButtonModuleManual generates a single comprehensive manual for all button modules
// Uses a seed to ensure deterministic generation (rules don't change)
func GenerateComprehensiveButtonModuleManual(seed int64) *ModuleManual {
	// Generate rules using the seed - all button modules will use the same rules
	_, moduleManual := GenerateButtonModuleRulesWithSeed(seed)
	return moduleManual
}

// GetWireModuleManual returns the manual content for the wires module
func GetWireModuleManual() *WireModuleManual {
	// Use a default seed for static manual
	return GenerateComprehensiveWireModuleManual(12345)
}

// GenerateTerminalModuleRulesWithSeed generates random rules for terminal modules with a specific seed for determinism
// Rules are based on terminal text displayed at each step
func GenerateTerminalModuleRulesWithSeed(seed int64, terminalTexts []string) (*TerminalRuleSet, *ModuleManual) {
	// Create a new random source with the given seed
	rng := rand.New(rand.NewSource(seed))

	// Command words pool - these are the words players need to type
	commandWords := []string{
		"RED", "BLUE", "GREEN", "WHITE", "YELLOW",
		"ABORT", "DETONATE", "HOLD", "PRESS", "OTHER",
		"FIRST", "SECOND", "THIRD", "LAST",
		"ENTER", "EXECUTE", "RUN", "START", "STOP",
		"YES", "NO", "ACCEPT", "DENY", "CONFIRM",
	}

	// Generate 3 rules (one for each command step)
	rules := make([]TerminalRule, 0, 3)
	manualRules := make([]ManualRule, 0, 3)

	// Track used command words to avoid duplicates
	usedCommands := make(map[string]bool)

	// Generate rules based on terminal texts
	for i := 0; i < 3 && i < len(terminalTexts); i++ {
		terminalText := terminalTexts[i]

		// Pick a random command word (avoid duplicates)
		var commandWord string
		var attempts int
		for {
			commandWord = commandWords[rng.Intn(len(commandWords))]
			if !usedCommands[commandWord] {
				usedCommands[commandWord] = true
				break
			}
			attempts++
			if attempts > 100 {
				// Fallback: use a numbered command if we run out
				commandWord = fmt.Sprintf("CMD%d", i+1)
				break
			}
		}

		// Create rule based on terminal text
		// The rule checks what text is displayed and tells what command to type
		description := fmt.Sprintf("If terminal says \"%s\", type %s.", terminalText, commandWord)

		evaluator := func(text string) string {
			// Check if the terminal text matches
			if strings.Contains(strings.ToUpper(text), strings.ToUpper(terminalText)) {
				return commandWord
			}
			// If text doesn't match, return empty (shouldn't happen if rule is correct)
			return ""
		}

		rules = append(rules, TerminalRule{
			Number:      i + 1,
			Description: description,
			Evaluator:   evaluator,
			Command:     commandWord,
		})

		manualRules = append(manualRules, ManualRule{
			Number:      i + 1,
			Description: description,
		})
	}

	// Create ModuleManual
	moduleManual := &ModuleManual{
		Title:        "Bombz Manual - Terminal Module",
		Rules:        manualRules,
		Instructions: "As an expert, your job is to guide the defuser through the terminal module. Look at what text is displayed in the terminal and tell the defuser which command to type based on these rules. The defuser must type 3 commands in order. After each correct command, the terminal will display new text.",
		ModuleData: map[string]interface{}{
			"commandWords": commandWords,
		},
	}

	return &TerminalRuleSet{Rules: rules}, moduleManual
}

// GenerateComprehensiveTerminalModuleManual generates a comprehensive manual for terminal modules
// Creates 20 different terminal text → command mappings
func GenerateComprehensiveTerminalModuleManual(seed int64) *ModuleManual {
	// Create a seeded RNG for deterministic generation
	rng := rand.New(rand.NewSource(seed))

	// Command words pool
	commandWords := []string{
		"RED", "BLUE", "GREEN", "WHITE", "YELLOW",
		"ABORT", "DETONATE", "HOLD", "PRESS", "OTHER",
		"FIRST", "SECOND", "THIRD", "LAST",
		"ENTER", "EXECUTE", "RUN", "START", "STOP",
		"YES", "NO", "ACCEPT", "DENY", "CONFIRM",
		"UP", "DOWN", "LEFT", "RIGHT",
		"ALPHA", "BRAVO", "CHARLIE", "DELTA",
	}

	// Combine all terminal text templates
	allTerminalTexts := append(append(
		initialTerminalTexts,
		afterFirstCommandTexts...),
		afterSecondCommandTexts...)

	// Generate 20 unique combinations
	manualRules := make([]ManualRule, 0, 20)
	usedTexts := make(map[string]bool)
	usedCommands := make(map[string]bool)

	for i := 0; i < 20; i++ {
		// Pick a random terminal text (avoid duplicates)
		var terminalText string
		var attempts int
		for {
			textIdx := rng.Intn(len(allTerminalTexts))
			terminalText = allTerminalTexts[textIdx]
			if !usedTexts[terminalText] {
				usedTexts[terminalText] = true
				break
			}
			attempts++
			if attempts > 1000 {
				// If we run out of unique texts, allow reuse
				textIdx = rng.Intn(len(allTerminalTexts))
				terminalText = allTerminalTexts[textIdx]
				break
			}
		}

		// Pick a random command word (avoid duplicates if possible)
		var commandWord string
		attempts = 0
		for {
			cmdIdx := rng.Intn(len(commandWords))
			commandWord = commandWords[cmdIdx]
			if !usedCommands[commandWord] || attempts > 50 {
				usedCommands[commandWord] = true
				break
			}
			attempts++
		}

		// Create rule
		description := fmt.Sprintf("If terminal says \"%s\", type %s.", terminalText, commandWord)
		manualRules = append(manualRules, ManualRule{
			Number:      i + 1,
			Description: description,
		})
	}

	moduleManual := &ModuleManual{
		Title:        "Bombz Manual - Terminal Module",
		Rules:        manualRules,
		Instructions: "As an expert, your job is to guide the defuser through the terminal module. Look at what text is displayed in the terminal and tell the defuser which command to type based on these rules. The defuser must type 3 commands in order. Each terminal will randomly use 3 of these 20 rules. After each correct command, the terminal will display new text.",
		ModuleData: map[string]interface{}{
			"commandWords": commandWords,
		},
	}

	return moduleManual
}

// ManualContent represents the complete manual content for a game session
type ManualContent struct {
	WireModule *WireModuleManual        `json:"wireModule,omitempty"` // For backward compatibility
	Modules    map[string]*ModuleManual `json:"modules,omitempty"`    // New extensible format
	BombState  *Bomb                    `json:"bombState,omitempty"`  // Include bomb state so experts can see wire configurations
}

// GetManualContent returns the complete manual content
// Always returns comprehensive manual with rules for all wire counts (3, 4, 5, 6)
// Uses the bomb's stored seed to ensure rules match the modules
func GetManualContent(bomb *Bomb) *ManualContent {
	content := &ManualContent{}

	if bomb != nil {
		content.BombState = bomb
	}

	// Use the bomb's stored seed (or use a default seed if no bomb)
	seed := int64(12345) // Default seed
	if bomb != nil {
		seed = bomb.Seed
	}

	// Always use comprehensive manual with rules for all wire counts
	// Uses the same seed as the bomb's modules to ensure alignment
	content.WireModule = GenerateComprehensiveWireModuleManual(seed)

	// Also populate Modules map for consistency
	content.Modules = make(map[string]*ModuleManual)
	content.Modules["wireModule"] = &ModuleManual{
		Title:        content.WireModule.Title,
		Rules:        content.WireModule.Rules,
		Instructions: content.WireModule.Instructions,
		ModuleData: map[string]interface{}{
			"wireColors": content.WireModule.WireColors,
		},
	}

	// Add single comprehensive button module manual if bomb has button modules
	if bomb != nil && len(bomb.ButtonModules) > 0 {
		// Generate one comprehensive manual for all button modules (they all use the same rules)
		buttonManual := GenerateComprehensiveButtonModuleManual(seed)
		content.Modules["buttonModule"] = buttonManual
	}

	// Add terminal module manual if bomb has terminal modules
	// All terminal modules share the same rules
	if bomb != nil && len(bomb.TerminalModules) > 0 {
		// All terminals use the same manual from ModuleRules
		if manual, exists := bomb.ModuleRules["terminalModule"]; exists {
			content.Modules["terminalModule"] = manual
		}
	}

	return content
}
