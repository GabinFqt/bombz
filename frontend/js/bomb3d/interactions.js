// Mouse/touch event handlers, hover detection, click handling
class InteractionManager {
    constructor(container, scene, camera, bombGroup, modulePanels, wires, wiresModulesState, zoomManager, animationManager, visualFeedbackManager, wiresManager, buttonManager, buttonModulesState, terminalManager, terminalModulesState) {
        this.container = container;
        this.scene = scene;
        this.camera = camera;
        this.bombGroup = bombGroup;
        this.modulePanels = modulePanels;
        this.wires = wires;
        this.wiresModulesState = wiresModulesState;
        this.zoomManager = zoomManager;
        this.animationManager = animationManager;
        this.visualFeedbackManager = visualFeedbackManager;
        this.wiresManager = wiresManager;
        this.buttonManager = buttonManager;
        this.buttonModulesState = buttonModulesState;
        this.terminalManager = terminalManager;
        this.terminalModulesState = terminalModulesState;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Module hover state
        this.hoveredModuleIndex = null;
        
        // Wire hover state
        this.hoveredWire = null; // { moduleIndex: number, wireIndex: number } or null
        
        // Button interaction state
        this.pressedButton = null; // { moduleIndex: number } or null
        this.buttonHoldInterval = null;
        
        // Touch gesture state for pinch-to-zoom
        this.touchStartDistance = null;
        this.touchStartTime = null;
        
        this.lastMouseX = 0;
        this.lastMouseY = 0;
    }
    
    setupEventListeners() {
        // Mouse move for raycaster
        this.container.addEventListener('mousemove', (event) => {
            const rect = this.container.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Handle rotation
            if (this.animationManager.isRotating && !this.zoomManager.isZoomed) {
                const deltaX = event.clientX - this.lastMouseX;
                const deltaY = event.clientY - this.lastMouseY;
                
                this.animationManager.updateRotation(deltaX, deltaY);
            }
            
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            
            // Module hover detection (only when not zoomed)
            if (!this.zoomManager.isZoomed) {
                this.handleModuleHover();
            } else {
                // Wire/button hover detection (only when zoomed)
                this.handleWireHover();
                this.handleButtonHover();
            }
        });
        
        // Mouse down - start rotation or button press
        this.container.addEventListener('mousedown', (event) => {
            if (this.zoomManager.isZoomed && event.button === 0) {
                // Check for button press when zoomed
                this.handleButtonPress(event);
            } else if (!this.zoomManager.isZoomed && event.button === 0) { // Left mouse button
                this.animationManager.setRotating(true);
                this.lastMouseX = event.clientX;
                this.lastMouseY = event.clientY;
                this.container.style.cursor = 'grabbing';
            }
        });
        
        // Mouse up - stop rotation or button release
        this.container.addEventListener('mouseup', (event) => {
            if (event.button === 0) {
                if (this.zoomManager.isZoomed && this.pressedButton !== null) {
                    // Handle button release
                    this.handleButtonRelease(event);
                } else {
                    this.animationManager.setRotating(false);
                    this.container.style.cursor = this.zoomManager.isZoomed ? 'default' : 'grab';
                }
            }
        });
        
        // Mouse leave - stop rotation
        this.container.addEventListener('mouseleave', () => {
            this.animationManager.setRotating(false);
            this.container.style.cursor = this.zoomManager.isZoomed ? 'default' : 'grab';
        });
        
        // Click handler
        this.container.addEventListener('click', (event) => {
            if (this.zoomManager.isZoomed) {
                // When zoomed, check if click hits any 3D objects
                this.raycaster.setFromCamera(this.mouse, this.camera);
                
                // Collect all objects that can be clicked (wires and module panels)
                const clickableObjects = [];
                
                // Add wires from the zoomed module
                const moduleWires = this.wires[this.zoomManager.zoomedModuleIndex];
                if (moduleWires) {
                    moduleWires.forEach(wireGroup => {
                        wireGroup.traverse((child) => {
                            if (child.isMesh && child.material) {
                                clickableObjects.push(child);
                            }
                        });
                    });
                }
                
                // Add module panels
                if (this.modulePanels) {
                    this.modulePanels.forEach(mp => {
                        clickableObjects.push(mp.panel);
                    });
                }
                
                // Check if click hits any object
                const intersects = this.raycaster.intersectObjects(clickableObjects, true);
                
                if (intersects.length === 0) {
                    // Clicked outside the bomb - exit zoom
                    this.zoomManager.exitZoom();
                    // Hide terminal input overlay if active
                    if (this.terminalManager) {
                        this.terminalManager.hideInputOverlay();
                    }
                    this.container.style.cursor = 'grab';
                    return;
                }
                
                // Handle wire/button/terminal clicks in zoom mode
                if (!this.handleButtonClick(event) && !this.handleTerminalClick(event)) {
                    this.handleClick(event);
                }
            } else {
                // Check for module panel click first
                if (this.handleModuleClick(event)) {
                    return; // Module was clicked, don't check wires/buttons
                }
                // Otherwise check for wire/button/terminal clicks
                if (!this.handleButtonClick(event) && !this.handleTerminalClick(event)) {
                    this.handleClick(event);
                }
            }
        });
        
        // ESC key handler
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (this.terminalManager && this.terminalManager.activeTerminalIndex !== null) {
                    // Hide terminal input overlay
                    this.terminalManager.hideInputOverlay();
                } else if (this.zoomManager.isZoomed) {
                    this.zoomManager.exitZoom();
                    // Hide terminal input overlay if active
                    if (this.terminalManager) {
                        this.terminalManager.hideInputOverlay();
                    }
                    this.container.style.cursor = 'grab';
                }
            }
        });
        
        // Terminal input handlers
        this.setupTerminalInputHandlers();
        
        // Mouse wheel dezoom handler
        this.container.addEventListener('wheel', (event) => {
            if (this.zoomManager.isZoomed) {
                // Prevent default scrolling behavior
                event.preventDefault();
                // Exit zoom on any wheel movement when zoomed
                this.zoomManager.exitZoom();
                // Hide terminal input overlay if active
                if (this.terminalManager) {
                    this.terminalManager.hideInputOverlay();
                }
                this.container.style.cursor = 'grab';
            }
        }, { passive: false });
        
        // Touch gesture handlers for phone dezoom (pinch-out)
        this.container.addEventListener('touchstart', (event) => {
            if (this.zoomManager.isZoomed && event.touches.length === 2) {
                // Two fingers - start tracking pinch gesture
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                this.touchStartDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                this.touchStartTime = Date.now();
            }
        }, { passive: true });
        
        this.container.addEventListener('touchmove', (event) => {
            if (this.zoomManager.isZoomed && event.touches.length === 2 && this.touchStartDistance !== null) {
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                
                // If fingers are moving apart (pinch-out), dezoom
                if (currentDistance > this.touchStartDistance * 1.2) {
                    this.zoomManager.exitZoom();
                    // Hide terminal input overlay if active
                    if (this.terminalManager) {
                        this.terminalManager.hideInputOverlay();
                    }
                    this.container.style.cursor = 'grab';
                    this.touchStartDistance = null;
                    this.touchStartTime = null;
                }
            }
        }, { passive: true });
        
        this.container.addEventListener('touchend', (event) => {
            // Reset touch tracking when touch ends
            if (event.touches.length < 2) {
                this.touchStartDistance = null;
                this.touchStartTime = null;
            }
        }, { passive: true });
        
        // Set initial cursor
        this.container.style.cursor = 'grab';
    }
    
    handleModuleHover() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check module panels
        const moduleObjects = this.modulePanels.map(mp => mp.panel);
        const intersects = this.raycaster.intersectObjects(moduleObjects);
        
        if (intersects.length > 0) {
            const moduleIndex = intersects[0].object.userData.moduleIndex;
            if (moduleIndex !== this.hoveredModuleIndex) {
                // Remove previous hover
                if (this.hoveredModuleIndex !== null) {
                    this.visualFeedbackManager.setModuleHover(this.hoveredModuleIndex, false);
                }
                // Set new hover
                this.hoveredModuleIndex = moduleIndex;
                this.visualFeedbackManager.setModuleHover(moduleIndex, true);
                this.container.style.cursor = 'pointer';
            }
        } else {
            // Remove hover
            if (this.hoveredModuleIndex !== null) {
                this.visualFeedbackManager.setModuleHover(this.hoveredModuleIndex, false);
                this.hoveredModuleIndex = null;
                this.container.style.cursor = 'grab';
            }
        }
    }
    
    handleWireHover() {
        if (!this.zoomManager.isZoomed || this.zoomManager.zoomedModuleIndex === null) {
            return;
        }
        
        // Get current wiresModulesState (handle both direct value and getter function)
        const wiresModulesState = typeof this.wiresModulesState === 'function' 
            ? this.wiresModulesState() 
            : this.wiresModulesState;
        
        // Check if module is solved - don't allow hover on solved modules
        if (wiresModulesState && 
            wiresModulesState[this.zoomManager.zoomedModuleIndex] && 
            wiresModulesState[this.zoomManager.zoomedModuleIndex].isSolved) {
            // Module is solved, clear hover if any
            if (this.hoveredWire !== null) {
                this.visualFeedbackManager.setWireHover(this.hoveredWire.moduleIndex, this.hoveredWire.wireIndex, false, (wg) => this.wiresManager.findWireMesh(wg));
                this.hoveredWire = null;
                this.container.style.cursor = 'default';
            }
            return;
        }
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Only check wires from the zoomed module
        const moduleWires = this.wires[this.zoomManager.zoomedModuleIndex];
        if (!moduleWires || moduleWires.length === 0) {
            // No wires in this module, clear hover if any
            if (this.hoveredWire !== null) {
                this.visualFeedbackManager.setWireHover(this.hoveredWire.moduleIndex, this.hoveredWire.wireIndex, false, (wg) => this.wiresManager.findWireMesh(wg));
                this.hoveredWire = null;
                this.container.style.cursor = 'default';
            }
            return;
        }
        
        // Collect all wire meshes (not groups) for more reliable intersection
        // Traverse the scene graph to get all meshes, including nested ones
        const wireMeshes = [];
        moduleWires.forEach(wireGroup => {
            wireGroup.traverse((child) => {
                if (child.isMesh && child.material) {
                    // Include all meshes for better detection
                    wireMeshes.push(child);
                }
            });
        });
        
        // Get intersections - check all meshes for better detection
        const intersects = this.raycaster.intersectObjects(wireMeshes, true);
        
        if (intersects.length > 0) {
            let hoveredObject = intersects[0].object;
            let wireGroup = null;
            
            // Traverse up to find the wireGroup (which has the userData with index and moduleIndex)
            while (hoveredObject) {
                if (hoveredObject.userData && hoveredObject.userData.index !== undefined && hoveredObject.userData.moduleIndex !== undefined) {
                    wireGroup = hoveredObject;
                    break;
                }
                hoveredObject = hoveredObject.parent;
            }
            
            // If we didn't find it in the object itself, check if parent is the wireGroup
            if (!wireGroup && intersects[0].object.parent) {
                const parent = intersects[0].object.parent;
                if (parent.userData && parent.userData.index !== undefined && parent.userData.moduleIndex !== undefined) {
                    wireGroup = parent;
                }
            }
            
            if (wireGroup && wireGroup.userData) {
                const wireIndex = wireGroup.userData.index;
                const moduleIndex = wireGroup.userData.moduleIndex;
                
                // Check if this is a different wire than currently hovered
                if (this.hoveredWire === null || 
                    this.hoveredWire.moduleIndex !== moduleIndex || 
                    this.hoveredWire.wireIndex !== wireIndex) {
                    // Remove previous hover
                    if (this.hoveredWire !== null) {
                        this.visualFeedbackManager.setWireHover(this.hoveredWire.moduleIndex, this.hoveredWire.wireIndex, false, (wg) => this.wiresManager.findWireMesh(wg));
                    }
                    // Set new hover (only if wire is not cut)
                    if (!wireGroup.userData.isCut) {
                        this.hoveredWire = { moduleIndex, wireIndex };
                        this.visualFeedbackManager.setWireHover(moduleIndex, wireIndex, true, (wg) => this.wiresManager.findWireMesh(wg));
                        this.container.style.cursor = 'pointer';
                    } else {
                        this.hoveredWire = null;
                        this.container.style.cursor = 'default';
                    }
                }
            }
        } else {
            // Remove hover only if we're not hovering over any wire
            if (this.hoveredWire !== null) {
                this.visualFeedbackManager.setWireHover(this.hoveredWire.moduleIndex, this.hoveredWire.wireIndex, false, (wg) => this.wiresManager.findWireMesh(wg));
                this.hoveredWire = null;
                this.container.style.cursor = 'default';
            }
        }
    }
    
    handleModuleClick(event) {
        if (this.zoomManager.isZoomed) return false;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check module panels
        const moduleObjects = this.modulePanels.map(mp => mp.panel);
        const intersects = this.raycaster.intersectObjects(moduleObjects);
        
        if (intersects.length > 0) {
            const moduleIndex = intersects[0].object.userData.moduleIndex;
            this.zoomManager.zoomToModule(moduleIndex);
            
            // Disable rotation
            this.animationManager.setRotating(false);
            this.container.style.cursor = 'default';
            
            // Remove hover state
            if (this.hoveredModuleIndex !== null) {
                this.visualFeedbackManager.setModuleHover(this.hoveredModuleIndex, false);
                this.hoveredModuleIndex = null;
            }
            
            // Clear wire hover state
            if (this.hoveredWire !== null) {
                this.visualFeedbackManager.setWireHover(this.hoveredWire.moduleIndex, this.hoveredWire.wireIndex, false, (wg) => this.wiresManager.findWireMesh(wg));
                this.hoveredWire = null;
            }
            
            // Check if this is a terminal module and automatically show input overlay after zoom completes
            if (this.terminalManager && this.terminalModulesState) {
                const terminalModules = this.terminalModulesState();
                const wireModuleCount = this.wiresModulesState ? this.wiresModulesState().length : 0;
                const buttonModuleCount = this.buttonModulesState ? this.buttonModulesState().length : 0;
                
                if (moduleIndex >= wireModuleCount + buttonModuleCount) {
                    const terminalModuleIndex = moduleIndex - wireModuleCount - buttonModuleCount;
                    if (terminalModules && terminalModuleIndex >= 0 && terminalModuleIndex < terminalModules.length) {
                        const terminalModule = terminalModules[terminalModuleIndex];
                        if (terminalModule && !terminalModule.isSolved) {
                            // Wait for zoom animation to complete (500ms) then show overlay
                            setTimeout(() => {
                                // Double-check we're still zoomed on this terminal
                                if (this.zoomManager.isZoomed && 
                                    this.zoomManager.zoomedModuleIndex === moduleIndex &&
                                    this.terminalManager) {
                                    this.terminalManager.showInputOverlay(terminalModuleIndex);
                                }
                            }, 550); // Slightly longer than zoom animation duration (500ms)
                        }
                    }
                }
            }
            
            return true;
        }
        
        return false;
    }
    
    handleClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // When zoomed, only check wires from the zoomed module
        // When not zoomed, check all modules' wires
        let wireGroupsToCheck = [];
        if (this.zoomManager.isZoomed && this.zoomManager.zoomedModuleIndex !== null) {
            // Only check wires from the zoomed module
            const moduleWires = this.wires[this.zoomManager.zoomedModuleIndex];
            if (moduleWires) {
                wireGroupsToCheck = moduleWires;
            }
        } else {
            // Check all modules' wires
            this.wires.forEach(moduleWires => {
                if (moduleWires) {
                    wireGroupsToCheck = wireGroupsToCheck.concat(moduleWires);
                }
            });
        }
        
        const intersects = this.raycaster.intersectObjects(wireGroupsToCheck, true);
        
        if (intersects.length > 0) {
            let clickedObject = intersects[0].object;
            let wireGroup = null;
            
            // Traverse up to find the wireGroup
            while (clickedObject) {
                if (clickedObject.userData && clickedObject.userData.index !== undefined && clickedObject.userData.moduleIndex !== undefined) {
                    wireGroup = clickedObject;
                    break;
                }
                clickedObject = clickedObject.parent;
            }
            
            if (wireGroup && wireGroup.userData) {
                const wireIndex = wireGroup.userData.index;
                const moduleIndex = wireGroup.userData.moduleIndex;
                
                // Get current wiresModulesState (handle both direct value and getter function)
                const wiresModulesState = typeof this.wiresModulesState === 'function' 
                    ? this.wiresModulesState() 
                    : this.wiresModulesState;
                
                // Check if module is solved - don't allow clicks on solved modules
                if (wiresModulesState && 
                    wiresModulesState[moduleIndex] && 
                    wiresModulesState[moduleIndex].isSolved) {
                    return; // Module is solved, ignore click
                }
                
                if (!wireGroup.userData.isCut) {
                    // Clear wire hover state when clicking
                    if (this.hoveredWire !== null) {
                        this.visualFeedbackManager.setWireHover(this.hoveredWire.moduleIndex, this.hoveredWire.wireIndex, false, (wg) => this.wiresManager.findWireMesh(wg));
                        this.hoveredWire = null;
                    }
                    
                    // Highlight wire
                    this.visualFeedbackManager.highlightWire(moduleIndex, wireIndex, (wg) => this.wiresManager.findWireMesh(wg));
                    
                    // Trigger wire cut event
                    if (window.onWireCut) {
                        window.onWireCut(moduleIndex, wireIndex);
                    }
                }
            }
        }
    }
    
    handleButtonHover() {
        if (!this.zoomManager.isZoomed || this.zoomManager.zoomedModuleIndex === null) {
            return;
        }
        
        // Get button modules state
        const buttonModulesState = typeof this.buttonModulesState === 'function' 
            ? this.buttonModulesState() 
            : this.buttonModulesState;
        
        if (!buttonModulesState || !this.buttonManager) return;
        
        // Calculate if this module is a button module
        const wireModuleCount = typeof this.wiresModulesState === 'function' 
            ? (this.wiresModulesState() ? this.wiresModulesState().length : 0)
            : (this.wiresModulesState ? this.wiresModulesState.length : 0);
        
        const zoomedModuleIndex = this.zoomManager.zoomedModuleIndex;
        if (zoomedModuleIndex < wireModuleCount) {
            // This is a wire module, not a button module
            return;
        }
        
        const buttonModuleIndex = zoomedModuleIndex - wireModuleCount;
        if (buttonModuleIndex >= buttonModulesState.length) return;
        
        const buttonModule = buttonModulesState[buttonModuleIndex];
        if (!buttonModule || buttonModule.isSolved) return;
        
        // Check if hovering over button
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const buttonGroup = this.buttonManager.buttons[buttonModuleIndex];
        if (!buttonGroup) return;
        
        const buttonMeshes = [];
        buttonGroup.traverse((child) => {
            if (child.isMesh && child.material) {
                buttonMeshes.push(child);
            }
        });
        
        const intersects = this.raycaster.intersectObjects(buttonMeshes, true);
        if (intersects.length > 0) {
            this.container.style.cursor = 'pointer';
        } else {
            this.container.style.cursor = 'default';
        }
    }
    
    handleButtonClick(event) {
        if (!this.buttonManager || !this.buttonManager.buttons) return false;
        
        // Get button modules state
        const buttonModulesState = typeof this.buttonModulesState === 'function' 
            ? this.buttonModulesState() 
            : this.buttonModulesState;
        
        if (!buttonModulesState) return false;
        
        // Calculate wire module count
        const wireModuleCount = typeof this.wiresModulesState === 'function' 
            ? (this.wiresModulesState() ? this.wiresModulesState().length : 0)
            : (this.wiresModulesState ? this.wiresModulesState.length : 0);
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check all button groups
        for (let buttonModuleIndex = 0; buttonModuleIndex < this.buttonManager.buttons.length; buttonModuleIndex++) {
            const buttonGroup = this.buttonManager.buttons[buttonModuleIndex];
            if (!buttonGroup) continue;
            
            const buttonMeshes = [];
            buttonGroup.traverse((child) => {
                if (child.isMesh && child.material) {
                    buttonMeshes.push(child);
                }
            });
            
            const intersects = this.raycaster.intersectObjects(buttonMeshes, true);
            if (intersects.length > 0) {
                const buttonModule = buttonModulesState[buttonModuleIndex];
                if (buttonModule && !buttonModule.isSolved) {
                    // Calculate actual module index for zoom
                    const actualModuleIndex = wireModuleCount + buttonModuleIndex;
                    
                    // If not zoomed, zoom to this module first
                    if (!this.zoomManager.isZoomed) {
                        this.zoomManager.zoomToModule(actualModuleIndex);
                        this.animationManager.setRotating(false);
                        this.container.style.cursor = 'default';
                        return true;
                    }
                    
                    // If already zoomed to this module, handle press
                    if (this.zoomManager.zoomedModuleIndex === actualModuleIndex) {
                        // Button press will be handled in mousedown
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    handleButtonPress(event) {
        if (!this.buttonManager || !this.buttonManager.buttons) return;
        
        // Get button modules state
        const buttonModulesState = typeof this.buttonModulesState === 'function' 
            ? this.buttonModulesState() 
            : this.buttonModulesState;
        
        if (!buttonModulesState) return;
        
        // Calculate wire module count
        const wireModuleCount = typeof this.wiresModulesState === 'function' 
            ? (this.wiresModulesState() ? this.wiresModulesState().length : 0)
            : (this.wiresModulesState ? this.wiresModulesState.length : 0);
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check all button groups
        for (let buttonModuleIndex = 0; buttonModuleIndex < this.buttonManager.buttons.length; buttonModuleIndex++) {
            const buttonGroup = this.buttonManager.buttons[buttonModuleIndex];
            if (!buttonGroup) continue;
            
            const buttonMeshes = [];
            buttonGroup.traverse((child) => {
                if (child.isMesh && child.material) {
                    buttonMeshes.push(child);
                }
            });
            
            const intersects = this.raycaster.intersectObjects(buttonMeshes, true);
            if (intersects.length > 0) {
                const buttonModule = buttonModulesState[buttonModuleIndex];
                if (buttonModule && !buttonModule.isSolved && !buttonModule.isPressed) {
                    this.pressedButton = { moduleIndex: buttonModuleIndex };
                    
                    // Send press command
                    if (window.onButtonPress) {
                        window.onButtonPress(buttonModuleIndex);
                    }
                    
                    // Start hold interval if needed (for hold actions)
                    // The release will handle the timing check
                    return;
                }
            }
        }
    }
    
    handleButtonRelease(event) {
        if (this.pressedButton === null) return;
        
        const buttonModuleIndex = this.pressedButton.moduleIndex;
        
        // Clear hold interval if any
        if (this.buttonHoldInterval) {
            clearInterval(this.buttonHoldInterval);
            this.buttonHoldInterval = null;
        }
        
        // Send release command
        if (window.onButtonRelease) {
            window.onButtonRelease(buttonModuleIndex);
        }
        
        this.pressedButton = null;
    }
    
    handleTerminalClick(event) {
        if (!this.zoomManager.isZoomed || !this.terminalManager || !this.terminalModulesState) {
            return false;
        }
        
        const terminalModules = this.terminalModulesState();
        if (!terminalModules || terminalModules.length === 0) {
            return false;
        }
        
        // Calculate which terminal module we're looking at
        const zoomedModuleIndex = this.zoomManager.zoomedModuleIndex;
        const wireModuleCount = this.wiresModulesState ? this.wiresModulesState().length : 0;
        const buttonModuleCount = this.buttonModulesState ? this.buttonModulesState().length : 0;
        
        // Check if zoomed module is a terminal module
        if (zoomedModuleIndex < wireModuleCount + buttonModuleCount) {
            return false; // Not a terminal module
        }
        
        const terminalModuleIndex = zoomedModuleIndex - wireModuleCount - buttonModuleCount;
        if (terminalModuleIndex < 0 || terminalModuleIndex >= terminalModules.length) {
            return false;
        }
        
        const terminalModule = terminalModules[terminalModuleIndex];
        if (!terminalModule || terminalModule.isSolved) {
            return false;
        }
        
        // Check if click hits the terminal screen
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const terminals = this.terminalManager.terminals || [];
        if (terminals[terminalModuleIndex]) {
            const terminalGroup = terminals[terminalModuleIndex];
            const intersects = this.raycaster.intersectObject(terminalGroup, true);
            
            if (intersects.length > 0) {
                // Show input overlay for terminal
                console.log('Terminal clicked, showing input overlay for module', terminalModuleIndex);
                if (this.terminalManager) {
                    this.terminalManager.showInputOverlay(terminalModuleIndex);
                } else {
                    console.error('TerminalManager not available');
                }
                return true;
            } else {
                console.log('Terminal click did not intersect terminal screen');
            }
        }
        
        return false;
    }
    
    setupTerminalInputHandlers() {
        const input = document.getElementById('terminal-input');
        if (!input) return;
        
        // Handle input changes - update terminal display in real-time
        input.addEventListener('input', (event) => {
            if (this.terminalManager && this.terminalManager.activeTerminalIndex !== null) {
                const text = event.target.value;
                this.terminalManager.updateTerminalWithInput(
                    this.terminalManager.activeTerminalIndex,
                    text
                );
            }
        });
        
        // Handle Enter key - submit command
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                if (this.terminalManager && this.terminalManager.activeTerminalIndex !== null) {
                    const command = input.value.trim();
                    if (command !== '') {
                        const moduleIndex = this.terminalManager.activeTerminalIndex;
                        // Clear input but keep overlay active for next command
                        input.value = '';
                        // Send command via global handler
                        if (window.onTerminalCommand) {
                            window.onTerminalCommand(moduleIndex, command);
                        }
                        // Refocus input immediately so user can type next command
                        setTimeout(() => {
                            input.focus();
                        }, 10);
                        // Keep overlay active - it will be hidden automatically when module is solved
                        // or when user presses Escape
                    }
                }
            } else if (event.key === 'Escape') {
                event.preventDefault();
                if (this.terminalManager) {
                    this.terminalManager.hideInputOverlay();
                }
            }
        });
        
        // Handle blur - hide overlay when input loses focus
        // But only if the module is solved or user explicitly clicked outside
        input.addEventListener('blur', () => {
            // Small delay to allow refocus and click events to process first
            setTimeout(() => {
                if (this.terminalManager && this.terminalManager.activeTerminalIndex !== null) {
                    const moduleIndex = this.terminalManager.activeTerminalIndex;
                    // Check if module is solved - if so, hide overlay
                    // Otherwise, check if input is still focused (might have been refocused)
                    const input = document.getElementById('terminal-input');
                    if (input && document.activeElement !== input) {
                        // Input is not focused and not solved - user clicked away
                        const overlay = document.getElementById('terminal-input-overlay');
                        if (overlay && overlay.style.display !== 'none') {
                            // Only hide if user actually clicked outside (not just temporary blur)
                            // We'll let the solved check handle hiding when appropriate
                        }
                    }
                }
            }, 150);
        });
    }
    
    clearHoverStates() {
        if (this.hoveredWire !== null) {
            this.visualFeedbackManager.setWireHover(this.hoveredWire.moduleIndex, this.hoveredWire.wireIndex, false, (wg) => this.wiresManager.findWireMesh(wg));
            this.hoveredWire = null;
        }
    }
}

