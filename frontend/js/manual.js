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

        if (!rulesContainer) {
            return;
        }
        
        // Hide wire colors and instructions sections
        if (colorsContainer) {
            colorsContainer.parentElement.style.display = 'none';
        }
        if (instructionsElement) {
            instructionsElement.parentElement.style.display = 'none';
        }

        // Render rules with visual input/output linking
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
                
                // Check if it's a section header (starts with ===)
                if (rule.description.startsWith('===')) {
                    const sectionDiv = document.createElement('div');
                    sectionDiv.className = 'rule-section-header';
                    sectionDiv.style.fontWeight = 'bold';
                    sectionDiv.style.fontSize = '1.2em';
                    sectionDiv.style.marginTop = '20px';
                    sectionDiv.style.marginBottom = '10px';
                    sectionDiv.style.color = '#4ecdc4';
                    sectionDiv.textContent = rule.description;
                    rulesContainer.appendChild(sectionDiv);
                    return;
                }
                
                // Parse wire rule to extract condition and action
                let condition = '';
                let action = '';
                
                // Check for "For X wires, otherwise" format
                const forMatch = rule.description.match(/For (\d+) wires, otherwise cut the (.+?)\./);
                if (forMatch) {
                    condition = `For ${forMatch[1]} wires, otherwise`;
                    action = `cut the ${forMatch[2]} wire`;
                }
                // Check for "If {condition}, {action}." format
                else if (rule.description.startsWith('If ')) {
                    const ifMatch = rule.description.match(/If (.+?), (.+?)\./);
                    if (ifMatch) {
                        condition = `If ${ifMatch[1]}`;
                        action = ifMatch[2];
                    }
                }
                // Check for "Otherwise, cut the {position} one." format
                else if (rule.description.startsWith('Otherwise')) {
                    const otherwiseMatch = rule.description.match(/Otherwise, cut the (.+?)\./);
                    if (otherwiseMatch) {
                        condition = 'Otherwise';
                        action = `cut the ${otherwiseMatch[1]} wire`;
                    }
                }
                
                // If parsing failed, use full description
                if (!condition && !action) {
                    condition = rule.description;
                    action = '';
                }
                
                // Create visual rule card
                const ruleCard = document.createElement('div');
                ruleCard.className = 'wire-rule-card';
                
                // Rule number badge
                const ruleNumberBadge = document.createElement('div');
                ruleNumberBadge.className = 'wire-rule-number';
                ruleNumberBadge.textContent = `#${rule.number}`;
                ruleCard.appendChild(ruleNumberBadge);
                
                // Phrase display with condition and action
                const phraseDisplay = document.createElement('div');
                phraseDisplay.className = 'wire-phrase-display';
                
                const conditionSpan = document.createElement('span');
                conditionSpan.className = 'wire-condition-text';
                conditionSpan.textContent = condition;
                phraseDisplay.appendChild(conditionSpan);
                
                if (action) {
                    const actionSpan = document.createElement('span');
                    actionSpan.className = 'wire-action-text';
                    actionSpan.textContent = `, ${action}`;
                    phraseDisplay.appendChild(actionSpan);
                }
                
                ruleCard.appendChild(phraseDisplay);
                rulesContainer.appendChild(ruleCard);
            });
        }

        // Add description at the beginning
        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'module-description';
        descriptionDiv.textContent = 'Look at the wire configuration and find the matching condition. Follow the rule to determine which wire to cut.';
        rulesContainer.insertBefore(descriptionDiv, rulesContainer.firstChild);
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
        
        // Render rules with visual input/output linking
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
                    return;
                }
                
                // Parse button rule to extract condition and action
                let condition = '';
                let action = '';
                
                // Check for gauge color rule format: "If gauge shows {color}, release when timer's last digit is {digit}."
                const gaugeMatch = rule.description.match(/If gauge shows (.+?), release when timer's last digit is (\d+)\./);
                if (gaugeMatch) {
                    condition = `If gauge shows ${gaugeMatch[1]}`;
                    action = `release when timer's last digit is ${gaugeMatch[2]}`;
                }
                // Check for button condition format: "If {button text and color}, {action}."
                else if (rule.description.startsWith('If ')) {
                    const ifMatch = rule.description.match(/If (.+?), (.+?)\./);
                    if (ifMatch) {
                        condition = `If ${ifMatch[1]}`;
                        action = ifMatch[2];
                    }
                }
                // Check for "Otherwise" format
                else if (rule.description.startsWith('Otherwise')) {
                    const otherwiseMatch = rule.description.match(/Otherwise, (.+?)\./);
                    if (otherwiseMatch) {
                        condition = 'Otherwise';
                        action = otherwiseMatch[1];
                    }
                }
                
                // If parsing failed, use full description
                if (!condition && !action) {
                    condition = rule.description;
                    action = '';
                }
                
                // Create visual rule card
                const ruleCard = document.createElement('div');
                ruleCard.className = 'button-rule-card';
                
                // Rule number badge
                const ruleNumberBadge = document.createElement('div');
                ruleNumberBadge.className = 'button-rule-number';
                ruleNumberBadge.textContent = `#${rule.number}`;
                ruleCard.appendChild(ruleNumberBadge);
                
                // Phrase display with condition and action
                const phraseDisplay = document.createElement('div');
                phraseDisplay.className = 'button-phrase-display';
                
                const conditionSpan = document.createElement('span');
                conditionSpan.className = 'button-condition-text';
                conditionSpan.textContent = condition;
                phraseDisplay.appendChild(conditionSpan);
                
                if (action) {
                    const actionSpan = document.createElement('span');
                    actionSpan.className = 'button-action-text';
                    actionSpan.textContent = `, ${action}`;
                    phraseDisplay.appendChild(actionSpan);
                }
                
                ruleCard.appendChild(phraseDisplay);
                rulesContainer.appendChild(ruleCard);
            });
        }
        
        // Add description at the beginning
        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'module-description';
        descriptionDiv.textContent = 'Check the button text and color to determine if you should press immediately or hold. If holding, wait for the gauge color and follow the timer digit rule.';
        rulesContainer.insertBefore(descriptionDiv, rulesContainer.firstChild);
        
        buttonSection.appendChild(rulesContainer);
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
        
        // Render rules with visual input/output linking
        if (terminalModule.rules && Array.isArray(terminalModule.rules)) {
            terminalModule.rules.forEach(rule => {
                if (!rule.description || rule.description.trim() === '') {
                    return; // Skip empty rules
                }
                
                // Parse the rule description to extract terminal text and command
                // Format: "If terminal says \"{terminalText}\", type {command}."
                const match = rule.description.match(/If terminal says "([^"]+)", type ([^.]+)\./);
                
                if (match) {
                    const terminalText = match[1];
                    const command = match[2];
                    
                    // Create a visual rule card linking input to output
                    const ruleCard = document.createElement('div');
                    ruleCard.className = 'terminal-rule-card';
                    
                    // Rule number badge
                    const ruleNumberBadge = document.createElement('div');
                    ruleNumberBadge.className = 'terminal-rule-number';
                    ruleNumberBadge.textContent = `#${rule.number}`;
                    ruleCard.appendChild(ruleNumberBadge);
                    
                    // Input/output container
                    const ioContainer = document.createElement('div');
                    ioContainer.className = 'terminal-io-container';
                    
                    // Terminal input (left side)
                    const terminalInput = document.createElement('div');
                    terminalInput.className = 'terminal-input-display';
                    const terminalPrompt = document.createElement('span');
                    terminalPrompt.className = 'terminal-prompt';
                    terminalPrompt.textContent = terminalText;
                    terminalInput.appendChild(terminalPrompt);
                    ioContainer.appendChild(terminalInput);
                    
                    // Arrow connector
                    const arrow = document.createElement('div');
                    arrow.className = 'terminal-arrow';
                    arrow.textContent = '→';
                    ioContainer.appendChild(arrow);
                    
                    // Command output (right side)
                    const commandOutput = document.createElement('div');
                    commandOutput.className = 'terminal-command-display';
                    const commandText = document.createElement('code');
                    commandText.className = 'terminal-command-text';
                    commandText.textContent = command;
                    commandOutput.appendChild(commandText);
                    ioContainer.appendChild(commandOutput);
                    
                    ruleCard.appendChild(ioContainer);
                    rulesContainer.appendChild(ruleCard);
                } else {
                    // Fallback to old format if parsing fails
                    const ruleDiv = document.createElement('div');
                    ruleDiv.className = 'rule';
                    ruleDiv.innerHTML = `<span class="rule-number">Rule ${rule.number}:</span> ${rule.description}`;
                    rulesContainer.appendChild(ruleDiv);
                }
            });
        }
        
        // Add description at the beginning
        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'module-description';
        descriptionDiv.textContent = 'Look at the terminal prompt displayed and find the matching rule. Type the corresponding command to proceed.';
        rulesContainer.insertBefore(descriptionDiv, rulesContainer.firstChild);
        
        terminalSection.appendChild(rulesContainer);
    }
}

// Create global instance
const manualDisplay = new ManualDisplay();

