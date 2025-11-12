// Manual display module for experts
class ManualDisplay {
    constructor() {
        this.currentManualContent = null;
        this.currentView = 'menu'; // 'menu' or 'detail'
        this.currentModule = null; // Track selected module key
        this.setupEventListeners();
    }

    // Setup event listeners for card clicks and back button
    setupEventListeners() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.attachListeners());
        } else {
            // Use setTimeout to ensure DOM is fully ready
            setTimeout(() => this.attachListeners(), 0);
        }
    }

    attachListeners() {
        // Module card clicks - use event delegation for better reliability
        const cardsContainer = document.getElementById('manual-module-cards');
        if (cardsContainer) {
            // Remove existing listener if any, then add new one
            cardsContainer.removeEventListener('click', this.handleCardClick);
            this.handleCardClick = (e) => {
                const card = e.target.closest('.module-card');
                if (card) {
                    const moduleKey = card.getAttribute('data-module');
                    if (moduleKey) {
                        this.showModuleDetail(moduleKey);
                    }
                }
            };
            cardsContainer.addEventListener('click', this.handleCardClick);
        }

        // Back button
        const backButton = document.getElementById('manual-back-button');
        if (backButton) {
            // Remove existing listener if any, then add new one
            backButton.removeEventListener('click', this.handleBackClick);
            this.handleBackClick = () => {
                this.handleBackButton();
            };
            backButton.addEventListener('click', this.handleBackClick);
        }
    }

    // Render manual content received from backend
    renderManualContent(manualContent) {
        this.currentManualContent = manualContent;
        
        // Update session ID
        const sessionIdElement = document.getElementById('manual-session-id');
        if (sessionIdElement && currentSessionId) {
            sessionIdElement.textContent = currentSessionId;
        }

        // If we're on menu view, just show menu (content is stored for when user clicks)
        // If we're on detail view, render the current module
        if (this.currentView === 'menu') {
            this.showMenuView();
        } else if (this.currentModule) {
            this.showModuleDetail(this.currentModule);
        }
    }

    // Show menu view with module cards
    showMenuView() {
        this.currentView = 'menu';
        this.currentModule = null;
        
        const menuView = document.getElementById('manual-menu-view');
        const detailView = document.getElementById('manual-detail-view');
        
        if (menuView) menuView.style.display = 'block';
        if (detailView) detailView.style.display = 'none';
        
        // Re-attach listeners in case DOM was recreated
        this.attachListeners();
    }

    // Show detail view for a specific module
    showModuleDetail(moduleKey) {
        this.currentView = 'detail';
        this.currentModule = moduleKey;
        
        const menuView = document.getElementById('manual-menu-view');
        const detailView = document.getElementById('manual-detail-view');
        
        if (menuView) menuView.style.display = 'none';
        if (detailView) detailView.style.display = 'block';
        
        // Hide all module sections first
        const wiresSection = document.getElementById('manual-wires-section');
        const buttonsSection = document.getElementById('manual-buttons-section');
        const terminalSection = document.getElementById('manual-terminal-section');
        
        if (wiresSection) wiresSection.style.display = 'none';
        if (buttonsSection) buttonsSection.style.display = 'none';
        if (terminalSection) terminalSection.style.display = 'none';
        
        // Render the selected module
        if (!this.currentManualContent) {
            return;
        }
        
        if (moduleKey === 'wireModule' && this.currentManualContent.wireModule) {
            this.renderWireModuleManual(this.currentManualContent.wireModule);
            if (wiresSection) wiresSection.style.display = 'block';
            const titleElement = document.getElementById('manual-title');
            if (titleElement) titleElement.textContent = 'Bombz Manual - Wires Module';
        } else if (moduleKey === 'buttonModule' && this.currentManualContent.modules && this.currentManualContent.modules['buttonModule']) {
            this.renderButtonModuleManual(this.currentManualContent.modules['buttonModule'], 'Button Module');
            if (buttonsSection) buttonsSection.style.display = 'block';
            const titleElement = document.getElementById('manual-title');
            if (titleElement) titleElement.textContent = 'Bombz Manual - Button Module';
        } else if (moduleKey === 'terminalModule' && this.currentManualContent.modules && this.currentManualContent.modules['terminalModule']) {
            this.renderTerminalModuleManual(this.currentManualContent.modules['terminalModule'], 'Terminal Module');
            if (terminalSection) terminalSection.style.display = 'block';
            const titleElement = document.getElementById('manual-title');
            if (titleElement) titleElement.textContent = 'Bombz Manual - Terminal Module';
        }
    }

    // Handle back button click
    handleBackButton() {
        this.showMenuView();
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
        const buttonSection = document.getElementById('manual-buttons-section');
        if (!buttonSection) {
            return;
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
            // Always start with menu view
            this.showMenuView();
        }
    }

    // Hide manual container
    hide() {
        const container = document.getElementById('manual-container');
        if (container) {
            container.style.display = 'none';
        }
    }
    
    // Render terminal module manual rules
    renderTerminalModuleManual(terminalModule, moduleTitle) {
        const terminalSection = document.getElementById('manual-terminal-section');
        if (!terminalSection) {
            return;
        }
        
        // Clear existing content
        terminalSection.innerHTML = '';
        
        // Add title
        const titleElement = document.createElement('h2');
        titleElement.textContent = moduleTitle || 'Terminal Module Rules';
        terminalSection.appendChild(titleElement);
        
        const rulesContainer = document.createElement('div');
        rulesContainer.className = 'terminal-rules';
        
        // Render rules
        if (terminalModule.rules && Array.isArray(terminalModule.rules)) {
            terminalModule.rules.forEach(rule => {
                if (!rule.description || rule.description.trim() === '') {
                    return; // Skip empty rules
                }
                
                const ruleDiv = document.createElement('div');
                ruleDiv.className = 'rule';
                ruleDiv.innerHTML = `<span class="rule-number">Rule ${rule.number}:</span> ${rule.description}`;
                rulesContainer.appendChild(ruleDiv);
            });
        }
        
        terminalSection.appendChild(rulesContainer);
        
        // Render instructions if available
        if (terminalModule.instructions) {
            const instructionsDiv = document.createElement('div');
            instructionsDiv.className = 'terminal-instructions';
            instructionsDiv.style.marginTop = '15px';
            instructionsDiv.textContent = terminalModule.instructions;
            terminalSection.appendChild(instructionsDiv);
        }
        
        // Render command words if available
        if (terminalModule.moduleData && terminalModule.moduleData.commandWords) {
            const commandWordsDiv = document.createElement('div');
            commandWordsDiv.className = 'terminal-command-words';
            commandWordsDiv.style.marginTop = '15px';
            commandWordsDiv.style.fontWeight = 'bold';
            commandWordsDiv.textContent = 'Available command words: ' + terminalModule.moduleData.commandWords.join(', ');
            terminalSection.appendChild(commandWordsDiv);
        }
    }
}

// Create global instance
const manualDisplay = new ManualDisplay();

