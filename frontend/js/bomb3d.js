// Three.js 3D bomb rendering - Futuristic Design
class Bomb3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.bomb = null;
        this.bombGroup = null; // Group to rotate the entire bomb
        this.wiresModule = null;
        this.wires = []; // Array of arrays: wires[moduleIndex] = array of wires for that module
        this.wiresModulesState = null; // Store wiresModules state to check if modules are solved
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedWire = null;
        this.selectedModule = null;
        
        // Rotation state
        this.isRotating = false;
        this.rotationSpeed = 0.005;
        this.bombRotationX = 0;
        this.bombRotationY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Zoom state
        this.isZoomed = false;
        this.zoomedModuleIndex = null;
        this.zoomedModuleWorldPosition = null; // Store module world position for lookAt
        this.originalCameraPosition = new THREE.Vector3();
        this.originalCameraRotation = new THREE.Euler();
        this.zoomAnimationProgress = 0;
        this.zoomAnimationDuration = 500; // milliseconds
        this.zoomAnimationStartTime = 0;
        this.zoomStartPosition = new THREE.Vector3();
        this.zoomTargetPosition = new THREE.Vector3();
        
        // Module hover state
        this.hoveredModuleIndex = null;
        
        // Wire hover state
        this.hoveredWire = null; // { moduleIndex: number, wireIndex: number } or null
        
        this.init();
        this.setupEventListeners();
    }
    
    init() {
        // Scene - off-white background (slightly less white)
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);
        
        // Camera
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(0, 0.8, 5);
        this.camera.lookAt(0, 0, 0);
        // Store original camera position for zoom return
        this.originalCameraPosition.set(0, 0.8, 5);
        this.originalCameraRotation.copy(this.camera.rotation);
        
        // Renderer - higher quality settings
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('bomb-canvas'),
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Enhanced lighting - futuristic setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        // Main directional light - positioned behind camera, pointing forward
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 4096;
        this.directionalLight.shadow.mapSize.height = 4096;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 50;
        this.directionalLight.shadow.camera.left = -10;
        this.directionalLight.shadow.camera.right = 10;
        this.directionalLight.shadow.camera.top = 10;
        this.directionalLight.shadow.camera.bottom = -10;
        this.scene.add(this.directionalLight);
        
        // Accent light from side
        const accentLight = new THREE.DirectionalLight(0x4ecdc4, 0.8);
        accentLight.position.set(-3, 2, 2);
        this.scene.add(accentLight);
        
        // Rim light for depth
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
        rimLight.position.set(0, 0, -5);
        this.scene.add(rimLight);
        
        // Point light for futuristic glow effect
        const pointLight = new THREE.PointLight(0x4ecdc4, 0.5, 10);
        pointLight.position.set(0, 2, 0);
        this.scene.add(pointLight);
        
        // Create bomb group for rotation
        this.bombGroup = new THREE.Group();
        this.scene.add(this.bombGroup);
        
        // Create bomb
        this.createBomb();
        
        // Start animation loop
        this.animate();
    }
    
    createBomb() {
        // Main bomb body - futuristic metallic design
        const bombGeometry = new THREE.BoxGeometry(4, 2, 1.2, 8, 4, 4); // Higher resolution
        const bombMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x000000,
        });
        this.bomb = new THREE.Mesh(bombGeometry, bombMaterial);
        this.bomb.position.y = 0;
        this.bomb.castShadow = true;
        this.bomb.receiveShadow = true;
        this.bombGroup.add(this.bomb);
        
        // Top face with tech pattern
        const topGeometry = new THREE.BoxGeometry(4, 0.1, 1.2, 8, 1, 4);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.9,
            roughness: 0.1,
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 1.05;
        this.bombGroup.add(top);
        
        // Timer display - futuristic design
        const timerGeometry = new THREE.BoxGeometry(0.6, 0.2, 0.15, 4, 2, 2);
        const timerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0a0a0a,
            metalness: 0.95,
            roughness: 0.05,
        });
        const timer = new THREE.Mesh(timerGeometry, timerMaterial);
        timer.position.y = 1.15;
        timer.position.z = 0.5;
        this.bombGroup.add(timer);
        
        // Create canvas for timer text
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#00ff00';
        context.font = 'bold 48px "Courier New", monospace';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('00:00', canvas.width / 2, canvas.height / 2);
        
        // Timer screen with text texture
        const screenGeometry = new THREE.PlaneGeometry(0.55, 0.15);
        const screenTexture = new THREE.CanvasTexture(canvas);
        screenTexture.needsUpdate = true;
        const screenMaterial = new THREE.MeshStandardMaterial({ 
            map: screenTexture,
            emissive: 0x002200,
            emissiveIntensity: 0.5,
        });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.y = 1.16;
        screen.position.z = 0.6;
        this.bombGroup.add(screen);
        
        // Store references for updating
        this.timerScreen = screen;
        this.timerCanvas = canvas;
        this.timerContext = context;
        this.timerTexture = screenTexture;
        
        // Tech accents - corner details
        const accentGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.05);
        const accentMaterial = new THREE.MeshStandardMaterial({
            color: 0x4ecdc4,
            emissive: 0x004444,
            emissiveIntensity: 0.5,
            metalness: 0.9,
            roughness: 0.1,
        });
        
        // Add corner accents
        const corners = [
            { x: -1.9, y: 0.9, z: 0.6 },
            { x: 1.9, y: 0.9, z: 0.6 },
            { x: -1.9, y: -0.9, z: 0.6 },
            { x: 1.9, y: -0.9, z: 0.6 },
        ];
        corners.forEach(pos => {
            const accent = new THREE.Mesh(accentGeometry, accentMaterial);
            accent.position.set(pos.x, pos.y, pos.z);
            this.bombGroup.add(accent);
        });
        
        // Create 6 module panels (3x2 grid) on front face
        this.createModulePanels();
    }
    
    createModulePanels() {
        const panelWidth = 1.1;
        const panelHeight = 0.85;
        const spacing = 0.15;
        const totalWidth = 3 * panelWidth + 2 * spacing;
        const totalHeight = 2 * panelHeight + spacing;
        
        const startX = -totalWidth / 2 + panelWidth / 2;
        const startY = totalHeight / 2 - panelHeight / 2;
        
        this.modulePanels = [];
        this.moduleGlows = []; // Store glow rings for each module
        
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 3; col++) {
                const x = startX + col * (panelWidth + spacing);
                const y = startY - row * (panelHeight + spacing);
                const moduleIndex = row * 3 + col;
                
                // Panel background - futuristic dark panel
                const panelGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight, 4, 4);
                const panelMaterial = new THREE.MeshStandardMaterial({
                    color: 0x1a1a1a,
                    metalness: 0.6,
                    roughness: 0.4,
                    emissive: 0x000000,
                });
                const panel = new THREE.Mesh(panelGeometry, panelMaterial);
                panel.position.set(x, y, 0.61);
                panel.userData = { moduleIndex, type: 'module' };
                this.bombGroup.add(panel);
                
                // Panel border/frame - tech frame
                const borderGeometry = new THREE.PlaneGeometry(panelWidth + 0.05, panelHeight + 0.05, 4, 4);
                const borderMaterial = new THREE.MeshStandardMaterial({
                    color: 0x0a0a0a,
                    metalness: 0.8,
                    roughness: 0.2,
                });
                const border = new THREE.Mesh(borderGeometry, borderMaterial);
                border.position.set(x, y, 0.605);
                this.bombGroup.add(border);
                
                // Inner tech border
                const innerBorderGeometry = new THREE.PlaneGeometry(panelWidth - 0.05, panelHeight - 0.05, 4, 4);
                const innerBorderMaterial = new THREE.MeshStandardMaterial({
                    color: 0x2a2a2a,
                    metalness: 0.7,
                    roughness: 0.3,
                });
                const innerBorder = new THREE.Mesh(innerBorderGeometry, innerBorderMaterial);
                innerBorder.position.set(x, y, 0.607);
                this.bombGroup.add(innerBorder);
                
                // Create glow border for module (initially invisible)
                const glowWidth = panelWidth + 0.15;
                const glowHeight = panelHeight + 0.15;
                const glowGeometry = new THREE.PlaneGeometry(glowWidth, glowHeight, 4, 4);
                const glowMaterial = new THREE.MeshStandardMaterial({
                    color: 0xffff00, // Yellow for hover/interaction
                    emissive: 0xffff00,
                    emissiveIntensity: 0,
                    transparent: true,
                    opacity: 0,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                });
                const glow = new THREE.Mesh(glowGeometry, glowMaterial);
                glow.position.set(x, y, 0.608);
                glow.userData = { moduleIndex, type: 'glow' };
                this.bombGroup.add(glow);
                
                this.modulePanels.push({ 
                    panel, 
                    border, 
                    innerBorder,
                    glow,
                    x, 
                    y, 
                    row, 
                    col,
                    moduleIndex 
                });
                this.moduleGlows.push({ glow, material: glowMaterial });
            }
        }
        
        // Set the first panel (top-left) as the wires module
        if (this.modulePanels.length > 0) {
            this.wiresModule = this.modulePanels[0].panel;
        }
    }
    
    updateWires(wiresModules) {
        // Store wiresModules state to check if modules are solved
        this.wiresModulesState = wiresModules;
        
        // Remove all existing wires
        this.wires.forEach(moduleWires => {
            moduleWires.forEach(wire => {
                this.bombGroup.remove(wire);
            });
        });
        this.wires = [];
        
        if (!wiresModules || !Array.isArray(wiresModules)) return;
        
        if (!this.modulePanels || this.modulePanels.length === 0) return;
        
        // Create wires for each module
        wiresModules.forEach((wiresConfig, moduleIndex) => {
            if (!wiresConfig || !wiresConfig.wires) return;
            
            const modulePanel = this.modulePanels[moduleIndex];
            if (!modulePanel) return;
            
            const panelCenterY = modulePanel.y;
            const panelHeight = 0.85;
            const panelWidth = 1.1;
            
            const wireCount = wiresConfig.wires.length;
            const wireSpacing = panelHeight / (wireCount + 1);
            const startY = panelCenterY + panelHeight / 2 - wireSpacing;
            
            const moduleWires = [];
            wiresConfig.wires.forEach((color, wireIndex) => {
                const wire = this.createWire(
                    color, 
                    wireIndex, 
                    startY - wireIndex * wireSpacing, 
                    wiresConfig.cutWires.includes(wireIndex), 
                    modulePanel.x,
                    moduleIndex,
                    panelWidth * 0.8
                );
                moduleWires.push(wire);
                this.bombGroup.add(wire);
            });
            
            this.wires[moduleIndex] = moduleWires;
        });
    }
    
    createWire(color, index, yPos, isCut, xPos = 0, moduleIndex = 0, wireLength = 1.1) {
        const wireGroup = new THREE.Group();
        
        // Wire color mapping
        const colorMap = {
            'red': 0xff0000,
            'blue': 0x0066ff,
            'green': 0x00ff00,
            'white': 0xffffff,
            'yellow': 0xffff00,
        };
        
        const wireColor = colorMap[color] || 0xffffff;
        
        // Wire geometry - higher resolution
        const wireGeometry = new THREE.CylinderGeometry(0.03, 0.03, wireLength, 16);
        
        // Enhanced emissive for futuristic look
        let emissiveColor = new THREE.Color(wireColor).multiplyScalar(0.15);
        if (wireColor === 0xffffff) {
            emissiveColor = new THREE.Color(0xffffff).multiplyScalar(0.4);
        }
        
        const wireMaterial = new THREE.MeshStandardMaterial({
            color: wireColor,
            metalness: 0.5,
            roughness: 0.5,
            emissive: emissiveColor,
            emissiveIntensity: 0.8,
        });
        
        const wire = new THREE.Mesh(wireGeometry, wireMaterial);
        wire.rotation.z = Math.PI / 2;
        wire.position.set(xPos, yPos, 0.62);
        wire.userData = { index, color, isCut, moduleIndex };
        
        // Add outline for white wires
        if (wireColor === 0xffffff) {
            const outlineGeometry = new THREE.CylinderGeometry(0.032, 0.032, wireLength, 16);
            const outlineMaterial = new THREE.MeshBasicMaterial({
                color: 0x000000,
                side: THREE.BackSide,
            });
            const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
            outline.rotation.z = Math.PI / 2;
            outline.position.set(xPos, yPos, 0.62);
            wireGroup.add(outline);
        }
        
        if (isCut) {
            wire.material.opacity = 0.2;
            wire.material.transparent = true;
        }
        
        wireGroup.add(wire);
        wireGroup.userData = { index, color, isCut, moduleIndex };
        
        return wireGroup;
    }
    
    setupEventListeners() {
        // Mouse move for raycaster
        this.container.addEventListener('mousemove', (event) => {
            const rect = this.container.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Handle rotation
            if (this.isRotating && !this.isZoomed) {
                const deltaX = event.clientX - this.lastMouseX;
                const deltaY = event.clientY - this.lastMouseY;
                
                this.bombRotationY += deltaX * this.rotationSpeed;
                this.bombRotationX += deltaY * this.rotationSpeed;
                
                // Limit vertical rotation
                this.bombRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.bombRotationX));
            }
            
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            
            // Module hover detection (only when not zoomed)
            if (!this.isZoomed) {
                this.handleModuleHover();
            } else {
                // Wire hover detection (only when zoomed)
                this.handleWireHover();
            }
        });
        
        // Mouse down - start rotation
        this.container.addEventListener('mousedown', (event) => {
            if (!this.isZoomed && event.button === 0) { // Left mouse button
                this.isRotating = true;
                this.lastMouseX = event.clientX;
                this.lastMouseY = event.clientY;
                this.container.style.cursor = 'grabbing';
            }
        });
        
        // Mouse up - stop rotation
        this.container.addEventListener('mouseup', (event) => {
            if (event.button === 0) {
                this.isRotating = false;
                this.container.style.cursor = this.isZoomed ? 'default' : 'grab';
            }
        });
        
        // Mouse leave - stop rotation
        this.container.addEventListener('mouseleave', () => {
            this.isRotating = false;
            this.container.style.cursor = this.isZoomed ? 'default' : 'grab';
        });
        
        // Click handler
        this.container.addEventListener('click', (event) => {
            if (this.isZoomed) {
                // Handle wire clicks in zoom mode
                this.handleClick(event);
            } else {
                // Check for module panel click first
                if (this.handleModuleClick(event)) {
                    return; // Module was clicked, don't check wires
                }
                // Otherwise check for wire clicks
                this.handleClick(event);
            }
        });
        
        // ESC key handler
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isZoomed) {
                this.exitZoom();
            }
        });
        
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
                    this.setModuleHover(this.hoveredModuleIndex, false);
                }
                // Set new hover
                this.hoveredModuleIndex = moduleIndex;
                this.setModuleHover(moduleIndex, true);
                this.container.style.cursor = 'pointer';
            }
        } else {
            // Remove hover
            if (this.hoveredModuleIndex !== null) {
                this.setModuleHover(this.hoveredModuleIndex, false);
                this.hoveredModuleIndex = null;
                this.container.style.cursor = 'grab';
            }
        }
    }
    
    setModuleHover(moduleIndex, isHovered) {
        if (!this.moduleGlows || moduleIndex < 0 || moduleIndex >= this.moduleGlows.length) {
            return;
        }
        
        const glowData = this.moduleGlows[moduleIndex];
        if (!glowData) return;
        
        // Don't show yellow hover if module is already showing success (green) or error (red)
        const currentColor = glowData.material.color.getHex();
        const isSuccess = currentColor === 0x00ff00;
        const isError = currentColor === 0xff0000;
        
        if (isHovered && !isSuccess && !isError) {
            // Yellow for hover/interaction
            glowData.material.color.setHex(0xffff00);
            glowData.material.emissive.setHex(0xffff00);
            glowData.material.emissiveIntensity = 0.8;
            glowData.material.opacity = 0.6;
        } else if (!isHovered && !isSuccess && !isError) {
            // Hide glow
            glowData.material.emissiveIntensity = 0;
            glowData.material.opacity = 0;
        }
    }
    
    handleWireHover() {
        if (!this.isZoomed || this.zoomedModuleIndex === null) {
            return;
        }
        
        // Check if module is solved - don't allow hover on solved modules
        if (this.wiresModulesState && 
            this.wiresModulesState[this.zoomedModuleIndex] && 
            this.wiresModulesState[this.zoomedModuleIndex].isSolved) {
            // Module is solved, clear hover if any
            if (this.hoveredWire !== null) {
                this.setWireHover(this.hoveredWire.moduleIndex, this.hoveredWire.wireIndex, false);
                this.hoveredWire = null;
                this.container.style.cursor = 'default';
            }
            return;
        }
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Only check wires from the zoomed module
        const moduleWires = this.wires[this.zoomedModuleIndex];
        if (!moduleWires || moduleWires.length === 0) {
            // No wires in this module, clear hover if any
            if (this.hoveredWire !== null) {
                this.setWireHover(this.hoveredWire.moduleIndex, this.hoveredWire.wireIndex, false);
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
                        this.setWireHover(this.hoveredWire.moduleIndex, this.hoveredWire.wireIndex, false);
                    }
                    // Set new hover (only if wire is not cut)
                    if (!wireGroup.userData.isCut) {
                        this.hoveredWire = { moduleIndex, wireIndex };
                        this.setWireHover(moduleIndex, wireIndex, true);
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
                this.setWireHover(this.hoveredWire.moduleIndex, this.hoveredWire.wireIndex, false);
                this.hoveredWire = null;
                this.container.style.cursor = 'default';
            }
        }
    }
    
    setWireHover(moduleIndex, wireIndex, isHovered) {
        if (!this.wires[moduleIndex] || wireIndex < 0 || wireIndex >= this.wires[moduleIndex].length) {
            return;
        }
        
        const wireGroup = this.wires[moduleIndex][wireIndex];
        if (!wireGroup || wireGroup.userData.isCut) {
            return;
        }
        
        const wire = this.findWireMesh(wireGroup);
        if (!wire || !wire.material) {
            return;
        }
        
        // Don't modify if wire is already highlighted (selected)
        const isSelected = this.selectedModule === moduleIndex && this.selectedWire === wireIndex;
        
        if (isHovered && !isSelected) {
            // Use bright yellow emissive for hover effect (similar to module hover) - visible on all colors
            wire.material.emissive.setHex(0xffff00);
            wire.material.emissiveIntensity = 1.0;
            // Slightly increase scale for better visibility (only radius, not length)
            // Wire is rotated 90 degrees on Z axis, so:
            // CylinderGeometry: height along Y axis, radius in X-Z plane
            // After rotation.z = Math.PI/2: local Y becomes world X (length), local X becomes world -Y, local Z stays Z
            // To scale only radius: scale local X and Z (not Y, which is the length dimension)
            if (!wire.userData.originalScale) {
                wire.userData.originalScale = wire.scale.clone();
            }
            wire.scale.set(1.15, 1.0, 1.15); // Scale X and Z (radius), keep Y (length) at 1.0
        } else if (!isHovered && !isSelected) {
            // Restore original emissive intensity and scale
            const color = wire.material.color;
            const wireColor = color.getHex();
            // Restore original emissive based on wire color
            let emissiveColor = new THREE.Color(wireColor).multiplyScalar(0.15);
            if (wireColor === 0xffffff) {
                emissiveColor = new THREE.Color(0xffffff).multiplyScalar(0.4);
            }
            wire.material.emissive.copy(emissiveColor);
            wire.material.emissiveIntensity = 0.8;
            // Restore original scale
            if (wire.userData.originalScale) {
                wire.scale.copy(wire.userData.originalScale);
            }
        }
    }
    
    handleModuleClick(event) {
        if (this.isZoomed) return false;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check module panels
        const moduleObjects = this.modulePanels.map(mp => mp.panel);
        const intersects = this.raycaster.intersectObjects(moduleObjects);
        
        if (intersects.length > 0) {
            const moduleIndex = intersects[0].object.userData.moduleIndex;
            this.zoomToModule(moduleIndex);
            return true;
        }
        
        return false;
    }
    
    zoomToModule(moduleIndex) {
        if (!this.modulePanels || moduleIndex < 0 || moduleIndex >= this.modulePanels.length) {
            return;
        }
        
        const modulePanel = this.modulePanels[moduleIndex];
        if (!modulePanel) return;
        
        // Reset bomb rotation first so we can calculate positions correctly
        this.bombRotationX = 0;
        this.bombRotationY = 0;
        this.bombGroup.rotation.x = 0;
        this.bombGroup.rotation.y = 0;
        this.bombGroup.rotation.z = 0;
        
        // Now get module's world position with bomb at default rotation
        const moduleWorldPosition = new THREE.Vector3();
        modulePanel.panel.getWorldPosition(moduleWorldPosition);
        
        // Calculate camera position: module is on the front face (z = 0.61 in local space)
        // Camera should be positioned along the +Z axis (forward direction) from the module
        // Since bomb is now at rotation (0,0,0), the forward direction is simply (0, 0, 1)
        const forwardDirection = new THREE.Vector3(0, 0, 1);
        const zoomDistance = 2.5; // Closer distance for better module view
        
        // Position camera directly in front of the module, along the forward direction
        const targetPosition = moduleWorldPosition.clone();
        targetPosition.add(forwardDirection.multiplyScalar(zoomDistance));
        
        this.zoomTargetPosition.copy(targetPosition);
        this.zoomStartPosition.copy(this.camera.position);
        this.zoomAnimationStartTime = Date.now();
        this.zoomAnimationProgress = 0;
        this.isZoomed = true;
        this.zoomedModuleIndex = moduleIndex;
        
        // Store module world position for lookAt
        this.zoomedModuleWorldPosition = moduleWorldPosition.clone();
        
        // Disable rotation
        this.isRotating = false;
        this.container.style.cursor = 'default';
        
        // Remove hover state
        if (this.hoveredModuleIndex !== null) {
            this.setModuleHover(this.hoveredModuleIndex, false);
            this.hoveredModuleIndex = null;
        }
        
        // Clear wire hover state
        if (this.hoveredWire !== null) {
            this.setWireHover(this.hoveredWire.moduleIndex, this.hoveredWire.wireIndex, false);
            this.hoveredWire = null;
        }
    }
    
    exitZoom() {
        if (!this.isZoomed) return;
        
        // Clear wire hover state
        if (this.hoveredWire !== null) {
            this.setWireHover(this.hoveredWire.moduleIndex, this.hoveredWire.wireIndex, false);
            this.hoveredWire = null;
        }
        
        this.zoomStartPosition.copy(this.camera.position);
        this.zoomTargetPosition.copy(this.originalCameraPosition);
        this.zoomAnimationStartTime = Date.now();
        this.zoomAnimationProgress = 0;
        this.isZoomed = false;
        this.zoomedModuleIndex = null;
        this.zoomedModuleWorldPosition = null;
        this.container.style.cursor = 'grab';
    }
    
    updateZoomAnimation() {
        if (!this.isZoomed && this.zoomAnimationProgress >= 1) {
            return; // Already at original position
        }
        
        const elapsed = Date.now() - this.zoomAnimationStartTime;
        this.zoomAnimationProgress = Math.min(elapsed / this.zoomAnimationDuration, 1);
        
        // Smooth easing function (ease in-out)
        const easeProgress = this.zoomAnimationProgress < 0.5
            ? 2 * this.zoomAnimationProgress * this.zoomAnimationProgress
            : 1 - Math.pow(-2 * this.zoomAnimationProgress + 2, 2) / 2;
        
        // Interpolate camera position
        const previousPosition = this.camera.position.clone();
        
        // Safety check: ensure start and target positions are valid
        if (this.zoomStartPosition.length() === 0 || isNaN(this.zoomStartPosition.x)) {
            console.error('Invalid zoom start position:', this.zoomStartPosition);
            this.zoomStartPosition.copy(this.camera.position);
        }
        if (this.zoomTargetPosition.length() === 0 || isNaN(this.zoomTargetPosition.x)) {
            console.error('Invalid zoom target position:', this.zoomTargetPosition);
            // Use a safe default position
            this.zoomTargetPosition.set(0, 0.8, 5);
        }
        
        this.camera.position.lerpVectors(this.zoomStartPosition, this.zoomTargetPosition, easeProgress);
        
        // Look at module when zoomed, or origin when not zoomed
        if (this.isZoomed && this.zoomedModuleIndex !== null && this.zoomedModuleWorldPosition) {
            // Look at the module's world position
            this.camera.lookAt(this.zoomedModuleWorldPosition);
        } else if (this.zoomAnimationProgress < 1) {
            // During exit zoom animation, look at origin
            this.camera.lookAt(0, 0, 0);
        } else {
            // Normal view - look at bomb center
            this.camera.lookAt(0, 0, 0);
        }
        
        if (this.zoomAnimationProgress < 1) {
            // Continue animation
            return;
        }
    }
    
    handleClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // When zoomed, only check wires from the zoomed module
        // When not zoomed, check all modules' wires
        let wireGroupsToCheck = [];
        if (this.isZoomed && this.zoomedModuleIndex !== null) {
            // Only check wires from the zoomed module
            const moduleWires = this.wires[this.zoomedModuleIndex];
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
                
                // Check if module is solved - don't allow clicks on solved modules
                if (this.wiresModulesState && 
                    this.wiresModulesState[moduleIndex] && 
                    this.wiresModulesState[moduleIndex].isSolved) {
                    return; // Module is solved, ignore click
                }
                
                if (!wireGroup.userData.isCut) {
                    // Clear wire hover state when clicking
                    if (this.hoveredWire !== null) {
                        this.setWireHover(this.hoveredWire.moduleIndex, this.hoveredWire.wireIndex, false);
                        this.hoveredWire = null;
                    }
                    
                    // Highlight wire
                    this.highlightWire(moduleIndex, wireIndex);
                    
                    // Trigger wire cut event
                    if (window.onWireCut) {
                        window.onWireCut(moduleIndex, wireIndex);
                    }
                }
            }
        }
    }
    
    highlightWire(moduleIndex, wireIndex) {
        // Remove previous highlight
        if (this.selectedModule !== null && this.selectedWire !== null) {
            if (this.wires[this.selectedModule] && this.wires[this.selectedModule][this.selectedWire]) {
                const prevWire = this.findWireMesh(this.wires[this.selectedModule][this.selectedWire]);
                if (prevWire && prevWire.material && prevWire.material.emissive) {
                    const color = prevWire.material.color;
                    prevWire.material.emissive.setRGB(
                        color.r * 0.15,
                        color.g * 0.15,
                        color.b * 0.15
                    );
                }
            }
        }
        
        // Highlight selected wire
        if (this.wires[moduleIndex] && wireIndex >= 0 && wireIndex < this.wires[moduleIndex].length) {
            this.selectedModule = moduleIndex;
            this.selectedWire = wireIndex;
            const wire = this.findWireMesh(this.wires[moduleIndex][wireIndex]);
            if (wire && wire.material && wire.material.emissive) {
                const r = wire.material.color.r * 0.6;
                const g = wire.material.color.g * 0.6;
                const b = wire.material.color.b * 0.6;
                wire.material.emissive.setRGB(r, g, b);
            }
        }
    }
    
    findWireMesh(wireGroup) {
        for (let child of wireGroup.children) {
            if (child.material && child.material.emissive !== undefined) {
                return child;
            }
        }
        return wireGroup.children[0];
    }
    
    markWireAsCut(moduleIndex, wireIndex) {
        if (this.wires[moduleIndex] && wireIndex >= 0 && wireIndex < this.wires[moduleIndex].length) {
            const wire = this.findWireMesh(this.wires[moduleIndex][wireIndex]);
            if (wire && wire.material) {
                wire.material.opacity = 0.2;
                wire.material.transparent = true;
                wire.userData.isCut = true;
                this.wires[moduleIndex][wireIndex].userData.isCut = true;
            }
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update zoom animation
        this.updateZoomAnimation();
        
        // Update directional light to be behind and above camera, pointing forward
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        const lightOffset = cameraDirection.clone().multiplyScalar(-2); // Behind camera
        const upOffset = new THREE.Vector3(0, 1, 0); // Up direction
        this.directionalLight.position.copy(this.camera.position).add(lightOffset).add(upOffset.multiplyScalar(1.5));
        // Point the light in the camera's forward direction
        const lookAtPoint = this.camera.position.clone().add(cameraDirection.multiplyScalar(10));
        this.directionalLight.lookAt(lookAtPoint);
        
        // Apply bomb rotation - keep at 0 when zoomed, otherwise use current rotation
        if (this.isZoomed) {
            // Keep rotation at 0 when zoomed (already reset in zoomToModule)
            this.bombGroup.rotation.y = 0;
            this.bombGroup.rotation.x = 0;
            this.bombRotationY = 0;
            this.bombRotationX = 0;
        } else {
            // Normal rotation when not zoomed
            this.bombGroup.rotation.y = this.bombRotationY;
            this.bombGroup.rotation.x = this.bombRotationX;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    // Show green glow around module when solved
    showModuleSuccess(moduleIndex) {
        if (!this.moduleGlows || moduleIndex < 0 || moduleIndex >= this.moduleGlows.length) {
            return;
        }
        
        const glowData = this.moduleGlows[moduleIndex];
        if (!glowData) return;
        
        // Set green color for success
        glowData.material.color.setHex(0x00ff00);
        glowData.material.emissive.setHex(0x00ff00);
        glowData.material.emissiveIntensity = 1.2;
        glowData.material.opacity = 0.9;
    }
    
    // Update timer display on bomb screen
    updateTimerDisplay(timeRemaining) {
        if (!this.timerCanvas || !this.timerContext || !this.timerTexture) return;
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Clear canvas
        this.timerContext.fillStyle = '#000000';
        this.timerContext.fillRect(0, 0, this.timerCanvas.width, this.timerCanvas.height);
        
        // Determine color based on time remaining
        let color = '#00ff00'; // Green (default)
        if (timeRemaining < 60) { // Less than 1 minute - red
            color = '#ff0000';
        } else if (timeRemaining < 120) { // Less than 2 minutes - orange
            color = '#ff8800';
        }
        
        // Draw timer text
        this.timerContext.fillStyle = color;
        this.timerContext.font = 'bold 48px "Courier New", monospace';
        this.timerContext.textAlign = 'center';
        this.timerContext.textBaseline = 'middle';
        this.timerContext.fillText(timeDisplay, this.timerCanvas.width / 2, this.timerCanvas.height / 2);
        
        // Update texture
        this.timerTexture.needsUpdate = true;
        
        // Update emissive color to match text color
        if (this.timerScreen && this.timerScreen.material) {
            const emissiveColor = color === '#ff0000' ? 0x220000 : color === '#ff8800' ? 0x221100 : 0x002200;
            this.timerScreen.material.emissive.setHex(emissiveColor);
        }
    }
    
    // Show red flash around module for 1 second when strike occurs
    showModuleStrike(moduleIndex) {
        if (!this.moduleGlows || moduleIndex < 0 || moduleIndex >= this.moduleGlows.length) {
            return;
        }
        
        const glowData = this.moduleGlows[moduleIndex];
        if (!glowData) return;
        
        // Set red color for error
        glowData.material.color.setHex(0xff0000);
        glowData.material.emissive.setHex(0xff0000);
        glowData.material.emissiveIntensity = 2.0;
        glowData.material.opacity = 1.0;
        
        // Animate fade out over 1 second
        const startTime = Date.now();
        const duration = 1000;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Fade out
            glowData.material.opacity = 1.0 - progress;
            glowData.material.emissiveIntensity = 2.0 * (1.0 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Reset to invisible (unless module is solved)
                // Check if module is solved by checking if it's still green
                if (glowData.material.color.getHex() !== 0x00ff00) {
                    glowData.material.opacity = 0;
                    glowData.material.emissiveIntensity = 0;
                }
            }
        };
        
        animate();
    }
}
