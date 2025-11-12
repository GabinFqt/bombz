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
        
        // Setup drawing context
        context.font = 'bold 48px "Courier New", monospace';
        context.textAlign = 'left';
        context.textBaseline = 'top';
        
        // Get command responses for this module (if any)
        const responses = this.commandResponses[moduleIndex] || [];
        
        // Collect all lines to display
        const allLines = this.collectTerminalLines(
            terminalTexts,
            terminalText,
            responses,
            enteredCommands,
            currentStep,
            isSolved,
            null, // Not active during creation
            null, // No input during creation
            context // Pass context for text wrapping
        );
        
        const lineHeight = 60;
        const topMargin = 60;
        const bottomMargin = 60;
        const maxLines = Math.floor((canvas.height - topMargin - bottomMargin) / lineHeight);
        
        // Calculate starting line index (show only the last maxLines lines)
        let startLineIndex = 0;
        if (allLines.length > maxLines) {
            startLineIndex = allLines.length - maxLines;
        }
        
        // Draw lines starting from startLineIndex
        let yOffset = topMargin;
        for (let i = startLineIndex; i < allLines.length; i++) {
            const line = allLines[i];
            context.fillStyle = line.color;
            
            if (line.hasCursor) {
                // Draw cursor line
                if (line.text) {
                    context.fillText(line.text, 30, yOffset);
                    const textMetrics = context.measureText(line.text);
                    const textWidth = textMetrics.width;
                    // Position cursor at bottom of text
                    // With textBaseline='top', yOffset is at top of text
                    // Get actual text height from metrics
                    const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
                    const cursorY = yOffset + textHeight - 2; // Position cursor at bottom of text
                    context.fillRect(30 + textWidth, cursorY, 30, 4);
                } else {
                    // Cursor only - use font size as fallback
                    const fontHeight = 48; // Font size is 48px
                    const cursorY = yOffset + fontHeight - 2;
                    context.fillRect(30, cursorY, 30, 4);
                }
            } else if (line.text) {
                context.fillText(line.text, 30, yOffset);
            }
            
            yOffset += lineHeight;
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
            
            // Clear input
            input.value = '';
            
            // Update terminal canvas to show input prompt
            this.updateTerminalWithInput(moduleIndex, '');
            
            // Focus input with a small delay to ensure overlay is fully displayed
            // Use both setTimeout and requestAnimationFrame for better compatibility
            requestAnimationFrame(() => {
                setTimeout(() => {
                    input.focus();
                    // Select any existing text if needed
                    input.select();
                }, 50);
            });
            
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
        
        // Helper function to wrap text based on canvas width
        wrapText(context, text, maxWidth) {
            const words = text.split(' ');
            const lines = [];
            let currentLine = words[0] || '';
            
            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const testLine = currentLine + ' ' + word;
                const metrics = context.measureText(testLine);
                
                if (metrics.width > maxWidth && currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            
            // Handle case where a single word is longer than maxWidth
            if (currentLine.length > 0) {
                while (currentLine.length > 0) {
                    let testLine = currentLine;
                    let metrics = context.measureText(testLine);
                    
                    if (metrics.width <= maxWidth) {
                        lines.push(testLine);
                        break;
                    }
                    
                    // Binary search for the right length
                    let low = 0;
                    let high = currentLine.length;
                    let bestFit = '';
                    
                    while (low <= high) {
                        const mid = Math.floor((low + high) / 2);
                        const test = currentLine.substring(0, mid);
                        const testMetrics = context.measureText(test);
                        
                        if (testMetrics.width <= maxWidth) {
                            bestFit = test;
                            low = mid + 1;
                        } else {
                            high = mid - 1;
                        }
                    }
                    
                    if (bestFit.length > 0) {
                        lines.push(bestFit);
                        currentLine = currentLine.substring(bestFit.length);
                    } else {
                        // Fallback: take at least one character
                        lines.push(currentLine.substring(0, 1));
                        currentLine = currentLine.substring(1);
                    }
                }
            }
            
            return lines.length > 0 ? lines : [text];
        }
        
        // Helper function to collect all lines to display
        collectTerminalLines(terminalTexts, terminalText, responses, enteredCommands, currentStep, isSolved, activeTerminalIndex, currentInputText, context) {
            const lines = [];
            const lineHeight = 60;
            const maxTextWidth = 900; // Available width for text (canvas width 1024 - margins)
            
            // Always use initial terminal text (terminalTexts[0]) at the top
            let initialTerminalText = "Terminal ready.";
            if (terminalTexts && Array.isArray(terminalTexts) && terminalTexts.length > 0) {
                initialTerminalText = terminalTexts[0];
            } else if (terminalText) {
                initialTerminalText = terminalText;
            }
            
            // Add initial terminal text lines
            if (initialTerminalText) {
                const textLines = initialTerminalText.split('\n');
                textLines.forEach(line => {
                    if (line.trim()) {
                        // Wrap long lines
                        if (context) {
                            const wrappedLines = this.wrapText(context, line.trim(), maxTextWidth);
                            wrappedLines.forEach(wrappedLine => {
                                lines.push({ text: wrappedLine, color: '#00ff00' });
                            });
                        } else {
                            lines.push({ text: line.trim(), color: '#00ff00' });
                        }
                    }
                });
            } else {
                lines.push({ text: 'Terminal ready.', color: '#00ff00' });
            }
            
            // Add command responses and intermediate terminal texts
            if (responses.length > 0 || (enteredCommands && enteredCommands.length > 0)) {
                lines.push({ text: '', color: '#00ff00' }); // Empty line separator
                
                const numCommands = Math.max(responses.length, enteredCommands.length);
                for (let i = 0; i < numCommands; i++) {
                    if (i < responses.length) {
                        const response = responses[i];
                        const responseLines = response.text.split('\n');
                        responseLines.forEach(line => {
                            if (line.trim()) {
                                // Wrap long lines
                                if (context) {
                                    const wrappedLines = this.wrapText(context, line.trim(), maxTextWidth);
                                    wrappedLines.forEach(wrappedLine => {
                                        lines.push({ text: wrappedLine, color: response.correct ? '#00ff00' : '#ff6b6b' });
                                    });
                                } else {
                                    lines.push({ text: line.trim(), color: response.correct ? '#00ff00' : '#ff6b6b' });
                                }
                            }
                        });
                        
                        if (response.correct) {
                            // If command was correct, add the next terminal text
                            if (terminalTexts && Array.isArray(terminalTexts) && i + 1 < terminalTexts.length) {
                                lines.push({ text: '', color: '#00ff00' }); // Empty line separator
                                const nextTerminalText = terminalTexts[i + 1];
                                const textLines = nextTerminalText.split('\n');
                                textLines.forEach(line => {
                                    if (line.trim()) {
                                        // Wrap long lines
                                        if (context) {
                                            const wrappedLines = this.wrapText(context, line.trim(), maxTextWidth);
                                            wrappedLines.forEach(wrappedLine => {
                                                lines.push({ text: wrappedLine, color: '#00ff00' });
                                            });
                                        } else {
                                            lines.push({ text: line.trim(), color: '#00ff00' });
                                        }
                                    }
                                });
                            }
                        } else {
                            // If command was incorrect, re-display the current terminal text
                            if (terminalTexts && Array.isArray(terminalTexts) && currentStep < terminalTexts.length) {
                                lines.push({ text: '', color: '#00ff00' }); // Empty line separator
                                const currentTerminalText = terminalTexts[currentStep];
                                const textLines = currentTerminalText.split('\n');
                                textLines.forEach(line => {
                                    if (line.trim()) {
                                        // Wrap long lines
                                        if (context) {
                                            const wrappedLines = this.wrapText(context, line.trim(), maxTextWidth);
                                            wrappedLines.forEach(wrappedLine => {
                                                lines.push({ text: wrappedLine, color: '#00ff00' });
                                            });
                                        } else {
                                            lines.push({ text: line.trim(), color: '#00ff00' });
                                        }
                                    }
                                });
                            }
                        }
                    } else if (i < enteredCommands.length) {
                        const cmd = enteredCommands[i];
                        const cmdText = `> ${cmd}`;
                        // Wrap long command lines
                        if (context) {
                            const wrappedLines = this.wrapText(context, cmdText, maxTextWidth);
                            wrappedLines.forEach(wrappedLine => {
                                lines.push({ text: wrappedLine, color: i < currentStep ? '#00ff00' : '#888888' });
                            });
                        } else {
                            lines.push({ text: cmdText, color: i < currentStep ? '#00ff00' : '#888888' });
                        }
                    }
                }
            }
            
            // Add current prompt and input
            if (!isSolved) {
                lines.push({ text: '', color: '#00ff00' }); // Empty line separator
                const promptText = `Command ${currentStep + 1}/3:`;
                // Wrap prompt if needed
                if (context) {
                    const wrappedPrompt = this.wrapText(context, promptText, maxTextWidth);
                    wrappedPrompt.forEach(wrappedLine => {
                        lines.push({ text: wrappedLine, color: '#00ff00' });
                    });
                } else {
                    lines.push({ text: promptText, color: '#00ff00' });
                }
                
                // Add current input text if active
                if (activeTerminalIndex !== null && currentInputText !== null && currentInputText !== undefined) {
                    const inputText = `> ${currentInputText}`;
                    // Wrap input text if needed
                    if (context) {
                        const wrappedInput = this.wrapText(context, inputText, maxTextWidth);
                        wrappedInput.forEach((wrappedLine, idx) => {
                            lines.push({ text: wrappedLine, color: '#00ff00', hasCursor: idx === wrappedInput.length - 1 });
                        });
                    } else {
                        lines.push({ text: inputText, color: '#00ff00', hasCursor: true });
                    }
                } else {
                    lines.push({ text: '', color: '#00ff00', hasCursor: true }); // Cursor only
                }
            } else {
                lines.push({ text: '', color: '#00ff00' }); // Empty line separator
                const successText = 'All commands executed successfully.';
                // Wrap success message if needed
                if (context) {
                    const wrappedSuccess = this.wrapText(context, successText, maxTextWidth);
                    wrappedSuccess.forEach(wrappedLine => {
                        lines.push({ text: wrappedLine, color: '#00ff00' });
                    });
                } else {
                    lines.push({ text: successText, color: '#00ff00' });
                }
            }
            
            return lines;
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
            
            // Clear canvas
            context.fillStyle = '#0a0a0a';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Setup drawing context
            context.font = 'bold 48px "Courier New", monospace';
            context.textAlign = 'left';
            context.textBaseline = 'top';
            
            // Collect all lines to display (with context for text wrapping)
            const allLines = this.collectTerminalLines(
                terminalTexts,
                terminalText,
                responses,
                enteredCommands,
                currentStep,
                isSolved,
                this.activeTerminalIndex === moduleIndex ? moduleIndex : null,
                this.activeTerminalIndex === moduleIndex ? this.currentInputText : null,
                context // Pass context for text wrapping
            );
            
            const lineHeight = 60;
            const topMargin = 60;
            const bottomMargin = 60;
            const maxLines = Math.floor((canvas.height - topMargin - bottomMargin) / lineHeight);
            
            // Calculate starting line index (show only the last maxLines lines)
            let startLineIndex = 0;
            if (allLines.length > maxLines) {
                startLineIndex = allLines.length - maxLines;
            }
            
            // Draw lines starting from startLineIndex
            let yOffset = topMargin;
            for (let i = startLineIndex; i < allLines.length; i++) {
                const line = allLines[i];
                context.fillStyle = line.color;
                
                if (line.hasCursor) {
                    // Draw cursor line
                    if (line.text) {
                        context.fillText(line.text, 30, yOffset);
                        const textMetrics = context.measureText(line.text);
                        const textWidth = textMetrics.width;
                        // Position cursor at bottom of text, aligned with text baseline
                        // With textBaseline='top', yOffset is at top, so add font height
                        const fontHeight = 48; // Font size is 48px
                        const cursorY = yOffset + fontHeight - 4; // Position cursor near bottom of text
                        context.fillRect(30 + textWidth, cursorY, 30, 4);
                    } else {
                        // Cursor only
                        const fontHeight = 48; // Font size is 48px
                        const cursorY = yOffset + fontHeight - 4;
                        context.fillRect(30, cursorY, 30, 4);
                    }
                } else if (line.text) {
                    context.fillText(line.text, 30, yOffset);
                }
                
                yOffset += lineHeight;
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

