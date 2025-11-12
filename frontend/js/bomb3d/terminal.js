// Terminal creation, updates, and management
class TerminalManager {
    constructor(bombGroup, modulePanels, camera, container) {
        this.bombGroup = bombGroup;
        this.modulePanels = modulePanels;
        this.camera = camera;
        this.container = container;
        this.terminals = []; // Array of terminal groups: terminals[moduleIndex] = terminal group for that module
        this.wireModuleCount = 0; // Number of wire modules
        this.buttonModuleCount = 0; // Number of button modules
        this.activeTerminalIndex = null; // Currently active terminal for input
        this.currentInputText = ''; // Current text being typed
        this.commandResponses = {}; // Store responses per terminal: { moduleIndex: [response1, response2, ...] }
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
            // This MUST match what's in the manual for this module
            let currentTerminalText = "Terminal ready.";
            if (terminalConfig.terminalTexts && Array.isArray(terminalConfig.terminalTexts) && terminalConfig.terminalTexts.length > 0) {
                const step = terminalConfig.currentStep || 0;
                // Always use terminalTexts[currentStep] to match the manual
                if (step < terminalConfig.terminalTexts.length) {
                    currentTerminalText = terminalConfig.terminalTexts[step];
                } else {
                    // Fallback to last text if step is out of bounds
                    currentTerminalText = terminalConfig.terminalTexts[terminalConfig.terminalTexts.length - 1];
                }
            } else if (terminalConfig.terminalOutput) {
                currentTerminalText = terminalConfig.terminalOutput;
            }
            
            // Debug: log what we're rendering (only in development)
            // console.log('Creating terminal:', { 
            //     moduleIndex: terminalModuleIndex, 
            //     terminalTexts: terminalConfig.terminalTexts, 
            //     currentStep: terminalConfig.currentStep,
            //     currentTerminalText 
            // });
            
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
        
        // Debug: log terminal text to console (only in development)
        // console.log('Terminal created:', { terminalText, currentStep, terminalTexts, moduleIndex });
        
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
                xPos: xPos,
                yPos: yPos,
            };
            
            return terminalGroup;
        }
        
        // Get terminal screen position in 2D screen coordinates
        getTerminalScreenPosition(moduleIndex) {
            if (!this.terminals[moduleIndex] || !this.camera || !this.container) {
                return null;
            }
            
            const terminalGroup = this.terminals[moduleIndex];
            const screenMesh = terminalGroup.userData.screenMesh;
            
            // Get screen dimensions in world space
            const screenWidth = 0.9;
            const screenHeight = 0.7;
            
            // Get the four corners of the screen in world space
            const corners = [
                new THREE.Vector3(-screenWidth / 2, -screenHeight / 2, 0),
                new THREE.Vector3(screenWidth / 2, -screenHeight / 2, 0),
                new THREE.Vector3(-screenWidth / 2, screenHeight / 2, 0),
                new THREE.Vector3(screenWidth / 2, screenHeight / 2, 0)
            ];
            
            // Transform corners to world space
            const worldCorners = corners.map(corner => {
                const worldCorner = corner.clone();
                screenMesh.localToWorld(worldCorner);
                return worldCorner;
            });
            
            // Project all corners to screen space
            const containerRect = this.container.getBoundingClientRect();
            const screenCorners = worldCorners.map(corner => {
                const projected = corner.clone().project(this.camera);
                return {
                    x: (projected.x * 0.5 + 0.5) * containerRect.width,
                    y: (-projected.y * 0.5 + 0.5) * containerRect.height
                };
            });
            
            // Calculate bounding box
            const minX = Math.min(...screenCorners.map(c => c.x));
            const maxX = Math.max(...screenCorners.map(c => c.x));
            const minY = Math.min(...screenCorners.map(c => c.y));
            const maxY = Math.max(...screenCorners.map(c => c.y));
            
            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        }
        
        // Show input overlay for a terminal
        showInputOverlay(moduleIndex) {
            const position = this.getTerminalScreenPosition(moduleIndex);
            if (!position) {
                console.warn('Could not get terminal position for module', moduleIndex);
                return;
            }
            
            const overlay = document.getElementById('terminal-input-overlay');
            const input = document.getElementById('terminal-input');
            
            if (!overlay || !input) {
                console.error('Terminal input overlay or input element not found');
                return;
            }
            
            this.activeTerminalIndex = moduleIndex;
            this.currentInputText = '';
            
            // Position overlay
            overlay.style.display = 'block';
            overlay.style.left = position.x + 'px';
            overlay.style.top = position.y + 'px';
            overlay.style.width = position.width + 'px';
            overlay.style.height = position.height + 'px';
            
            // Clear and focus input
            input.value = '';
            input.focus();
            
            // Update terminal canvas to show input prompt
            this.updateTerminalWithInput(moduleIndex, '');
            
            console.log('Terminal input overlay shown at:', position);
        }
        
        // Update overlay position (useful when camera moves)
        updateOverlayPosition(moduleIndex) {
            if (this.activeTerminalIndex !== moduleIndex) return;
            
            const position = this.getTerminalScreenPosition(moduleIndex);
            if (!position) return;
            
            const overlay = document.getElementById('terminal-input-overlay');
            if (!overlay) return;
            
            overlay.style.left = position.x + 'px';
            overlay.style.top = position.y + 'px';
            overlay.style.width = position.width + 'px';
            overlay.style.height = position.height + 'px';
        }
        
        // Hide input overlay
        hideInputOverlay() {
            const overlay = document.getElementById('terminal-input-overlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
            
            if (this.activeTerminalIndex !== null) {
                // Clear input text from terminal display
                this.updateTerminalWithInput(this.activeTerminalIndex, null);
            }
            
            this.activeTerminalIndex = null;
            this.currentInputText = '';
        }
        
        // Update terminal canvas with current input text
        updateTerminalWithInput(moduleIndex, inputText) {
            // If this is the active terminal, preserve/update input text
            if (this.activeTerminalIndex === moduleIndex) {
                if (inputText !== null && inputText !== undefined) {
                    // Update with provided text
                    this.currentInputText = inputText;
                } else {
                    // Preserve current input from HTML element if no text provided
                    const input = document.getElementById('terminal-input');
                    if (input) {
                        this.currentInputText = input.value;
                    } else {
                        this.currentInputText = '';
                    }
                }
            } else {
                // Not the active terminal - clear input text
                this.currentInputText = '';
            }
            
            if (!this.terminals[moduleIndex]) return;
            
            const terminalGroup = this.terminals[moduleIndex];
            const context = terminalGroup.userData.context;
            const canvas = terminalGroup.userData.canvas;
            
            // Get current state
            const terminalText = terminalGroup.userData.terminalText;
            const terminalTexts = terminalGroup.userData.terminalTexts;
            const currentStep = terminalGroup.userData.currentStep;
            const enteredCommands = terminalGroup.userData.enteredCommands || [];
            const isSolved = terminalGroup.userData.isSolved;
            const responses = this.commandResponses[moduleIndex] || [];
            
            // Get current terminal text based on step
            let currentTerminalText = "Terminal ready.";
            if (terminalTexts && Array.isArray(terminalTexts) && terminalTexts.length > 0) {
                const step = currentStep || 0;
                currentTerminalText = terminalTexts[step] || terminalTexts[terminalTexts.length - 1];
            } else if (terminalText) {
                currentTerminalText = terminalText;
            }
            
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
                    if (line.trim()) {
                        context.fillText(line, 30, yOffset);
                        yOffset += lineHeight;
                    }
                });
            } else {
                context.fillStyle = '#00ff00';
                context.fillText('Terminal ready.', 30, yOffset);
                yOffset += lineHeight;
            }
            
            // Draw command responses
            if (responses.length > 0) {
                yOffset += lineHeight;
                responses.forEach(response => {
                    context.fillStyle = response.correct ? '#00ff00' : '#ff6b6b';
                    const lines = response.text.split('\n');
                    lines.forEach(line => {
                        if (line.trim()) {
                            context.fillText(line, 30, yOffset);
                            yOffset += lineHeight;
                        }
                    });
                });
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
            
            // Draw current prompt and input
            if (!isSolved) {
                yOffset += lineHeight;
                context.fillStyle = '#00ff00';
                const prompt = `Command ${currentStep + 1}/3:`;
                context.fillText(prompt, 30, yOffset);
                yOffset += lineHeight;
                
                // Draw current input text if active
                if (this.activeTerminalIndex === moduleIndex && this.currentInputText !== null) {
                    context.fillStyle = '#00ff00';
                    context.fillText(`> ${this.currentInputText}`, 30, yOffset);
                    yOffset += lineHeight;
                    // Draw cursor
                    const textWidth = context.measureText(`> ${this.currentInputText}`).width;
                    context.fillStyle = '#00ff00';
                    context.fillRect(30 + textWidth, yOffset - 5, 30, 4);
                } else {
                    // Draw cursor
                    context.fillStyle = '#00ff00';
                    context.fillRect(30, yOffset - 5, 30, 4);
                }
            } else {
                yOffset += lineHeight;
                context.fillStyle = '#00ff00';
                context.fillText('All commands executed successfully.', 30, yOffset);
            }
            
            // Update texture
            const texture = terminalGroup.userData.textMesh.material.map;
            texture.needsUpdate = true;
            terminalGroup.userData.textMesh.material.needsUpdate = true;
        }
        
        // Add command response to terminal display
        addCommandResponse(moduleIndex, command, correct) {
            if (!this.commandResponses[moduleIndex]) {
                this.commandResponses[moduleIndex] = [];
            }
            
            const responseText = correct 
                ? `> ${command}\nCommand accepted.`
                : `> ${command}\nError: Invalid command.`;
            
            this.commandResponses[moduleIndex].push({
                command: command,
                correct: correct,
                text: responseText
            });
            
            // Update terminal display
            this.updateTerminalWithInput(moduleIndex, null);
        }
    
    updateTerminalState(moduleIndex, terminalTexts, currentStep, enteredCommands, isSolved) {
        if (this.terminals[moduleIndex]) {
            const terminalGroup = this.terminals[moduleIndex];
            
            // Update stored data
            const terminalText = terminalGroup.userData.terminalText;
            let currentTerminalText = "Terminal ready.";
            if (terminalTexts && Array.isArray(terminalTexts) && terminalTexts.length > 0) {
                const step = currentStep || 0;
                currentTerminalText = terminalTexts[step] || terminalTexts[terminalTexts.length - 1];
            } else if (terminalText) {
                currentTerminalText = terminalText;
            }
            
            terminalGroup.userData.terminalText = currentTerminalText;
            terminalGroup.userData.terminalTexts = terminalTexts;
            terminalGroup.userData.currentStep = currentStep;
            terminalGroup.userData.enteredCommands = enteredCommands;
            terminalGroup.userData.isSolved = isSolved;
            
            // Preserve input text if this terminal is active
            let preservedInputText = null;
            if (this.activeTerminalIndex === moduleIndex) {
                const input = document.getElementById('terminal-input');
                if (input) {
                    preservedInputText = input.value;
                    this.currentInputText = preservedInputText;
                }
            }
            
            // Use the unified rendering method, preserving input text if active
            this.updateTerminalWithInput(moduleIndex, preservedInputText);
        }
    }
}

