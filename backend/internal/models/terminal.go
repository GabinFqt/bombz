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

// Terminal text templates for command prompts
var terminalPrompts = []string{
	"$ ",
	"root@bomb:~# ",
	"[SYSTEM] Initializing security protocols...",
	"WARNING: Unauthorized access detected",
	"bash-5.1# ",
	"Process ID: 42719 | user@localhost:~$ ",
	">>> DEFUSAL MODE ACTIVE <<<",
	"Connection established to 192.168.1.42",
	"[root@bomb ~]# cat /var/log/timer.log",
	"Kernel panic - not syncing: Attempted to kill init!",
	"sh-4.2$ ",
	"[OK] Started Bomb Defusal Service",
	"ERROR: Module checksum failed (0x7F3A9B2C)",
	"Segmentation fault (core dumped)",
	"C:\\BOMB\\SYSTEM32> ",
	"Last login: Wed Nov 12 14:23:19 2025 from 10.0.0.1",
	"zsh: command not found: defuse",
	"python3 -c 'import bomb; bomb.disarm()'",
	"Memory usage: 94.2% | Swap: 87.3%",
	"sudo rm -rf /bomb/timer",
	"[CRITICAL] Wire #3 integrity: COMPROMISED",
	"Permission denied (publickey)",
	"gcc bomb.c -o bomb && ./bomb",
	"Kernel: 5.15.0-bomb-defusal x86_64",
	"Connecting to 127.0.0.1:9999... connected.",
	"#!/bin/bash",
	"[WARN] Timer acceleration detected: +15%",
	"top - 14:23:42 up 0:03, 1 user, load: 4.20, 3.14, 2.71",
	"export BOMB_SEED=0x$(openssl rand -hex 4)",
	"tcpdump: listening on eth0, link-type EN10MB",
	"dmesg | tail -n 5",
	"ps aux | grep defuse",
	"curl https://api.bomb.local/status | jq '.modules[]'",
	"journalctl -xe --no-pager",
	"nc -lvp 31337",
	"strace -p 1337 2>&1 | head -n 3",
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
	terminalTexts[0] = terminalPrompts[rng.Intn(len(terminalPrompts))]
	terminalTexts[1] = terminalPrompts[rng.Intn(len(terminalPrompts))]
	terminalTexts[2] = terminalPrompts[rng.Intn(len(terminalPrompts))]

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
