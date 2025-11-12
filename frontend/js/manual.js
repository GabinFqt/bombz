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
        
        // Render single button module manual from modules map
        if (manualContent.modules && manualContent.modules['buttonModule']) {
            this.renderButtonModuleManual(manualContent.modules['buttonModule'], 'Button Module');
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
                // Skip empty rules (used for spacing)
                if (!rule.description || rule.description.trim() === '') {
                    const spacingDiv = document.createElement('div');
                    spacingDiv.className = 'rule-spacing';
                    spacingDiv.style.height = '20px';
                    rulesContainer.appendChild(spacingDiv);
                    return;
                }
                
                const ruleDiv = document.createElement('div');
                ruleDiv.className = 'rule';
                
                // Check if it's a section header (starts with ===)
                if (rule.description.startsWith('===')) {
                    ruleDiv.className = 'rule-section-header';
                    ruleDiv.style.fontWeight = 'bold';
                    ruleDiv.style.fontSize = '1.2em';
                    ruleDiv.style.marginTop = '20px';
                    ruleDiv.style.marginBottom = '10px';
                    ruleDiv.style.color = '#4ecdc4';
                    ruleDiv.textContent = rule.description;
                } else {
                    ruleDiv.innerHTML = `<span class="rule-number">Rule ${rule.number}:</span> ${rule.description}`;
                }
                
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

    // Render button module manual rules
    renderButtonModuleManual(buttonModule, moduleTitle) {
        // Create or find container for button modules
        let buttonSection = document.getElementById('manual-buttons-section');
        if (!buttonSection) {
            buttonSection = document.createElement('div');
            buttonSection.id = 'manual-buttons-section';
            const manualContent = document.getElementById('manual-content');
            if (manualContent) {
                // Insert after wire colors section
                const wireColorsSection = document.getElementById('manual-wire-colors-section');
                if (wireColorsSection && wireColorsSection.nextSibling) {
                    manualContent.insertBefore(buttonSection, wireColorsSection.nextSibling);
                } else {
                    manualContent.appendChild(buttonSection);
                }
            }
        }
        
        // Clear existing content
        buttonSection.innerHTML = '';
        
        // Add title
        const titleElement = document.createElement('h2');
        titleElement.textContent = moduleTitle || 'Button Module Rules';
        buttonSection.appendChild(titleElement);
        
        const rulesContainer = document.createElement('div');
        rulesContainer.className = 'button-rules';
        
        // Render rules
        if (buttonModule.rules && Array.isArray(buttonModule.rules)) {
            buttonModule.rules.forEach(rule => {
                if (!rule.description || rule.description.trim() === '') {
                    return; // Skip empty rules
                }
                
                // Check if it's a section title (Number 0 indicates it's a title, not a rule)
                if (rule.number === 0) {
                    const titleElement = document.createElement('h3');
                    titleElement.className = 'rule-section-title';
                    titleElement.style.color = '#4ecdc4';
                    titleElement.style.marginTop = '30px';
                    titleElement.style.marginBottom = '15px';
                    titleElement.style.fontSize = '1.3em';
                    titleElement.style.fontWeight = 'bold';
                    titleElement.textContent = rule.description;
                    rulesContainer.appendChild(titleElement);
                } else {
                    const ruleDiv = document.createElement('div');
                    ruleDiv.className = 'rule';
                    ruleDiv.innerHTML = `<span class="rule-number">Rule ${rule.number}:</span> ${rule.description}`;
                    rulesContainer.appendChild(ruleDiv);
                }
            });
        }
        
        buttonSection.appendChild(rulesContainer);
        
        // Render instructions if available
        if (buttonModule.instructions) {
            const instructionsDiv = document.createElement('div');
            instructionsDiv.className = 'button-instructions';
            instructionsDiv.style.marginTop = '15px';
            instructionsDiv.textContent = buttonModule.instructions;
            buttonSection.appendChild(instructionsDiv);
        }
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

