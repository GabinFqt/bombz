// Terminal module UI logic
class TerminalModule {
    constructor(bomb3d, websocketClient) {
        this.bomb3d = bomb3d;
        this.websocketClient = websocketClient;
        this.currentBombState = null;
        this.previousBombState = null; // Track previous state to detect changes
        
        // Setup WebSocket callbacks
        this.websocketClient.onStateUpdate((bombState) => {
            this.updateBombState(bombState);
        });
        
        // Setup terminal command result handler for strikes and responses
        this.websocketClient.onMessage((message) => {
            if (message.type === 'terminalCommandResult') {
                let result;
                if (typeof message.data === 'string') {
                    try {
                        result = JSON.parse(message.data);
                    } catch (e) {
                        console.error('Error parsing terminalCommandResult:', e);
                        return;
                    }
                } else {
                    result = message.data;
                }
                
                if (result && result.moduleIndex !== undefined) {
                    const terminalModuleIndex = result.moduleIndex;
                    
                    // Display response in terminal
                    if (this.bomb3d && this.bomb3d.terminalManager) {
                        this.bomb3d.terminalManager.addCommandResponse(
                            terminalModuleIndex,
                            result.command || '',
                            result.correct === true
                        );
                    }
                    
                    // Show red flash for strike if incorrect
                    if (result.correct === false) {
                        const actualModuleIndex = this.getActualModuleIndex(terminalModuleIndex, 'terminal');
                        if (actualModuleIndex !== -1) {
                            this.bomb3d.showModuleStrike(actualModuleIndex);
                        }
                    }
                    
                    // Check if module is solved - if so, hide input overlay
                    if (this.currentBombState && 
                        this.currentBombState.terminalModules && 
                        this.currentBombState.terminalModules[terminalModuleIndex]) {
                        const module = this.currentBombState.terminalModules[terminalModuleIndex];
                        if (module.isSolved && this.bomb3d && this.bomb3d.terminalManager) {
                            // Module is solved, hide input overlay
                            this.bomb3d.terminalManager.hideInputOverlay();
                        }
                    }
                }
            }
        });
        
        // Setup terminal command handler
        window.onTerminalCommand = (moduleIndex, command) => {
            this.enterCommand(moduleIndex, command);
        };
    }
    
    // Calculate actual 3D module index accounting for wire, button, and terminal modules
    getActualModuleIndex(terminalModuleIndex, type) {
        if (!this.currentBombState) return -1;
        
        // Count wire modules before this terminal module
        const wireModuleCount = this.currentBombState.wiresModules ? this.currentBombState.wiresModules.length : 0;
        // Count button modules before this terminal module
        const buttonModuleCount = this.currentBombState.buttonModules ? this.currentBombState.buttonModules.length : 0;
        
        if (type === 'terminal') {
            return wireModuleCount + buttonModuleCount + terminalModuleIndex;
        } else {
            return terminalModuleIndex;
        }
    }
    
    updateBombState(bombState) {
        // Check for newly solved terminal modules
        if (this.previousBombState && bombState.terminalModules && Array.isArray(bombState.terminalModules)) {
            bombState.terminalModules.forEach((module, moduleIndex) => {
                if (module && module.isSolved) {
                    const prevModule = this.previousBombState.terminalModules && 
                                     this.previousBombState.terminalModules[moduleIndex];
                    // If module just became solved, show green glow
                    if (!prevModule || !prevModule.isSolved) {
                        const actualModuleIndex = this.getActualModuleIndex(moduleIndex, 'terminal');
                        if (actualModuleIndex !== -1) {
                            this.bomb3d.showModuleSuccess(actualModuleIndex);
                        }
                    }
                }
            });
        }
        
        this.currentBombState = bombState;
        
        // Update 3D terminals display for all modules
        if (bombState.terminalModules && Array.isArray(bombState.terminalModules)) {
            this.bomb3d.updateTerminals(bombState.terminalModules);
            
            // Show green glow for already solved modules and hide input overlay if solved
            bombState.terminalModules.forEach((module, moduleIndex) => {
                if (module && module.isSolved) {
                    const actualModuleIndex = this.getActualModuleIndex(moduleIndex, 'terminal');
                    if (actualModuleIndex !== -1) {
                        this.bomb3d.showModuleSuccess(actualModuleIndex);
                    }
                    // Hide input overlay if this terminal is solved and currently active
                    if (this.bomb3d && this.bomb3d.terminalManager && 
                        this.bomb3d.terminalManager.activeTerminalIndex === moduleIndex) {
                        this.bomb3d.terminalManager.hideInputOverlay();
                    }
                }
            });
        }
        
        // Update HUD (shared with other modules, but we call it here too)
        this.updateHUD(bombState);
        
        // Store current state as previous for next update
        this.previousBombState = JSON.parse(JSON.stringify(bombState));
    }
    
    enterCommand(terminalModuleIndex, command) {
        if (!this.currentBombState) return;
        
        if (!this.currentBombState.terminalModules || !this.currentBombState.terminalModules[terminalModuleIndex]) {
            return;
        }
        
        const module = this.currentBombState.terminalModules[terminalModuleIndex];
        
        // Check if module is already solved
        if (module.isSolved) {
            return;
        }
        
        // Send command via WebSocket
        this.websocketClient.enterTerminalCommand(terminalModuleIndex, command);
    }
    
    updateHUD(bombState) {
        // Update timer
        const minutes = Math.floor(bombState.timeRemaining / 60);
        const seconds = bombState.timeRemaining % 60;
        const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById('time-display').textContent = timeDisplay;
        
        // Update timer on bomb screen
        if (this.bomb3d && this.bomb3d.updateTimerDisplay) {
            this.bomb3d.updateTimerDisplay(bombState.timeRemaining);
        }
        
        // Update strikes
        document.getElementById('strikes-count').textContent = bombState.strikes;
        
        // Update game status
        const statusText = document.getElementById('status-text');
        switch (bombState.state) {
            case 'active':
                statusText.textContent = 'Active';
                statusText.style.color = '#4ecdc4';
                break;
            case 'defused':
                statusText.textContent = 'Defused!';
                statusText.style.color = '#4ecdc4';
                break;
            case 'exploded':
                statusText.textContent = 'Exploded!';
                statusText.style.color = '#ff6b6b';
                break;
        }
        
        // Update timer color based on time remaining
        const timeDisplayEl = document.getElementById('time-display');
        if (bombState.timeRemaining < Config.TIMER_WARNING_THRESHOLD) {
            timeDisplayEl.style.color = '#ff6b6b';
        } else if (bombState.timeRemaining < Config.TIMER_CRITICAL_THRESHOLD) {
            timeDisplayEl.style.color = '#ffa500';
        } else {
            timeDisplayEl.style.color = '#4ecdc4';
        }
    }
}

