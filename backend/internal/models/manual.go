package models

// ManualRule represents a single rule in the manual
type ManualRule struct {
	Number      int    `json:"number"`
	Description string `json:"description"`
}

// WireModuleManual contains the manual content for the wires module
type WireModuleManual struct {
	Title       string       `json:"title"`
	Rules       []ManualRule `json:"rules"`
	WireColors  []string     `json:"wireColors"`
	Instructions string     `json:"instructions"`
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
		WireColors: []string{"red", "blue", "black", "white", "yellow"},
		Instructions: "As an expert, your job is to guide the defuser through the wires module using these rules. Look at the wires configuration and tell the defuser which wire to cut based on the rules above.",
	}
}

// ManualContent represents the complete manual content for a game session
type ManualContent struct {
	WireModule *WireModuleManual `json:"wireModule"`
	BombState  *Bomb              `json:"bombState,omitempty"` // Include bomb state so experts can see wire configurations
}

// GetManualContent returns the complete manual content
// If bomb is provided (non-nil), it will be included in the response
func GetManualContent(bomb *Bomb) *ManualContent {
	content := &ManualContent{
		WireModule: GetWireModuleManual(),
	}
	if bomb != nil {
		content.BombState = bomb
	}
	return content
}

