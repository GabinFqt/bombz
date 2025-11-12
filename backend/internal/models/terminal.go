package models

import (
	"math/rand"
	"strings"
)

// TerminalModule represents the terminal module on the bomb
type TerminalModule struct {
	TerminalTexts   []string         `json:"terminalTexts"`   // Text displayed at each step (initial + after each command)
	CurrentStep     int              `json:"currentStep"`     // Current command step (0-2)
	EnteredCommands []string         `json:"enteredCommands"` // Commands player has typed
	CorrectCommands []string         `json:"correctCommands"` // Correct commands determined by rules
	IsSolved        bool             `json:"isSolved"`
	RuleSet         *TerminalRuleSet `json:"-"` // Rules for this module (not serialized)
	TerminalSeed    int64            `json:"-"` // Seed used for this module
}

// GetCurrentTerminalText returns the text that should be displayed in the terminal at the current step
func (tm *TerminalModule) GetCurrentTerminalText() string {
	if tm.IsSolved {
		return "All commands executed successfully. Module disarmed."
	}
	if tm.CurrentStep < len(tm.TerminalTexts) {
		return tm.TerminalTexts[tm.CurrentStep]
	}
	return tm.TerminalTexts[len(tm.TerminalTexts)-1] // Fallback to last text
}

// TerminalRuleSet contains the rules with evaluators for a terminal module
type TerminalRuleSet struct {
	Rules []TerminalRule `json:"-"`
}

// TerminalRule represents a rule with both description and evaluator function
type TerminalRule struct {
	Number      int                   `json:"number"`
	Description string                `json:"description"`
	Evaluator   TerminalRuleEvaluator `json:"-"`       // Not serialized, used for evaluation
	Command     string                `json:"command"` // The command word for this rule
}

// TerminalRuleEvaluator is a function that evaluates conditions based on terminal text and returns the command to type
type TerminalRuleEvaluator func(terminalText string) string

// Terminal text templates for initial display
var initialTerminalTexts = []string{
	"System initialized. Enter commands:",
	"Terminal ready. Awaiting input:",
	"Command prompt active. Type commands:",
	"System online. Enter commands:",
	"Terminal interface loaded. Commands:",
	"Access granted. Enter command:",
	"System boot complete. Commands:",
	"Interface active. Type command:",
	"Ready for input. Commands:",
	"System standby. Enter command:",
	"Terminal active. Type commands:",
	"Awaiting commands. Input:",
	"System ready. Commands:",
	"Command line active. Type:",
	"Terminal initialized. Commands:",
	"System operational. Enter:",
	"Interface ready. Commands:",
	"Access confirmed. Enter command:",
	"Terminal online. Type commands:",
	"System active. Commands:",
	"Ready. Enter commands:",
	"Standby mode. Commands:",
	"Terminal loaded. Enter:",
	"System ready. Type commands:",
	"Interface initialized. Commands:",
	"Access granted. Commands:",
	"Terminal operational. Enter:",
	"System standby. Commands:",
	"Ready state. Commands:",
	"Terminal active. Enter:",
	"System online. Type:",
	"Interface ready. Enter:",
	"Access confirmed. Commands:",
	"Terminal ready. Commands:",
	"System initialized. Type:",
}

// Terminal text templates for after first command
var afterFirstCommandTexts = []string{
	"Command accepted. Next:",
	"Processing... Next command:",
	"Executed. Enter next:",
	"Success. Continue:",
	"Accepted. Next input:",
	"Done. Type next command:",
	"Complete. Next:",
	"Processed. Next command:",
	"Success. Next:",
	"Accepted. Continue:",
	"Executed. Next:",
	"Done. Next command:",
	"Complete. Continue:",
	"Processed. Enter next:",
	"Success. Next input:",
	"Accepted. Type next:",
	"Executed. Continue:",
	"Done. Next:",
	"Complete. Next command:",
	"Processed. Next:",
	"Success. Enter next:",
	"Accepted. Next:",
	"Executed. Next command:",
	"Done. Continue:",
	"Complete. Next input:",
	"Processed. Continue:",
	"Success. Type next:",
	"Accepted. Enter next:",
	"Executed. Next input:",
	"Done. Next command:",
	"Complete. Continue:",
	"Processed. Next command:",
	"Success. Continue:",
	"Accepted. Next:",
	"Executed. Continue:",
}

// Terminal text templates for after second command
var afterSecondCommandTexts = []string{
	"Command accepted. Final:",
	"Processing... Final command:",
	"Executed. Last input:",
	"Success. Final command:",
	"Accepted. Last:",
	"Done. Type final command:",
	"Complete. Final:",
	"Processed. Final command:",
	"Success. Final:",
	"Accepted. Last command:",
	"Executed. Final:",
	"Done. Final command:",
	"Complete. Last:",
	"Processed. Final:",
	"Success. Last command:",
	"Accepted. Final command:",
	"Executed. Last:",
	"Done. Final:",
	"Complete. Final command:",
	"Processed. Last command:",
	"Success. Final command:",
	"Accepted. Final:",
	"Executed. Final command:",
	"Done. Last:",
	"Complete. Final:",
	"Processed. Final command:",
	"Success. Last:",
	"Accepted. Final command:",
	"Executed. Final:",
	"Done. Final command:",
	"Complete. Last command:",
	"Processed. Final:",
	"Success. Final:",
	"Accepted. Last:",
	"Executed. Last command:",
}

// NewTerminalModuleWithRules creates a new terminal module with random configuration and generates rules
// terminalSeed: seed for generating random terminal configuration (different for each module)
// ruleSeed: seed for generating rules (same for all modules to match the manual)
// Returns the module and its corresponding manual
func NewTerminalModuleWithRules(terminalSeed int64, ruleSeed int64) (*TerminalModule, *ModuleManual) {
	// Create a seeded RNG for terminal generation using the terminalSeed (unique per module)
	rng := rand.New(rand.NewSource(terminalSeed))

	// Generate random terminal texts for each step
	terminalTexts := make([]string, 3)
	terminalTexts[0] = initialTerminalTexts[rng.Intn(len(initialTerminalTexts))]
	terminalTexts[1] = afterFirstCommandTexts[rng.Intn(len(afterFirstCommandTexts))]
	terminalTexts[2] = afterSecondCommandTexts[rng.Intn(len(afterSecondCommandTexts))]

	// Generate rules and manual using ruleSeed (same for all modules)
	// Pass the terminal texts so rules can reference them
	ruleSet, moduleManual := GenerateTerminalModuleRulesWithSeed(ruleSeed, terminalTexts)

	// Determine correct commands based on rules and current terminal text
	correctCommands := make([]string, 3)
	for i := 0; i < 3; i++ {
		if i < len(ruleSet.Rules) {
			// Evaluate rule based on the terminal text at this step
			terminalText := terminalTexts[i]
			correctCommands[i] = ruleSet.Rules[i].Evaluator(terminalText)
		} else {
			// Fallback: use a default command
			correctCommands[i] = "ENTER"
		}
	}

	module := &TerminalModule{
		TerminalTexts:   terminalTexts,
		CurrentStep:     0,
		EnteredCommands: []string{},
		CorrectCommands: correctCommands,
		IsSolved:        false,
		RuleSet:         ruleSet,
		TerminalSeed:    terminalSeed,
	}

	return module, moduleManual
}

// EnterCommand attempts to enter a command at the current step
// Returns true if correct, false if wrong (strike)
func (tm *TerminalModule) EnterCommand(command string) bool {
	if tm.IsSolved {
		return false // Already solved
	}

	// Normalize command (trim and uppercase)
	normalizedCommand := strings.TrimSpace(strings.ToUpper(command))

	if normalizedCommand == "" {
		return false // Empty command
	}

	// Check if we've already entered all commands
	if tm.CurrentStep >= len(tm.CorrectCommands) {
		return false
	}

	// Add to entered commands
	tm.EnteredCommands = append(tm.EnteredCommands, normalizedCommand)

	// Check if command matches the correct command for current step
	correctCommand := strings.ToUpper(tm.CorrectCommands[tm.CurrentStep])
	if normalizedCommand == correctCommand {
		tm.CurrentStep++

		// Check if all commands are entered correctly
		if tm.CurrentStep >= len(tm.CorrectCommands) {
			tm.IsSolved = true
		}
		// Terminal text will update automatically via GetCurrentTerminalText()
		return true
	}

	// Wrong command = strike (but don't reset, allow retry)
	return false
}
