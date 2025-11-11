// Wires module UI logic
class WiresModule {
    constructor(bomb3d, websocketClient) {
        this.bomb3d = bomb3d;
        this.websocketClient = websocketClient;
        this.currentBombState = null;
        
        // Setup WebSocket callbacks
        this.websocketClient.onStateUpdate((bombState) => {
            this.updateBombState(bombState);
        });
        
        // Setup wire cut handler
        window.onWireCut = (moduleIndex, wireIndex) => {
            this.cutWire(moduleIndex, wireIndex);
        };
    }
    
    updateBombState(bombState) {
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
            });
        }
        
        // Update HUD
        this.updateHUD(bombState);
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

