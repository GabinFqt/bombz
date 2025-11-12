// Wires module UI logic
class WiresModule {
    constructor(bomb3d, websocketClient) {
        this.bomb3d = bomb3d;
        this.websocketClient = websocketClient;
        this.currentBombState = null;
        this.previousBombState = null; // Track previous state to detect changes
        
        // Setup WebSocket callbacks
        this.websocketClient.onStateUpdate((bombState) => {
            this.updateBombState(bombState);
        });
        
        // Setup wire cut result handler for strikes
        this.websocketClient.onMessage((message) => {
            if (message.type === 'wireCutResult') {
                let result;
                if (typeof message.data === 'string') {
                    try {
                        result = JSON.parse(message.data);
                    } catch (e) {
                        console.error('Error parsing wireCutResult:', e);
                        return;
                    }
                } else {
                    result = message.data;
                }
                
                if (result && result.correct === false && result.moduleIndex !== undefined) {
                    // Show red flash for strike
                    this.bomb3d.showModuleStrike(result.moduleIndex);
                }
            }
        });
        
        // Setup wire cut handler
        window.onWireCut = (moduleIndex, wireIndex) => {
            this.cutWire(moduleIndex, wireIndex);
        };
    }
    
    updateBombState(bombState) {
        // Check for newly solved modules
        if (this.previousBombState && bombState.wiresModules && Array.isArray(bombState.wiresModules)) {
            bombState.wiresModules.forEach((module, moduleIndex) => {
                if (module && module.isSolved) {
                    const prevModule = this.previousBombState.wiresModules && 
                                     this.previousBombState.wiresModules[moduleIndex];
                    // If module just became solved, show green glow
                    if (!prevModule || !prevModule.isSolved) {
                        this.bomb3d.showModuleSuccess(moduleIndex);
                    }
                }
            });
        }
        
        this.currentBombState = bombState;
        
        // Update 3D wires display for all modules
        if (bombState.wiresModules && Array.isArray(bombState.wiresModules)) {
            this.bomb3d.updateWires(bombState.wiresModules);
            
            // Mark cut wires for all modules
            bombState.wiresModules.forEach((module, moduleIndex) => {
                if (module && module.cutWires) {
                    module.cutWires.forEach(wireIndex => {
                        this.bomb3d.markWireAsCut(moduleIndex, wireIndex);
                    });
                }
                
                // Show green glow for already solved modules
                if (module && module.isSolved) {
                    this.bomb3d.showModuleSuccess(moduleIndex);
                }
            });
        }
        
        // Update HUD
        this.updateHUD(bombState);
        
        // Store current state as previous for next update
        this.previousBombState = JSON.parse(JSON.stringify(bombState));
    }
    
    cutWire(moduleIndex, wireIndex) {
        if (!this.currentBombState) return;
        
        if (!this.currentBombState.wiresModules || !this.currentBombState.wiresModules[moduleIndex]) {
            return;
        }
        
        const module = this.currentBombState.wiresModules[moduleIndex];
        
        // Check if wire is already cut
        if (module.cutWires.includes(wireIndex)) {
            return;
        }
        
        // Check if module is already solved
        if (module.isSolved) {
            return;
        }
        
        // Send cut wire command via WebSocket
        this.websocketClient.cutWire(moduleIndex, wireIndex);
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

