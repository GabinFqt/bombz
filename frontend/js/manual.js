// Manual display module for experts
class ManualDisplay {
    constructor() {
        this.currentManualContent = null;
    }

    // Render manual content received from backend
    renderManualContent(manualContent) {
        this.currentManualContent = manualContent;
        
        // Update session ID
        const sessionIdElement = document.getElementById('manual-session-id');
        if (sessionIdElement && currentSessionId) {
            sessionIdElement.textContent = currentSessionId;
        }

        // Render wire module manual
        if (manualContent.wireModule) {
            this.renderWireModuleManual(manualContent.wireModule);
        }

        // Render bomb state if available
        if (manualContent.bombState) {
            this.renderBombState(manualContent.bombState);
        }
    }

    // Render wire module manual rules and colors
    renderWireModuleManual(wireModule) {
        const rulesContainer = document.getElementById('manual-rules');
        const colorsContainer = document.getElementById('manual-wire-colors');
        const instructionsElement = document.getElementById('manual-instructions');

        if (!rulesContainer || !colorsContainer || !instructionsElement) {
            return;
        }

        // Render rules
        rulesContainer.innerHTML = '';
        if (wireModule.rules && Array.isArray(wireModule.rules)) {
            wireModule.rules.forEach(rule => {
                const ruleDiv = document.createElement('div');
                ruleDiv.className = 'rule';
                ruleDiv.innerHTML = `<span class="rule-number">Rule ${rule.number}:</span> ${rule.description}`;
                rulesContainer.appendChild(ruleDiv);
            });
        }

        // Render wire colors
        colorsContainer.innerHTML = '';
        if (wireModule.wireColors && Array.isArray(wireModule.wireColors)) {
            wireModule.wireColors.forEach(color => {
                const colorSpan = document.createElement('span');
                colorSpan.className = `wire-color ${color}`;
                colorSpan.title = color.charAt(0).toUpperCase() + color.slice(1);
                colorsContainer.appendChild(colorSpan);
                
                const textSpan = document.createElement('span');
                textSpan.textContent = ` ${color.charAt(0).toUpperCase() + color.slice(1)}`;
                colorsContainer.appendChild(textSpan);
                
                const br = document.createElement('br');
                colorsContainer.appendChild(br);
            });
        }

        // Render instructions
        if (wireModule.instructions) {
            instructionsElement.textContent = wireModule.instructions;
        }
    }

    // Render bomb state (wire configurations)
    renderBombState(bombState) {
        const bombStatusSection = document.getElementById('manual-bomb-status-section');
        const bombStatusContainer = document.getElementById('manual-bomb-status');

        if (!bombStatusSection || !bombStatusContainer) {
            return;
        }

        bombStatusSection.style.display = 'block';
        
        let html = '';

        // Display bomb status
        if (bombState.state === 'defused') {
            html += `<h3 style="color: #4ecdc4; margin-top: 0;">🎉 Bomb Defused! 🎉</h3>`;
            html += `<p style="color: #4ecdc4; font-size: 18px;">Congratulations! The bomb has been successfully defused.</p>`;
        } else if (bombState.state === 'exploded') {
            html += `<h3 style="color: #ff6b6b; margin-top: 0;">💥 Bomb Exploded 💥</h3>`;
            html += `<p style="color: #ff6b6b; font-size: 18px;">The bomb has exploded. Game over.</p>`;
        } else {
            html += `<p style="color: #4ecdc4;">Bomb is active. Guide the defuser through the modules.</p>`;
            
            // Display time remaining
            const minutes = Math.floor(bombState.timeRemaining / 60);
            const seconds = bombState.timeRemaining % 60;
            html += `<p><strong>Time Remaining:</strong> ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</p>`;
            
            // Display strikes
            html += `<p><strong>Strikes:</strong> ${bombState.strikes} / ${bombState.maxStrikes}</p>`;

            // Display wire modules
            if (bombState.wiresModules && Array.isArray(bombState.wiresModules)) {
                html += '<h3 style="margin-top: 20px; color: #4ecdc4;">Wire Modules</h3>';
                bombState.wiresModules.forEach((module, index) => {
                    html += this.renderWireModule(module, index);
                });
            }
        }

        bombStatusContainer.innerHTML = html;
    }

    // Render a single wire module
    renderWireModule(module, index) {
        let html = `<div class="wire-module-display">`;
        html += `<h3>Module ${index + 1} ${module.isSolved ? '(Solved ✓)' : '(Active)'}</h3>`;
        
        if (module.wires && Array.isArray(module.wires)) {
            html += '<div class="wire-list">';
            module.wires.forEach((wireColor, wireIndex) => {
                const isCut = module.cutWires && module.cutWires.includes(wireIndex);
                html += `<span class="wire-color ${wireColor}" style="opacity: ${isCut ? '0.3' : '1'}; text-decoration: ${isCut ? 'line-through' : 'none'};" title="Wire ${wireIndex + 1}: ${wireColor}${isCut ? ' (cut)' : ''}"></span>`;
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    // Update connection status
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('manual-connection-status');
        if (statusElement) {
            statusElement.textContent = connected ? 'Connected' : 'Disconnected';
            statusElement.style.color = connected ? '#4ecdc4' : '#ff6b6b';
        }
    }

    // Show manual container
    show() {
        const container = document.getElementById('manual-container');
        if (container) {
            container.style.display = 'block';
        }
    }

    // Hide manual container
    hide() {
        const container = document.getElementById('manual-container');
        if (container) {
            container.style.display = 'none';
        }
    }
}

// Create global instance
const manualDisplay = new ManualDisplay();

