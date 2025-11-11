// Main game initialization and coordination
let bomb3d = null;
let websocketClient = null;
let wiresModule = null;
let currentSessionId = null;
let currentPlayerId = null;
let currentHostId = null;
let lobbyState = null;
let isHost = false;
let currentPlayerType = null;

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    setupMenuHandlers();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (bomb3d) {
            bomb3d.onWindowResize();
        }
    });
});

function setupMenuHandlers() {
    document.getElementById('create-game-btn').addEventListener('click', async () => {
        try {
            const result = await apiClient.createGame(Config.DEFAULT_TIME_LIMIT, Config.DEFAULT_MODULE_COUNT);
            currentSessionId = result.sessionId;
            currentHostId = result.hostId;
            isHost = true;
            showLobby(result.lobby, true);
        } catch (error) {
            console.error('Failed to create game:', error);
            alert('Failed to create game. Please try again.');
        }
    });
    
    document.getElementById('join-submit-btn').addEventListener('click', async () => {
        const sessionId = document.getElementById('session-id-input').value.trim();
        if (!sessionId) {
            alert('Please enter a session ID');
            return;
        }
        
        try {
            const result = await apiClient.joinGame(sessionId);
            currentSessionId = sessionId;
            
            // Set hostId from lobby if available
            if (result.lobby && result.lobby.hostId) {
                currentHostId = result.lobby.hostId;
            }
            
            // Show lobby (isHost will be determined from WebSocket updates)
            showLobby(result.lobby, false);
        } catch (error) {
            console.error('Failed to join game:', error);
            alert('Failed to join game. Please check the session ID.');
        }
    });
    
    // Lobby controls - circular buttons for module count
    document.querySelectorAll('#module-count-buttons .circular-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!isHost || !currentHostId || !currentSessionId) return;
            
            // Remove active class from all buttons
            document.querySelectorAll('#module-count-buttons .circular-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // Add active class to clicked button
            e.target.classList.add('active');
            
            updateLobbySettings();
        });
    });
    
    // Lobby controls - circular buttons for time limit
    document.querySelectorAll('#time-limit-buttons .circular-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!isHost || !currentHostId || !currentSessionId) return;
            
            // Remove active class from all buttons
            document.querySelectorAll('#time-limit-buttons .circular-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // Add active class to clicked button
            e.target.classList.add('active');
            
            updateLobbySettings();
        });
    });
    
    // Random defuser button
    document.getElementById('random-defuser-btn').addEventListener('click', () => {
        if (!isHost || !currentHostId || !currentSessionId) return;
        selectRandomDefuser();
    });
    
    document.getElementById('start-game-btn').addEventListener('click', () => {
        if (currentHostId && currentSessionId) {
            startGameFromLobby();
        }
    });
    
    // Game end controls
    document.getElementById('return-to-lobby-btn').addEventListener('click', () => {
        console.log('Return to lobby button clicked:', { isHost, currentHostId, currentSessionId });
        returnToLobby();
    });
}

function showLobby(lobby, isHost) {
    // Hide menu
    document.getElementById('menu').style.display = 'none';
    
    // Hide game container
    document.getElementById('game-container').style.display = 'none';
    
    // Show lobby container
    document.getElementById('lobby-container').style.display = 'block';
    
    lobbyState = lobby;
    renderLobby(lobby, isHost);
    
    // Reuse existing WebSocket connection if available and connected
    // Otherwise create a new one
    if (!websocketClient || !websocketClient.ws || websocketClient.ws.readyState !== WebSocket.OPEN) {
        // Initialize WebSocket client for lobby
        websocketClient = new WebSocketClient(currentSessionId);
    } else {
        // Clear existing callbacks to avoid duplicates
        websocketClient.onLobbyUpdateCallbacks = [];
        websocketClient.onGameStartingCallbacks = [];
        websocketClient.onReturnToLobbyCallbacks = [];
        websocketClient.onStateUpdateCallbacks = [];
        websocketClient.onManualContentUpdateCallbacks = [];
    }
    
    websocketClient.onConnect = () => {
        updateAllConnectionStatuses(true);
    };
    
    websocketClient.onDisconnect = () => {
        updateAllConnectionStatuses(false);
    };
    
    // Handle lobby updates
    websocketClient.onLobbyUpdate((lobbyData) => {
        lobbyState = lobbyData;
        
        // Check if we're returning to lobby from game end
        const gameEndOverlay = document.getElementById('game-end-overlay');
        if (gameEndOverlay && gameEndOverlay.style.display !== 'none' && lobbyData.state === 'waiting') {
            handleReturnToLobby(lobbyData);
            return;
        }
        
        // Update player ID if provided
        if (lobbyData.playerId) {
            currentPlayerId = lobbyData.playerId;
        }
        
        // Find current player's type from players list
        if (lobbyData.players && currentPlayerId) {
            const currentPlayer = lobbyData.players.find(p => p.id === currentPlayerId);
            if (currentPlayer) {
                currentPlayerType = currentPlayer.type;
            }
        }
        
        // Determine if current player is host
        if (lobbyData.hostId && currentPlayerId) {
            isHost = lobbyData.hostId === currentPlayerId;
            currentHostId = lobbyData.hostId;
        } else if (lobbyData.hostId) {
            currentHostId = lobbyData.hostId;
            // If we have hostId but no playerId yet, and we know we're the host, set isHost
            if (isHost && currentHostId) {
                // We'll get the playerId in the next update
            }
        }
        
        renderLobby(lobbyData, isHost);
    });
    
    // Handle game starting
    websocketClient.onGameStarting(() => {
        // Check player type from lobby state if not already set
        if (!currentPlayerType && lobbyState && lobbyState.players && currentPlayerId) {
            const currentPlayer = lobbyState.players.find(p => p.id === currentPlayerId);
            if (currentPlayer) {
                currentPlayerType = currentPlayer.type;
            }
        }
        
        // Transition to appropriate view based on player type
        if (currentPlayerType === 'expert') {
            transitionToManual();
        } else {
            transitionToGame();
        }
    });
    
    // Handle return to lobby
    websocketClient.onReturnToLobby(() => {
        handleReturnToLobby(null);
    });
    
    // Connect WebSocket - pass hostId if we're the host
    websocketClient.connect(isHost ? currentHostId : null);
}

function renderLobby(lobby, isHostParam) {
    // Update isHost if provided, otherwise use global
    if (typeof isHostParam !== 'undefined') {
        isHost = isHostParam;
    }
    
    // Update session ID
    document.getElementById('lobby-session-id').textContent = currentSessionId;
    
    // Show/hide host indicator
    const hostIndicator = document.getElementById('lobby-host-indicator');
    if (isHost) {
        hostIndicator.style.display = 'block';
    } else {
        hostIndicator.style.display = 'none';
    }
    
    // Render player cards
    const playerCardsContainer = document.getElementById('player-cards-container');
    playerCardsContainer.innerHTML = '';
    
    if (lobby.players) {
        lobby.players.forEach(player => {
            const card = document.createElement('div');
            card.className = 'player-card';
            card.dataset.playerId = player.id;
            
            // Add defuser class if this player is the defuser
            if (!lobby.isRandomDefuser && lobby.defuserId === player.id) {
                card.classList.add('is-defuser');
            }
            
            // Player name input
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'player-name-input';
            nameInput.value = player.name || player.id;
            nameInput.dataset.playerId = player.id;
            
            // Only allow editing own name
            if (player.id !== currentPlayerId) {
                nameInput.disabled = true;
            }
            
            // Debounced name update
            let nameUpdateTimeout = null;
            nameInput.addEventListener('input', (e) => {
                clearTimeout(nameUpdateTimeout);
                nameUpdateTimeout = setTimeout(() => {
                    const newName = e.target.value.trim();
                    if (newName && newName !== player.name) {
                        updatePlayerName(newName);
                    }
                }, 500);
            });
            
            card.appendChild(nameInput);
            
            // Select as defuser button (only visible to host)
            if (isHost) {
                const selectBtn = document.createElement('button');
                selectBtn.className = 'select-defuser-btn';
                selectBtn.textContent = 'Select as Defuser';
                selectBtn.addEventListener('click', () => {
                    selectDefuser(player.id);
                });
                card.appendChild(selectBtn);
            }
            
            playerCardsContainer.appendChild(card);
        });
    }
    
    // Show/hide random defuser button (only for host)
    const randomDefuserBtnContainer = document.getElementById('random-defuser-btn-container');
    if (isHost) {
        randomDefuserBtnContainer.style.display = 'block';
    } else {
        randomDefuserBtnContainer.style.display = 'none';
    }
    
    // Update host controls
    const hostControls = document.getElementById('lobby-host-controls');
    const waitingMessage = document.getElementById('lobby-waiting-message');
    
    if (isHost) {
        hostControls.style.display = 'block';
        waitingMessage.style.display = 'none';
        
        // Update module count buttons
        const moduleButtons = document.querySelectorAll('#module-count-buttons .circular-btn');
        moduleButtons.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.value) === (lobby.moduleCount || Config.DEFAULT_MODULE_COUNT)) {
                btn.classList.add('active');
            }
        });
        
        // Update time limit buttons (convert seconds to minutes)
        const timeLimitMinutes = Math.floor((lobby.timeLimit || Config.DEFAULT_TIME_LIMIT) / 60);
        const timeButtons = document.querySelectorAll('#time-limit-buttons .circular-btn');
        timeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.value) === timeLimitMinutes) {
                btn.classList.add('active');
            }
        });
        
        // Update start button
        const startBtn = document.getElementById('start-game-btn');
        const playerCount = lobby.players ? lobby.players.length : 0;
        if (isHost && playerCount >= 2) {
            startBtn.disabled = false;
        } else {
            startBtn.disabled = true;
        }
    } else {
        hostControls.style.display = 'none';
        waitingMessage.style.display = 'block';
    }
}

async function updateLobbySettings() {
    if (!currentHostId || !currentSessionId) return;
    
    try {
        // Get module count from active button
        const activeModuleBtn = document.querySelector('#module-count-buttons .circular-btn.active');
        const moduleCount = activeModuleBtn ? parseInt(activeModuleBtn.dataset.value) : Config.DEFAULT_MODULE_COUNT;
        
        // Get time limit from active button (convert minutes to seconds)
        const activeTimeBtn = document.querySelector('#time-limit-buttons .circular-btn.active');
        const timeLimitMinutes = activeTimeBtn ? parseInt(activeTimeBtn.dataset.value) : Math.floor(Config.DEFAULT_TIME_LIMIT / 60);
        const timeLimit = timeLimitMinutes * 60;
        
        // Get current defuser settings from lobby state
        const isRandomDefuser = lobbyState ? lobbyState.isRandomDefuser : false;
        const defuserId = lobbyState && !lobbyState.isRandomDefuser ? lobbyState.defuserId : '';
        
        const settings = {
            moduleCount: moduleCount,
            isRandomDefuser: isRandomDefuser,
            defuserId: defuserId,
            timeLimit: timeLimit,
        };
        
        // Send via WebSocket if connected, otherwise via API
        if (websocketClient && websocketClient.ws && websocketClient.ws.readyState === WebSocket.OPEN) {
            websocketClient.sendLobbySettings(settings);
        } else {
            await apiClient.updateLobbySettings(currentSessionId, currentHostId, settings);
        }
    } catch (error) {
        console.error('Error updating lobby settings:', error);
        alert('Failed to update lobby settings. Please try again.');
    }
}

function selectDefuser(playerId) {
    if (!isHost || !currentHostId || !currentSessionId) return;
    
    const settings = {
        moduleCount: lobbyState ? lobbyState.moduleCount : Config.DEFAULT_MODULE_COUNT,
        isRandomDefuser: false,
        defuserId: playerId,
        timeLimit: lobbyState ? lobbyState.timeLimit : Config.DEFAULT_TIME_LIMIT,
    };
    
    // Send via WebSocket if connected, otherwise via API
    if (websocketClient && websocketClient.ws && websocketClient.ws.readyState === WebSocket.OPEN) {
        websocketClient.sendLobbySettings(settings);
    } else {
        apiClient.updateLobbySettings(currentSessionId, currentHostId, settings).catch(error => {
            console.error('Error selecting defuser:', error);
        });
    }
}

function selectRandomDefuser() {
    if (!isHost || !currentHostId || !currentSessionId) return;
    
    const settings = {
        moduleCount: lobbyState ? lobbyState.moduleCount : Config.DEFAULT_MODULE_COUNT,
        isRandomDefuser: true,
        defuserId: '',
        timeLimit: lobbyState ? lobbyState.timeLimit : Config.DEFAULT_TIME_LIMIT,
    };
    
    // Send via WebSocket if connected, otherwise via API
    if (websocketClient && websocketClient.ws && websocketClient.ws.readyState === WebSocket.OPEN) {
        websocketClient.sendLobbySettings(settings);
    } else {
        apiClient.updateLobbySettings(currentSessionId, currentHostId, settings).catch(error => {
            console.error('Error selecting random defuser:', error);
        });
    }
}

function updatePlayerName(name) {
    if (!currentPlayerId || !name || name.trim() === '') return;
    
    // Send via WebSocket if connected
    if (websocketClient && websocketClient.ws && websocketClient.ws.readyState === WebSocket.OPEN) {
        websocketClient.sendUpdatePlayerName(name.trim());
    }
}

function startGameFromLobby() {
    if (!isHost || !currentHostId || !currentSessionId) {
        console.log('Cannot start game:', { isHost, currentHostId, currentSessionId });
        return;
    }
    
    const startBtn = document.getElementById('start-game-btn');
    const errorMsg = document.getElementById('start-game-error');
    
    startBtn.disabled = true;
    errorMsg.style.display = 'none';
    
    console.log('Starting game...', { currentSessionId, currentHostId });
    
    // Send via WebSocket if connected, otherwise via API
    if (websocketClient && websocketClient.ws && websocketClient.ws.readyState === WebSocket.OPEN) {
        console.log('Sending start game via WebSocket');
        websocketClient.sendStartGame();
    } else {
        console.log('Sending start game via API');
        apiClient.startGame(currentSessionId, currentHostId).then(() => {
            // Game will start via WebSocket message
            console.log('Start game API call successful');
        }).catch(error => {
            console.error('Failed to start game:', error);
            errorMsg.textContent = error.message || 'Failed to start game';
            errorMsg.style.display = 'block';
            startBtn.disabled = false;
        });
    }
}

function transitionToGame() {
    // Hide lobby
    document.getElementById('lobby-container').style.display = 'none';
    
    // Hide manual container
    manualDisplay.hide();
    
    // Hide game end overlay if visible
    document.getElementById('game-end-overlay').style.display = 'none';
    
    // Show game container
    document.getElementById('game-container').style.display = 'block';
    
    // Update session info
    document.getElementById('session-id').textContent = currentSessionId;
    
    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
        console.error('Three.js is not loaded. Please check the CDN connection.');
        alert('Failed to load Three.js library. Please check your internet connection and try again.');
        return;
    }
    
    // Initialize 3D bomb
    bomb3d = new Bomb3D('canvas-container');
    
    // Initialize wires module
    wiresModule = new WiresModule(bomb3d, websocketClient);
    
    // Listen for game state updates to detect game end
    websocketClient.onStateUpdate((bombState) => {
        if (bombState.state === 'defused' || bombState.state === 'exploded') {
            showGameEnd(bombState.state);
        }
    });
    
    // Make sure return to lobby handler is set up
    websocketClient.onReturnToLobby(() => {
        handleReturnToLobby();
    });
    
    // Request initial game state (with playerId if available for role-specific content)
    apiClient.getGameState(currentSessionId, currentPlayerId).then(bombState => {
        wiresModule.updateBombState(bombState);
        // Check if game is already ended
        if (bombState.state === 'defused' || bombState.state === 'exploded') {
            showGameEnd(bombState.state);
        }
    }).catch(error => {
        console.error('Failed to get initial game state:', error);
    });
}

function transitionToManual() {
    // Hide lobby
    document.getElementById('lobby-container').style.display = 'none';
    
    // Hide game container
    document.getElementById('game-container').style.display = 'none';
    
    // Hide game end overlay if visible
    document.getElementById('game-end-overlay').style.display = 'none';
    
    // Show manual container
    manualDisplay.show();
    
    // Update connection status
    updateAllConnectionStatuses(websocketClient && websocketClient.ws && websocketClient.ws.readyState === WebSocket.OPEN);
    
    // Listen for manual content updates
    websocketClient.onManualContentUpdate((manualContent) => {
        manualDisplay.renderManualContent(manualContent);
        
        // Check if game is ended
        if (manualContent.bombState) {
            if (manualContent.bombState.state === 'defused' || manualContent.bombState.state === 'exploded') {
                showGameEnd(manualContent.bombState.state);
            }
        }
    });
    
    // Make sure return to lobby handler is set up
    websocketClient.onReturnToLobby(() => {
        handleReturnToLobby();
    });
    
    // Request initial manual content (with playerId if available)
    apiClient.getGameState(currentSessionId, currentPlayerId).then(manualContent => {
        manualDisplay.renderManualContent(manualContent);
        // Check if game is already ended
        if (manualContent.bombState) {
            if (manualContent.bombState.state === 'defused' || manualContent.bombState.state === 'exploded') {
                showGameEnd(manualContent.bombState.state);
            }
        }
    }).catch(error => {
        console.error('Failed to get initial manual content:', error);
    });
}

function showGameEnd(gameState) {
    // Hide game container
    document.getElementById('game-container').style.display = 'none';
    
    // Hide manual container
    manualDisplay.hide();
    
    // Show game end overlay
    const gameEndOverlay = document.getElementById('game-end-overlay');
    gameEndOverlay.style.display = 'flex';
    
    // Update result display
    const resultDiv = document.getElementById('game-end-result');
    const title = document.getElementById('game-end-title');
    
    if (gameState === 'defused') {
        title.textContent = '🎉 Bomb Defused! 🎉';
        title.style.color = '#4ecdc4';
        resultDiv.innerHTML = '<p style="color: #4ecdc4; font-size: 18px;">Congratulations! The bomb has been successfully defused.</p>';
    } else if (gameState === 'exploded') {
        title.textContent = '💥 Bomb Exploded 💥';
        title.style.color = '#ff6b6b';
        resultDiv.innerHTML = '<p style="color: #ff6b6b; font-size: 18px;">The bomb has exploded. Game over.</p>';
    }
    
    // Show/hide controls based on host status
    const hostControls = document.getElementById('game-end-host-controls');
    const waitingMessage = document.getElementById('game-end-waiting-message');
    const returnBtn = document.getElementById('return-to-lobby-btn');
    
    // Always ensure button is enabled when showing game end
    if (returnBtn) {
        returnBtn.disabled = false;
    }
    
    if (isHost) {
        hostControls.style.display = 'block';
        waitingMessage.style.display = 'none';
    } else {
        hostControls.style.display = 'none';
        waitingMessage.style.display = 'block';
    }
}

function handleReturnToLobby(lobbyDataFromUpdate = null) {
    console.log('handleReturnToLobby called:', { lobbyDataFromUpdate, isHost, currentHostId, currentSessionId });
    
    // Re-enable the return to lobby button in case it was disabled
    const returnBtn = document.getElementById('return-to-lobby-btn');
    if (returnBtn) {
        returnBtn.disabled = false;
    }
    
    // Hide game end overlay
    document.getElementById('game-end-overlay').style.display = 'none';
    
    // Hide game container
    document.getElementById('game-container').style.display = 'none';
    
    // Hide manual container
    manualDisplay.hide();
    
    // Hide menu (in case it's showing)
    document.getElementById('menu').style.display = 'none';
    
    // Show lobby container
    document.getElementById('lobby-container').style.display = 'block';
    
    // If we have lobby data from the update, use it directly
    if (lobbyDataFromUpdate) {
        lobbyState = lobbyDataFromUpdate;
        
        // Update player ID if provided
        if (lobbyDataFromUpdate.playerId) {
            currentPlayerId = lobbyDataFromUpdate.playerId;
        }
        
        // Find current player's type from players list
        if (lobbyDataFromUpdate.players && currentPlayerId) {
            const currentPlayer = lobbyDataFromUpdate.players.find(p => p.id === currentPlayerId);
            if (currentPlayer) {
                currentPlayerType = currentPlayer.type;
            }
        }
        
        // Determine if current player is host
        if (lobbyDataFromUpdate.hostId && currentPlayerId) {
            isHost = lobbyDataFromUpdate.hostId === currentPlayerId;
            currentHostId = lobbyDataFromUpdate.hostId;
        } else if (lobbyDataFromUpdate.hostId) {
            currentHostId = lobbyDataFromUpdate.hostId;
        }
        
        renderLobby(lobbyDataFromUpdate, isHost);
        return;
    }
    
    // If we already have a websocketClient with active connection, reuse it
    // Otherwise, fetch lobby state and show lobby (which will create a new WebSocket)
    if (websocketClient && websocketClient.ws && websocketClient.ws.readyState === WebSocket.OPEN) {
        // WebSocket is already connected, set up all lobby handlers
        // Clear existing callbacks to avoid duplicates
        websocketClient.onLobbyUpdateCallbacks = [];
        websocketClient.onGameStartingCallbacks = [];
        websocketClient.onReturnToLobbyCallbacks = [];
        
        // Set up connection status handlers
        websocketClient.onConnect = () => {
            updateAllConnectionStatuses(true);
        };
        
        websocketClient.onDisconnect = () => {
            updateAllConnectionStatuses(false);
        };
        
        // Set up lobby update handler
        websocketClient.onLobbyUpdate((lobbyData) => {
            lobbyState = lobbyData;
            
            // Check if we're returning to lobby from game end
            const gameEndOverlay = document.getElementById('game-end-overlay');
            if (gameEndOverlay && gameEndOverlay.style.display !== 'none' && lobbyData.state === 'waiting') {
                handleReturnToLobby(lobbyData);
                return;
            }
            
            // Update player ID if provided
            if (lobbyData.playerId) {
                currentPlayerId = lobbyData.playerId;
            }
            
            // Find current player's type from players list
            if (lobbyData.players && currentPlayerId) {
                const currentPlayer = lobbyData.players.find(p => p.id === currentPlayerId);
                if (currentPlayer) {
                    currentPlayerType = currentPlayer.type;
                }
            }
            
            // Determine if current player is host
            if (lobbyData.hostId && currentPlayerId) {
                isHost = lobbyData.hostId === currentPlayerId;
                currentHostId = lobbyData.hostId;
            } else if (lobbyData.hostId) {
                currentHostId = lobbyData.hostId;
            }
            
            renderLobby(lobbyData, isHost);
        });
        
        // Set up game starting handler
        websocketClient.onGameStarting(() => {
            // Check player type from lobby state if not already set
            if (!currentPlayerType && lobbyState && lobbyState.players && currentPlayerId) {
                const currentPlayer = lobbyState.players.find(p => p.id === currentPlayerId);
                if (currentPlayer) {
                    currentPlayerType = currentPlayer.type;
                }
            }
            
            // Transition to appropriate view based on player type
            if (currentPlayerType === 'expert') {
                transitionToManual();
            } else {
                transitionToGame();
            }
        });
        
        // Set up return to lobby handler
        websocketClient.onReturnToLobby(() => {
            handleReturnToLobby(null);
        });
        
        // Fetch latest lobby state and render
        if (currentSessionId) {
            apiClient.getLobbyState(currentSessionId).then(lobby => {
                lobbyState = lobby;
                
                // Update host status from lobby state
                if (lobby.hostId && currentPlayerId) {
                    isHost = lobby.hostId === currentPlayerId;
                    currentHostId = lobby.hostId;
                } else if (lobby.hostId) {
                    currentHostId = lobby.hostId;
                }
                
                // Update player type from lobby state
                if (lobby.players && currentPlayerId) {
                    const currentPlayer = lobby.players.find(p => p.id === currentPlayerId);
                    if (currentPlayer) {
                        currentPlayerType = currentPlayer.type;
                    }
                }
                
                console.log('Lobby state fetched:', { isHost, currentHostId, currentSessionId, currentPlayerId });
                renderLobby(lobby, isHost);
            }).catch(error => {
                console.error('Failed to get lobby state:', error);
                // Use existing lobby state if available
                if (lobbyState) {
                    renderLobby(lobbyState, isHost);
                }
            });
        } else if (lobbyState) {
            renderLobby(lobbyState, isHost);
        }
    } else {
        // No active WebSocket, fetch lobby state and show lobby (will create new WebSocket)
        if (currentSessionId) {
            apiClient.getLobbyState(currentSessionId).then(lobby => {
                lobbyState = lobby;
                showLobby(lobby, isHost);
            }).catch(error => {
                console.error('Failed to get lobby state:', error);
                // Still try to show lobby with existing state
                if (lobbyState) {
                    showLobby(lobbyState, isHost);
                } else {
                    // Fallback: show menu if we can't get lobby state
                    console.error('Cannot return to lobby: failed to get lobby state');
                    document.getElementById('menu').style.display = 'flex';
                    document.getElementById('lobby-container').style.display = 'none';
                }
            });
        } else if (lobbyState) {
            // Use existing lobby state
            showLobby(lobbyState, isHost);
        } else {
            // No session ID and no lobby state - this shouldn't happen, but show menu as fallback
            console.error('Cannot return to lobby: no session ID or lobby state');
            document.getElementById('menu').style.display = 'flex';
            document.getElementById('lobby-container').style.display = 'none';
        }
    }
}


function returnToLobby() {
    console.log('returnToLobby called:', { isHost, currentHostId, currentSessionId });
    
    if (!isHost || !currentHostId || !currentSessionId) {
        console.log('Cannot return to lobby:', { isHost, currentHostId, currentSessionId });
        return;
    }
    
    const returnBtn = document.getElementById('return-to-lobby-btn');
    if (!returnBtn) {
        console.error('Return to lobby button not found');
        return;
    }
    
    returnBtn.disabled = true;
    
    // Send via WebSocket if connected, otherwise via API
    if (websocketClient && websocketClient.ws && websocketClient.ws.readyState === WebSocket.OPEN) {
        console.log('Sending return to lobby via WebSocket');
        websocketClient.sendReturnToLobby();
        // Note: Button will be re-enabled when handleReturnToLobby is called via WebSocket message
    } else {
        console.log('Sending return to lobby via API');
        apiClient.returnToLobby(currentSessionId, currentHostId).then(() => {
            // Will be handled via WebSocket message or we need to manually handle it
            console.log('Return to lobby API call succeeded');
        }).catch(error => {
            console.error('Failed to return to lobby:', error);
            returnBtn.disabled = false;
        });
    }
}

// updateAllConnectionStatuses updates all connection status indicators
function updateAllConnectionStatuses(connected) {
    // Update game container connection status
    const indicator = document.getElementById('connection-indicator');
    const text = document.getElementById('connection-text');
    
    if (indicator && text) {
        if (connected) {
            indicator.className = 'connected';
            indicator.textContent = '●';
            text.textContent = 'Connected';
        } else {
            indicator.className = 'disconnected';
            indicator.textContent = '●';
            text.textContent = 'Disconnected';
        }
    }
    
    // Update manual container connection status
    if (currentPlayerType === 'expert') {
        manualDisplay.updateConnectionStatus(connected);
    }
}

// Legacy function for backward compatibility
function updateConnectionStatus(connected) {
    updateAllConnectionStatuses(connected);
}

