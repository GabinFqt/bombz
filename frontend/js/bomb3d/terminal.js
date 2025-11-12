// Terminal creation, updates, and management
class TerminalManager {
    constructor(bombGroup, modulePanels) {
        this.bombGroup = bombGroup;
        this.modulePanels = modulePanels;
        this.terminals = []; // Array of terminal groups: terminals[moduleIndex] = terminal group for that module
        this.wireModuleCount = 0; // Number of wire modules
        this.buttonModuleCount = 0; // Number of button modules
    }
    
    setModuleCounts(wireCount, buttonCount) {
        this.wireModuleCount = wireCount || 0;
        this.buttonModuleCount = buttonCount || 0;
    }
    
    updateTerminals(terminalModules) {
        // Remove all existing terminals
        this.terminals.forEach(terminalGroup => {
            if (terminalGroup) this.bombGroup.remove(terminalGroup);
        });
        this.terminals = [];
        
        if (!terminalModules || !Array.isArray(terminalModules)) return;
        
        if (!this.modulePanels || this.modulePanels.length === 0) return;
        
        // Create terminals for each module
        terminalModules.forEach((terminalConfig, terminalModuleIndex) => {
            if (!terminalConfig) return;
            
            // Calculate actual module panel index
            // Terminals are placed after wire and button modules
            const modulePanelIndex = this.wireModuleCount + this.buttonModuleCount + terminalModuleIndex;
            const modulePanel = this.modulePanels[modulePanelIndex];
            if (!modulePanel) return;
            
            const panelCenterY = modulePanel.y;
            const panelCenterX = modulePanel.x;
            
            // Get current terminal text (based on current step)
            let currentTerminalText = "Terminal ready.";
            if (terminalConfig.terminalTexts && Array.isArray(terminalConfig.terminalTexts) && terminalConfig.terminalTexts.length > 0) {
                const step = terminalConfig.currentStep || 0;
                currentTerminalText = terminalConfig.terminalTexts[step] || terminalConfig.terminalTexts[terminalConfig.terminalTexts.length - 1];
            } else if (terminalConfig.terminalOutput) {
                currentTerminalText = terminalConfig.terminalOutput;
            }
            
            // Debug: log what we're rendering
            console.log('Creating terminal:', { 
                moduleIndex: terminalModuleIndex, 
                terminalTexts: terminalConfig.terminalTexts, 
                currentStep: terminalConfig.currentStep,
                currentTerminalText 
            });
            
            // Create terminal (center of module)
            const terminalGroup = this.createTerminal(
                currentTerminalText,
                terminalConfig.currentStep,
                terminalConfig.enteredCommands,
                terminalConfig.isSolved,
                terminalConfig.terminalTexts || [],
                panelCenterX,
                panelCenterY,
                terminalModuleIndex
            );
            this.terminals[terminalModuleIndex] = terminalGroup;
            this.bombGroup.add(terminalGroup);
        });
    }
    
    createTerminal(terminalText, currentStep, enteredCommands, isSolved, terminalTexts, xPos, yPos, moduleIndex) {
        const terminalGroup = new THREE.Group();
        
        // Terminal screen background (dark green/black terminal look)
        const screenWidth = 0.9;
        const screenHeight = 0.7;
        const screenGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);
        const screenMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            metalness: 0.3,
            roughness: 0.7,
            emissive: 0x001100, // Slight green glow
            emissiveIntensity: 0.3,
        });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.set(xPos, yPos, 0.62);
        terminalGroup.add(screen);
        
        // Create canvas for terminal text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 1024;
        canvas.height = 768;
        
        // Clear canvas with dark background
        context.fillStyle = '#0a0a0a';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw terminal text (monospace font) - larger font for visibility
        context.font = 'bold 48px "Courier New", monospace';
        context.fillStyle = '#00ff00'; // Green terminal text
        context.textAlign = 'left';
        context.textBaseline = 'top';
        
        let yOffset = 60;
        const lineHeight = 60;
        
        // Draw current terminal text
        if (terminalText) {
            context.fillStyle = '#00ff00';
            const lines = terminalText.split('\n');
            lines.forEach(line => {
                if (line.trim()) { // Only draw non-empty lines
                    context.fillText(line, 30, yOffset);
                    yOffset += lineHeight;
                }
            });
        } else {
            // Fallback: show default text if terminalText is missing
            context.fillStyle = '#00ff00';
            context.fillText('Terminal ready.', 30, yOffset);
            yOffset += lineHeight;
        }
        
            // Draw entered commands
            if (enteredCommands && enteredCommands.length > 0) {
                yOffset += lineHeight;
                enteredCommands.forEach((cmd, index) => {
                    context.fillStyle = index < currentStep ? '#00ff00' : '#888888'; // Green for completed, gray for pending
                    context.fillText(`> ${cmd}`, 30, yOffset);
                    yOffset += lineHeight;
                });
            }
            
            // Draw current prompt
            if (!isSolved) {
                yOffset += lineHeight;
                context.fillStyle = '#00ff00';
                const prompt = `Command ${currentStep + 1}/3:`;
                context.fillText(prompt, 30, yOffset);
                yOffset += lineHeight;
                // Draw cursor
                context.fillStyle = '#00ff00';
                context.fillRect(30, yOffset - 5, 30, 4);
            } else {
                yOffset += lineHeight;
                context.fillStyle = '#00ff00';
                context.fillText('All commands executed successfully.', 30, yOffset);
            }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        // Create plane with terminal text texture - make it slightly larger for better visibility
        const textGeometry = new THREE.PlaneGeometry(screenWidth * 0.98, screenHeight * 0.98);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide,
        });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        // Position text slightly in front of the screen
        textMesh.position.set(xPos, yPos, 0.625);
        terminalGroup.add(textMesh);
        
        // Debug: log terminal text to console
        console.log('Terminal created:', { terminalText, currentStep, terminalTexts, moduleIndex });
        
        // Store data for later updates
        terminalGroup.userData = {
            terminalText,
            terminalTexts,
            currentStep,
            enteredCommands,
            isSolved,
            moduleIndex,
            screenMesh: screen,
            textMesh: textMesh,
            canvas: canvas,
            context: context,
        };
        
        return terminalGroup;
    }
    
    updateTerminalState(moduleIndex, terminalTexts, currentStep, enteredCommands, isSolved) {
        if (this.terminals[moduleIndex]) {
            const terminalGroup = this.terminals[moduleIndex];
            const context = terminalGroup.userData.context;
            const canvas = terminalGroup.userData.canvas;
            
            // Get current terminal text based on step
            let currentTerminalText = "Terminal ready.";
            if (terminalTexts && Array.isArray(terminalTexts) && terminalTexts.length > 0) {
                const step = currentStep || 0;
                currentTerminalText = terminalTexts[step] || terminalTexts[terminalTexts.length - 1];
            }
            
            // Debug: log update
            console.log('Updating terminal:', { moduleIndex, terminalTexts, currentStep, currentTerminalText });
            
            // Clear canvas
            context.fillStyle = '#0a0a0a';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Redraw terminal content
            context.font = 'bold 48px "Courier New", monospace';
            context.fillStyle = '#00ff00';
            context.textAlign = 'left';
            context.textBaseline = 'top';
            
            let yOffset = 60;
            const lineHeight = 60;
            
            // Draw current terminal text
            if (currentTerminalText) {
                context.fillStyle = '#00ff00';
                const lines = currentTerminalText.split('\n');
                lines.forEach(line => {
                    if (line.trim()) { // Only draw non-empty lines
                        context.fillText(line, 30, yOffset);
                        yOffset += lineHeight;
                    }
                });
            } else {
                // Fallback: show default text if currentTerminalText is missing
                context.fillStyle = '#00ff00';
                context.fillText('Terminal ready.', 30, yOffset);
                yOffset += lineHeight;
            }
            
            // Draw entered commands
            if (enteredCommands && enteredCommands.length > 0) {
                yOffset += lineHeight;
                enteredCommands.forEach((cmd, index) => {
                    context.fillStyle = index < currentStep ? '#00ff00' : '#888888';
                    context.fillText(`> ${cmd}`, 30, yOffset);
                    yOffset += lineHeight;
                });
            }
            
            // Draw current prompt
            if (!isSolved) {
                yOffset += lineHeight;
                context.fillStyle = '#00ff00';
                const prompt = `Command ${currentStep + 1}/3:`;
                context.fillText(prompt, 30, yOffset);
                yOffset += lineHeight;
                // Draw cursor
                context.fillStyle = '#00ff00';
                context.fillRect(30, yOffset - 5, 30, 4);
            } else {
                yOffset += lineHeight;
                context.fillStyle = '#00ff00';
                context.fillText('All commands executed successfully.', 30, yOffset);
            }
            
            // Update texture - force update
            const texture = terminalGroup.userData.textMesh.material.map;
            texture.needsUpdate = true;
            // Force render update
            terminalGroup.userData.textMesh.material.needsUpdate = true;
            
            // Update stored data
            terminalGroup.userData.terminalText = currentTerminalText;
            terminalGroup.userData.terminalTexts = terminalTexts;
            terminalGroup.userData.currentStep = currentStep;
            terminalGroup.userData.enteredCommands = enteredCommands;
            terminalGroup.userData.isSolved = isSolved;
        }
    }
}

