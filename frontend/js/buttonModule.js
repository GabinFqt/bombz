// Button module UI logic
class ButtonModule {
    constructor(bomb3d, websocketClient) {
        this.bomb3d = bomb3d;
        this.websocketClient = websocketClient;
        this.currentBombState = null;
        this.previousBombState = null; // Track previous state to detect changes
        
        // Setup WebSocket callbacks
        this.websocketClient.onStateUpdate((bombState) => {
            this.updateBombState(bombState);
        });
        
        // Setup button action result handler for strikes
        this.websocketClient.onMessage((message) => {
            if (message.type === 'buttonActionResult') {
                let result;
                if (typeof message.data === 'string') {
                    try {
                        result = JSON.parse(message.data);
                    } catch (e) {
                        console.error('Error parsing buttonActionResult:', e);
                        return;
                    }
                } else {
                    result = message.data;
                }
                
                if (result && result.correct === false && result.moduleIndex !== undefined) {
                    // Show red flash for strike
                    // Note: moduleIndex needs to account for both wire and button modules
                    // We'll need to calculate the actual 3D module index
                    const actualModuleIndex = this.getActualModuleIndex(result.moduleIndex, 'button');
                    if (actualModuleIndex !== -1) {
                        this.bomb3d.showModuleStrike(actualModuleIndex);
                    }
                }
            }
        });
        
        // Setup button action handlers
        window.onButtonPress = (moduleIndex) => {
            this.pressButton(moduleIndex);
        };
        
        window.onButtonHold = (moduleIndex) => {
            this.holdButton(moduleIndex);
        };
        
        window.onButtonRelease = (moduleIndex) => {
            this.releaseButton(moduleIndex);
        };
    }
    
    // Calculate actual 3D module index accounting for both wire and button modules
    getActualModuleIndex(buttonModuleIndex, type) {
        if (!this.currentBombState) return -1;
        
        // Count wire modules before this button module
        const wireModuleCount = this.currentBombState.wiresModules ? this.currentBombState.wiresModules.length : 0;
        
        if (type === 'button') {
            return wireModuleCount + buttonModuleIndex;
        } else {
            return buttonModuleIndex;
        }
    }
    
    updateBombState(bombState) {
        // Check for newly solved button modules
        if (this.previousBombState && bombState.buttonModules && Array.isArray(bombState.buttonModules)) {
            bombState.buttonModules.forEach((module, moduleIndex) => {
                if (module && module.isSolved) {
                    const prevModule = this.previousBombState.buttonModules && 
                                     this.previousBombState.buttonModules[moduleIndex];
                    // If module just became solved, show green glow
                    if (!prevModule || !prevModule.isSolved) {
                        const actualModuleIndex = this.getActualModuleIndex(moduleIndex, 'button');
                        if (actualModuleIndex !== -1) {
                            this.bomb3d.showModuleSuccess(actualModuleIndex);
                        }
                    }
                }
            });
        }
        
        this.currentBombState = bombState;
        
        // Update 3D buttons display for all modules
        if (bombState.buttonModules && Array.isArray(bombState.buttonModules)) {
            this.bomb3d.updateButtons(bombState.buttonModules);
            
            // Show green glow for already solved modules
            bombState.buttonModules.forEach((module, moduleIndex) => {
                if (module && module.isSolved) {
                    const actualModuleIndex = this.getActualModuleIndex(moduleIndex, 'button');
                    if (actualModuleIndex !== -1) {
                        this.bomb3d.showModuleSuccess(actualModuleIndex);
                    }
                }
            });
        }
        
        // Update HUD (shared with wires module, but we call it here too)
        this.updateHUD(bombState);
        
        // Store current state as previous for next update
        this.previousBombState = JSON.parse(JSON.stringify(bombState));
    }
    
    pressButton(buttonModuleIndex) {
        if (!this.currentBombState) return;
        
        if (!this.currentBombState.buttonModules || !this.currentBombState.buttonModules[buttonModuleIndex]) {
            return;
        }
        
        const module = this.currentBombState.buttonModules[buttonModuleIndex];
        
        // Check if module is already solved
        if (module.isSolved) {
            return;
        }
        
        // Check if button is already pressed
        if (module.isPressed) {
            return;
        }
        
        // Send press button command via WebSocket
        this.websocketClient.pressButton(buttonModuleIndex);
    }
    
    holdButton(buttonModuleIndex) {
        if (!this.currentBombState) return;
        
        if (!this.currentBombState.buttonModules || !this.currentBombState.buttonModules[buttonModuleIndex]) {
            return;
        }
        
        const module = this.currentBombState.buttonModules[buttonModuleIndex];
        
        // Check if module is already solved
        if (module.isSolved) {
            return;
        }
        
        // Check if button is pressed
        if (!module.isPressed) {
            return;
        }
        
        // Send hold button command via WebSocket (called periodically while holding)
        this.websocketClient.holdButton(buttonModuleIndex);
    }
    
    releaseButton(buttonModuleIndex) {
        if (!this.currentBombState) return;
        
        if (!this.currentBombState.buttonModules || !this.currentBombState.buttonModules[buttonModuleIndex]) {
            return;
        }
        
        const module = this.currentBombState.buttonModules[buttonModuleIndex];
        
        // Check if module is already solved
        if (module.isSolved) {
            return;
        }
        
        // Check if button is pressed
        if (!module.isPressed) {
            return;
        }
        
        // Send release button command via WebSocket
        this.websocketClient.releaseButton(buttonModuleIndex);
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
