package main

import (
	"bombs/internal/handlers"
	"bombs/internal/service"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gorilla/mux"
)

func main() {
	// Initialize game service
	gameService := service.NewGameService()

	// Initialize handlers
	gameHandler := handlers.NewGameHandler(gameService)
	wsHandler := handlers.NewWebSocketHandler(gameService)

	// Setup router
	r := mux.NewRouter()

	// CORS middleware
	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "*" // Default to allow all origins in development
	}
	r.Use(corsMiddleware(corsOrigin))

	// REST API routes
	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/game", gameHandler.CreateGame).Methods("POST")
	api.HandleFunc("/game/join", gameHandler.JoinGame).Methods("POST")
	api.HandleFunc("/game/{sessionId}", gameHandler.GetGameState).Methods("GET")
	api.HandleFunc("/game/{sessionId}/lobby", gameHandler.GetLobbyState).Methods("GET")
	api.HandleFunc("/game/{sessionId}/lobby/settings", gameHandler.UpdateLobbySettings).Methods("POST")
	api.HandleFunc("/game/{sessionId}/start", gameHandler.StartGame).Methods("POST")
	api.HandleFunc("/game/{sessionId}/return-to-lobby", gameHandler.ReturnToLobby).Methods("POST")

	// WebSocket route
	r.HandleFunc("/ws/{sessionId}", wsHandler.HandleWebSocket)

	// Serve frontend static files
	frontendDir := "../frontend"
	if _, err := os.Stat(frontendDir); err == nil {
		fileServer := http.FileServer(http.Dir(frontendDir))
		r.PathPrefix("/").Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Set correct MIME types based on file extension
			ext := filepath.Ext(r.URL.Path)
			if mimeType := mime.TypeByExtension(ext); mimeType != "" {
				w.Header().Set("Content-Type", mimeType)
			}
			fileServer.ServeHTTP(w, r)
		}))
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "5555"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

// corsMiddleware adds CORS headers with configurable origin
func corsMiddleware(allowedOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
