package models

import (
	"math/rand"
	"time"
)

// ButtonText represents the text displayed on the button
type ButtonText string

const (
	ButtonTextAbort    ButtonText = "ABORT"
	ButtonTextDetonate ButtonText = "DETONATE"
	ButtonTextHold     ButtonText = "HOLD"
	ButtonTextPress    ButtonText = "PRESS"
	ButtonTextOther    ButtonText = "OTHER"
)

// ButtonColor represents the color of the button
type ButtonColor string

const (
	ButtonColorRed   ButtonColor = "red"
	ButtonColorBlue  ButtonColor = "blue"
	ButtonColorWhite ButtonColor = "white"
)

// GaugeColor represents the color of the gauge
type GaugeColor string

const (
	GaugeColorRed   GaugeColor = "red"
	GaugeColorBlue  GaugeColor = "blue"
	GaugeColorWhite GaugeColor = "white"
)

// ButtonAction represents the action to take for a button
type ButtonAction string

const (
	ButtonActionPress   ButtonAction = "press"   // Press and release immediately
	ButtonActionHold    ButtonAction = "hold"    // Hold and wait for gauge color
	ButtonActionRelease ButtonAction = "release" // Release after waiting
)

// ButtonModule represents the button module on the bomb
type ButtonModule struct {
	ButtonText       ButtonText     `json:"buttonText"`
	ButtonColor      ButtonColor    `json:"buttonColor"`
	GaugeColor       GaugeColor     `json:"gaugeColor"`
	IsSolved         bool           `json:"isSolved"`
	IsPressed        bool           `json:"isPressed"`
	HoldStartTime    *time.Time     `json:"-"` // When button was pressed (for hold actions)
	RuleSet          *ButtonRuleSet `json:"-"` // Rules for this module (not serialized)
	CorrectAction    ButtonAction   `json:"-"` // The correct action to take
	TargetTimerDigit int            `json:"-"` // Which timer digit to wait for (0-9)
	ButtonSeed       int64          `json:"-"` // Seed used for this module (for deterministic gauge color selection)
}

// NewButtonModuleWithRules creates a new button module with random button configuration and generates rules
// buttonSeed: seed for generating random button configuration (different for each module)
// ruleSeed: seed for generating rules (same for all modules to match the manual)
// Returns the module and its corresponding manual
func NewButtonModuleWithRules(buttonSeed int64, ruleSeed int64) (*ButtonModule, *ModuleManual) {
	// Create a seeded RNG for button generation using the buttonSeed (unique per module)
	rng := rand.New(rand.NewSource(buttonSeed))

	// Random button text
	buttonTexts := []ButtonText{ButtonTextAbort, ButtonTextDetonate, ButtonTextHold, ButtonTextPress, ButtonTextOther}
	buttonText := buttonTexts[rng.Intn(len(buttonTexts))]

	// Random button color
	buttonColors := []ButtonColor{ButtonColorRed, ButtonColorBlue, ButtonColorWhite}
	buttonColor := buttonColors[rng.Intn(len(buttonColors))]

	// Generate rules and manual using ruleSeed (same for all modules)
	ruleSet, moduleManual := GenerateButtonModuleRulesWithSeed(ruleSeed)

	module := &ButtonModule{
		ButtonText:  buttonText,
		ButtonColor: buttonColor,
		GaugeColor:  "", // Gauge color will be set when button is pressed
		IsSolved:    false,
		IsPressed:   false,
		RuleSet:     ruleSet,
		ButtonSeed:  buttonSeed, // Store seed for deterministic gauge color selection
	}

	// Determine correct action based on rules
	module.determineCorrectAction()

	return module, moduleManual
}

// determineCorrectAction calculates which action should be taken based on rules
// Only determines press vs hold - gauge color and timer digit are set when button is pressed
func (bm *ButtonModule) determineCorrectAction() {
	if bm.RuleSet == nil || len(bm.RuleSet.Rules) == 0 {
		// Fallback: default to hold
		bm.CorrectAction = ButtonActionHold
		return
	}

	// Evaluate rules in order
	for _, rule := range bm.RuleSet.Rules {
		result := rule.Evaluator(bm.ButtonText, bm.ButtonColor)
		if result != nil {
			bm.CorrectAction = result.Action
			// Gauge color and timer digit will be set when button is pressed (for hold actions)
			return
		}
	}

	// No rule matched, use default rule (should be the last rule in the set)
	if len(bm.RuleSet.Rules) > 0 {
		lastRule := bm.RuleSet.Rules[len(bm.RuleSet.Rules)-1]
		result := lastRule.Evaluator(bm.ButtonText, bm.ButtonColor)
		if result != nil {
			bm.CorrectAction = result.Action
			return
		}
	}

	// Final fallback
	bm.CorrectAction = ButtonActionHold
}

// GetGaugeColor returns the gauge color to display (only when pressed)
func (bm *ButtonModule) GetGaugeColor() GaugeColor {
	if bm.IsPressed {
		return bm.GaugeColor
	}
	return "" // No gauge color when not pressed
}

// PressButton handles a button press action
// Returns true if correct, false if wrong (strike)
func (bm *ButtonModule) PressButton() bool {
	if bm.IsSolved {
		return false // Already solved
	}

	if bm.IsPressed {
		return false // Already pressed
	}

	// If the correct action is immediate press and release, solve it
	if bm.CorrectAction == ButtonActionPress {
		bm.IsSolved = true
		return true
	}

	// Otherwise, start holding and randomly select gauge color
	bm.IsPressed = true

	// Randomly select gauge color (red, white, or blue) using deterministic seed
	gaugeColors := []GaugeColor{GaugeColorRed, GaugeColorBlue, GaugeColorWhite}
	gaugeColorRNG := rand.New(rand.NewSource(bm.ButtonSeed + 999999)) // Offset to avoid conflicts
	selectedGaugeColor := gaugeColors[gaugeColorRNG.Intn(len(gaugeColors))]
	bm.GaugeColor = selectedGaugeColor

	// Look up timer digit from gauge color mapping
	if bm.RuleSet != nil && bm.RuleSet.GaugeColorToDigitMap != nil {
		if digit, exists := bm.RuleSet.GaugeColorToDigitMap[selectedGaugeColor]; exists {
			bm.TargetTimerDigit = digit
		} else {
			// Fallback if mapping doesn't exist
			bm.TargetTimerDigit = 0
		}
	} else {
		// Fallback if RuleSet or mapping doesn't exist
		bm.TargetTimerDigit = 0
	}

	now := time.Now()
	bm.HoldStartTime = &now
	return true
}

// HoldButton handles holding the button (called when button is being held)
// Returns true if still holding correctly, false if should release or strike
func (bm *ButtonModule) HoldButton() bool {
	if bm.IsSolved {
		return false
	}

	if !bm.IsPressed {
		return false // Not pressed
	}

	// If action is immediate press, holding is wrong
	if bm.CorrectAction == ButtonActionPress {
		return false // Strike - should have released immediately
	}

	// For hold actions, we need to wait for the correct gauge color
	// This will be checked in ReleaseButton
	return true
}

// ReleaseButton handles releasing the button
// timeRemaining: current time remaining on bomb timer (for release timing)
// Returns true if correct, false if wrong (strike)
func (bm *ButtonModule) ReleaseButton(timeRemaining int) bool {
	if bm.IsSolved {
		return false
	}

	if !bm.IsPressed {
		return false // Not pressed
	}

	// If action is immediate press, releasing now is correct (already solved in PressButton)
	if bm.CorrectAction == ButtonActionPress {
		return true
	}

	// For hold actions, check if timer's last digit matches target
	if bm.CorrectAction == ButtonActionHold {
		// Check if timer's last digit matches the target digit
		lastDigit := timeRemaining % 10
		if lastDigit != bm.TargetTimerDigit {
			bm.IsPressed = false
			bm.GaugeColor = ""
			bm.HoldStartTime = nil
			return false // Wrong timer digit = strike
		}

		// Correct release!
		bm.IsSolved = true
		bm.IsPressed = false
		bm.GaugeColor = ""
		bm.HoldStartTime = nil
		return true
	}

	// Unknown action type
	bm.IsPressed = false
	bm.HoldStartTime = nil
	return false
}
