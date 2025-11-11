package handlers

import (
	"encoding/json"
	"net/http"
)

// ErrorResponse represents a standard error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// WriteError writes a standard error response
func WriteError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	response := ErrorResponse{
		Error:   http.StatusText(statusCode),
		Message: message,
	}
	
	json.NewEncoder(w).Encode(response)
}

// WriteBadRequest writes a 400 Bad Request error
func WriteBadRequest(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusBadRequest, message)
}

// WriteNotFound writes a 404 Not Found error
func WriteNotFound(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusNotFound, message)
}

// WriteForbidden writes a 403 Forbidden error
func WriteForbidden(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusForbidden, message)
}

// WriteInternalServerError writes a 500 Internal Server Error
func WriteInternalServerError(w http.ResponseWriter, message string) {
	WriteError(w, http.StatusInternalServerError, message)
}

