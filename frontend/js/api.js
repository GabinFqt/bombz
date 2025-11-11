// API client for REST endpoints
const API_BASE_URL = '/api';

class APIClient {
    async createGame(timeLimit = Config.DEFAULT_TIME_LIMIT, moduleCount = Config.DEFAULT_MODULE_COUNT) {
        const response = await fetch(`${API_BASE_URL}/game`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ timeLimit, moduleCount }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to create game');
        }
        
        return await response.json();
    }
    
    async joinGame(sessionId) {
        const response = await fetch(`${API_BASE_URL}/game/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to join game');
        }
        
        return await response.json();
    }
    
    async getGameState(sessionId, playerId = null) {
        let url = `${API_BASE_URL}/game/${sessionId}`;
        if (playerId) {
            url += `?playerId=${encodeURIComponent(playerId)}`;
        }
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to get game state');
        }
        
        return await response.json();
    }
    
    async getLobbyState(sessionId) {
        const response = await fetch(`${API_BASE_URL}/game/${sessionId}/lobby`);
        
        if (!response.ok) {
            throw new Error('Failed to get lobby state');
        }
        
        return await response.json();
    }
    
    async updateLobbySettings(sessionId, hostId, settings) {
        const response = await fetch(`${API_BASE_URL}/game/${sessionId}/lobby/settings?hostId=${encodeURIComponent(hostId)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings),
        });
        
        if (!response.ok) {
            throw new Error('Failed to update lobby settings');
        }
        
        return await response.json();
    }
    
    async startGame(sessionId, hostId) {
        const response = await fetch(`${API_BASE_URL}/game/${sessionId}/start?hostId=${encodeURIComponent(hostId)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to start game' }));
            throw new Error(error.message || 'Failed to start game');
        }
        
        return await response.json();
    }
    
    async returnToLobby(sessionId, hostId) {
        const response = await fetch(`${API_BASE_URL}/game/${sessionId}/return-to-lobby?hostId=${encodeURIComponent(hostId)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to return to lobby' }));
            throw new Error(error.message || 'Failed to return to lobby');
        }
        
        return await response.json();
    }
}

const apiClient = new APIClient();

