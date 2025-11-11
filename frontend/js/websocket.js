// WebSocket client for real-time communication
class WebSocketClient {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.hostId = null; // Store hostId for reconnections
        this.ws = null;
        this.onMessageCallbacks = [];
        this.onStateUpdateCallbacks = [];
        this.onManualContentUpdateCallbacks = [];
        this.onLobbyUpdateCallbacks = [];
        this.onGameStartingCallbacks = [];
        this.onReturnToLobbyCallbacks = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = Config.MAX_RECONNECT_ATTEMPTS;
    }
    
    connect(hostId = null) {
        // Store hostId for reconnections (only if provided and not already set)
        if (hostId && !this.hostId) {
            this.hostId = hostId;
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port || Config.DEFAULT_PORT;
        let wsUrl = `${protocol}//${host}:${port}/ws/${this.sessionId}`;
        if (this.hostId) {
            wsUrl += `?hostId=${encodeURIComponent(this.hostId)}`;
        }
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.onConnect();
        };
        
        this.ws.onmessage = (event) => {
            try {
                // Handle multiple JSON messages separated by newlines
                const data = event.data;
                const messages = data.split('\n').filter(line => line.trim().length > 0);
                
                for (const messageStr of messages) {
                    try {
                        const message = JSON.parse(messageStr);
                        this.handleMessage(message);
                    } catch (parseError) {
                        console.error('Error parsing individual WebSocket message:', parseError, 'Data:', messageStr);
                    }
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error, 'Raw data:', event.data);
            }
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.onDisconnect();
            this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            // Notify user of connection issues
            if (this.onDisconnect) {
                this.onDisconnect();
            }
        };
    }
    
    handleMessage(message) {
        switch (message.type) {
            case 'gameState':
                const bombState = this.parseMessageData(message.data, 'gameState');
                if (bombState !== null) {
                    this.onStateUpdateCallbacks.forEach(callback => callback(bombState));
                }
                break;
            case 'manualContent':
                const manualContent = this.parseMessageData(message.data, 'manualContent');
                if (manualContent !== null) {
                    this.onManualContentUpdateCallbacks.forEach(callback => callback(manualContent));
                }
                break;
            case 'lobbyUpdate':
                const lobbyData = this.parseMessageData(message.data, 'lobbyUpdate');
                if (lobbyData !== null) {
                    this.onLobbyUpdateCallbacks.forEach(callback => callback(lobbyData));
                }
                break;
            case 'gameStarting':
                this.onGameStartingCallbacks.forEach(callback => callback());
                break;
            case 'returnedToLobby':
                this.onReturnToLobbyCallbacks.forEach(callback => callback());
                break;
            case 'wireCutResult':
                const result = this.parseMessageData(message.data, 'wireCutResult');
                if (result !== null) {
                    this.onMessageCallbacks.forEach(callback => callback(message));
                }
                break;
            case 'pong':
                // Heartbeat response
                break;
            default:
                this.onMessageCallbacks.forEach(callback => callback(message));
        }
    }
    
    // parseMessageData parses message data, handling both string and object types
    parseMessageData(data, messageType) {
        if (data === null || data === undefined) {
            return null;
        }
        
        // If already an object, return as-is
        if (typeof data !== 'string') {
            return data;
        }
        
        // Parse string to object
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error(`Error parsing ${messageType} data:`, e);
            return null;
        }
    }
    
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not open');
        }
    }
    
    cutWire(moduleIndex, wireIndex) {
        this.send({
            type: 'cutWire',
            sessionId: this.sessionId,
            data: {
                moduleIndex: moduleIndex,
                wireIndex: wireIndex,
            },
        });
    }
    
    sendLobbySettings(settings) {
        this.send({
            type: 'updateLobbySettings',
            sessionId: this.sessionId,
            data: settings,
        });
    }
    
    sendStartGame() {
        this.send({
            type: 'startGame',
            sessionId: this.sessionId,
        });
    }
    
    sendReturnToLobby() {
        this.send({
            type: 'returnToLobby',
            sessionId: this.sessionId,
        });
    }
    
    onConnect() {
        // Override in main.js
    }
    
    onDisconnect() {
        // Override in main.js
    }
    
    onStateUpdate(callback) {
        this.onStateUpdateCallbacks.push(callback);
    }
    
    onManualContentUpdate(callback) {
        this.onManualContentUpdateCallbacks.push(callback);
    }
    
    onMessage(callback) {
        this.onMessageCallbacks.push(callback);
    }
    
    onLobbyUpdate(callback) {
        this.onLobbyUpdateCallbacks.push(callback);
    }
    
    onGameStarting(callback) {
        this.onGameStartingCallbacks.push(callback);
    }
    
    onReturnToLobby(callback) {
        this.onReturnToLobbyCallbacks.push(callback);
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
                this.connect();
            }, Config.RECONNECT_DELAY_BASE * this.reconnectAttempts);
        }
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

