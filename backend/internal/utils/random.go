package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
)

const (
	// DefaultIDLength is the default length for generated IDs
	DefaultIDLength = 16
	// SessionIDLength is the length for session IDs (4 digits)
	SessionIDLength = 4
)

// GenerateRandomString generates a cryptographically secure random string
func GenerateRandomString(length int) (string, error) {
	if length <= 0 {
		length = DefaultIDLength
	}

	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random string: %w", err)
	}

	return hex.EncodeToString(bytes)[:length], nil
}

// GenerateSessionID generates a 4-digit session ID (1000-9999)
func GenerateSessionID() (string, error) {
	// Generate random number between 1000 and 9999
	max := big.NewInt(9000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("failed to generate session ID: %w", err)
	}
	
	sessionNum := int(n.Int64()) + 1000
	return fmt.Sprintf("%04d", sessionNum), nil
}

// GenerateHostID generates a unique host ID
func GenerateHostID() (string, error) {
	// Generate a longer random string for host ID
	id, err := GenerateRandomString(24)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("host-%s", id), nil
}

// GeneratePlayerID generates a unique player ID
func GeneratePlayerID() (string, error) {
	// Generate a random string for player ID
	id, err := GenerateRandomString(16)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("player-%s", id), nil
}

