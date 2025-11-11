# Bombz Browser Game

A browser-based implementation of Bombz, featuring a 3D bomb with wire modules and real-time multiplayer support.

## Features

- 3D bomb visualization using Three.js
- Wires module with Bombz rules
- Real-time multiplayer synchronization via WebSocket
- Strike system (3 strikes = game over)
- Timer countdown
- Manual page for experts

## Architecture

- **Backend**: Go with gorilla/websocket for WebSocket support
- **Frontend**: HTML/CSS/JavaScript with Three.js for 3D rendering
- **Communication**: WebSocket for real-time updates, REST API for game state

## Prerequisites

- Go 1.21 or higher
- A modern web browser with WebSocket support

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   go mod download
   ```

3. Run the server:
   ```bash
   go run cmd/server/main.go
   ```

   The server will start on port 8080 by default. You can change this by setting the `PORT` environment variable.

### Frontend Setup

The frontend is served by the backend server. Simply open your browser and navigate to:

```
http://localhost:8080
```

## How to Play

1. **Defuser**: Open `http://localhost:8080` and create a new game or join an existing session.

2. **Expert**: Open `http://localhost:8080/manual.html?sessionId=<SESSION_ID>` in a separate window/tab, replacing `<SESSION_ID>` with the session ID from the defuser's screen.

3. The defuser sees the 3D bomb and must cut wires based on instructions from the expert.

4. The expert uses the manual page to determine which wire to cut based on the rules.

5. Cut the wrong wire = strike. 3 strikes = game over.

6. Defuse the bomb before time runs out!

## Wire Module Rules

1. If there are no red wires, cut the second wire.
2. If the last wire is white, cut the last wire.
3. If there is more than one blue wire, cut the last blue wire.
4. Otherwise, cut the last wire.

## Project Structure

```
project/
├── backend/
│   ├── cmd/server/main.go          # Server entry point
│   ├── internal/
│   │   ├── handlers/               # HTTP and WebSocket handlers
│   │   ├── models/                 # Game models (Bomb, Wires, Session)
│   │   └── service/                # Game service logic
│   └── go.mod                      # Go dependencies
├── frontend/
│   ├── index.html                  # Main game page
│   ├── manual.html                 # Expert manual page
│   ├── css/style.css               # Styling
│   └── js/                         # JavaScript modules
└── README.md                       # This file
```

## Development

### Backend Development

The backend uses Go modules. To add new dependencies:

```bash
go get <package-name>
```

### Frontend Development

The frontend uses vanilla JavaScript with Three.js loaded from CDN. All game logic is in the `js/` directory.

## API Endpoints

### REST API

- `POST /api/game` - Create a new game
- `POST /api/game/join` - Join an existing game
- `GET /api/game/{sessionId}` - Get current game state

### WebSocket

- `WS /ws/{sessionId}?type={defuser|expert}` - Connect to game session

## License

This project is for educational purposes.

