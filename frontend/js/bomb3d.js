// Three.js 3D bomb rendering
class Bomb3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.bomb = null;
        this.wiresModule = null;
        this.wires = []; // Array of arrays: wires[moduleIndex] = array of wires for that module
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedWire = null;
        this.selectedModule = null;
        
        this.init();
        this.setupEventListeners();
    }
    
    init() {
        // Scene - lighter background
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x4a4a4a);
        
        // Camera
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(0, 0.8, 5);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('bomb-canvas'),
            antialias: true,
        });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Enhanced lighting - much brighter
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);
        
        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(3, 5, 3);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Additional fill light from the side
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
        fillLight.position.set(-3, 2, 2);
        this.scene.add(fillLight);
        
        // Rim light for better visibility
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
        rimLight.position.set(0, 0, -5);
        this.scene.add(rimLight);
        
        // Create bomb
        this.createBomb();
        
        // Start animation loop
        this.animate();
    }
    
    createBomb() {
        // Main bomb body (rectangular box - wider than tall)
        // Width: 4, Height: 2, Depth: 1.2
        const bombGeometry = new THREE.BoxGeometry(4, 2, 1.2);
        const bombMaterial = new THREE.MeshStandardMaterial({
            color: 0x6a6a6a,  // Lighter gray
            metalness: 0.3,
            roughness: 0.7,
        });
        this.bomb = new THREE.Mesh(bombGeometry, bombMaterial);
        this.bomb.position.y = 0;
        this.bomb.castShadow = true;
        this.bomb.receiveShadow = true;
        this.scene.add(this.bomb);
        
        // Top face
        const topGeometry = new THREE.BoxGeometry(4, 0.1, 1.2);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a5a5a,
            metalness: 0.2,
            roughness: 0.8,
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 1.05;
        this.scene.add(top);
        
        // Timer display (top center of bomb) - rectangular
        const timerGeometry = new THREE.BoxGeometry(0.6, 0.2, 0.15);
        const timerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            metalness: 0.1,
            roughness: 0.9,
        });
        const timer = new THREE.Mesh(timerGeometry, timerMaterial);
        timer.position.y = 1.15;
        timer.position.z = 0.5;
        this.scene.add(timer);
        
        // Timer screen (green/black) - rectangular
        const screenGeometry = new THREE.BoxGeometry(0.55, 0.15, 0.02);
        const screenMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
            emissive: 0x002200,
        });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.y = 1.16;
        screen.position.z = 0.6;
        this.scene.add(screen);
        
        // Create 6 module panels (3x2 grid) on front face
        this.createModulePanels();
    }
    
    createModulePanels() {
        // Create 6 module panels in a 3x2 grid
        // Panel size: 1.1 x 0.85
        // Spacing between panels: 0.1
        // Grid: 3 columns, 2 rows
        
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
                
                // Panel background
                const panelGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
                const panelMaterial = new THREE.MeshStandardMaterial({
                    color: 0x3a3a3a,  // Darker gray for contrast
                    metalness: 0.2,
                    roughness: 0.8,
                });
                const panel = new THREE.Mesh(panelGeometry, panelMaterial);
                panel.position.set(x, y, 0.61);
                this.scene.add(panel);
                
                // Panel border/frame
                const borderGeometry = new THREE.PlaneGeometry(panelWidth + 0.05, panelHeight + 0.05);
                const borderMaterial = new THREE.MeshStandardMaterial({
                    color: 0x2a2a2a,
                    metalness: 0.1,
                    roughness: 0.9,
                });
                const border = new THREE.Mesh(borderGeometry, borderMaterial);
                border.position.set(x, y, 0.605);
                this.scene.add(border);
                
                // Create glow border for module (initially invisible)
                // Use a slightly larger plane positioned behind the module to create a glow effect
                const glowWidth = panelWidth + 0.15;
                const glowHeight = panelHeight + 0.15;
                const glowGeometry = new THREE.PlaneGeometry(glowWidth, glowHeight);
                const glowMaterial = new THREE.MeshStandardMaterial({
                    color: 0x00ff00,
                    emissive: 0x00ff00,
                    emissiveIntensity: 0,
                    transparent: true,
                    opacity: 0,
                    side: THREE.DoubleSide,
                    depthWrite: false, // Don't write to depth buffer so it doesn't occlude
                });
                const glow = new THREE.Mesh(glowGeometry, glowMaterial);
                glow.position.set(x, y, 0.608); // Slightly behind the module
                this.scene.add(glow);
                
                this.modulePanels.push({ panel, border, x, y, row, col });
                this.moduleGlows.push({ glow, material: glowMaterial });
            }
        }
        
        // Set the first panel (top-left) as the wires module
        if (this.modulePanels.length > 0) {
            this.wiresModule = this.modulePanels[0].panel;
        }
    }
    
    updateWires(wiresModules) {
        // Remove all existing wires
        this.wires.forEach(moduleWires => {
            moduleWires.forEach(wire => {
                this.scene.remove(wire);
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
                    panelWidth * 0.8 // Wire length fits in panel
                );
                moduleWires.push(wire);
                this.scene.add(wire);
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
        
        // Wire geometry (horizontal line) - thicker and more visible
        const wireGeometry = new THREE.CylinderGeometry(0.03, 0.03, wireLength, 12);
        
        // Special handling for white wires to make them more distinguishable
        let emissiveColor = new THREE.Color(wireColor).multiplyScalar(0.1);
        if (wireColor === 0xffffff) {
            // White wire: brighter emissive to make it stand out
            emissiveColor = new THREE.Color(0xffffff).multiplyScalar(0.3);
        }
        
        const wireMaterial = new THREE.MeshStandardMaterial({
            color: wireColor,
            metalness: 0.4,
            roughness: 0.6,
            emissive: emissiveColor,
        });
        
        const wire = new THREE.Mesh(wireGeometry, wireMaterial);
        wire.rotation.z = Math.PI / 2;
        wire.position.set(xPos, yPos, 0.62); // On the front face of the box, positioned in the module panel
        wire.userData = { index, color, isCut, moduleIndex };
        
        // Add outline for white wires to improve visibility
        if (wireColor === 0xffffff) {
            const outlineGeometry = new THREE.CylinderGeometry(0.032, 0.032, wireLength, 12);
            const outlineMaterial = new THREE.MeshBasicMaterial({
                color: 0x000000, // Black outline for white
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
        this.container.addEventListener('mousemove', (event) => {
            const rect = this.container.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        });
        
        this.container.addEventListener('click', (event) => {
            this.handleClick(event);
        });
    }
    
    handleClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check all modules' wires - use recursive traversal to include all children (wire mesh and outline)
        let allWireGroups = [];
        this.wires.forEach(moduleWires => {
            if (moduleWires) {
                allWireGroups = allWireGroups.concat(moduleWires);
            }
        });
        
        // Use recursive: true to check all children (including outline meshes for white wires)
        const intersects = this.raycaster.intersectObjects(allWireGroups, true);
        
        if (intersects.length > 0) {
            // Find the wireGroup by traversing up the parent chain
            // This handles cases where we click on the outline mesh (for white wires) or the wire mesh itself
            let clickedObject = intersects[0].object;
            let wireGroup = null;
            
            // Traverse up to find the wireGroup (which has userData with index, color, etc.)
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
                
                if (!wireGroup.userData.isCut) {
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
                    prevWire.material.emissive.setHex(0x000000);
                }
            }
        }
        
        // Highlight selected wire - more visible
        if (this.wires[moduleIndex] && wireIndex >= 0 && wireIndex < this.wires[moduleIndex].length) {
            this.selectedModule = moduleIndex;
            this.selectedWire = wireIndex;
            const wire = this.findWireMesh(this.wires[moduleIndex][wireIndex]);
            if (wire && wire.material && wire.material.emissive) {
                // Make wire glow by setting emissive to a brighter version
                const r = wire.material.color.r * 0.4;
                const g = wire.material.color.g * 0.4;
                const b = wire.material.color.b * 0.4;
                wire.material.emissive.setRGB(r, g, b);
            }
        }
    }
    
    // Helper function to find the wire mesh (not the outline) in a wireGroup
    findWireMesh(wireGroup) {
        for (let child of wireGroup.children) {
            // The wire mesh uses MeshStandardMaterial (which has emissive)
            // The outline uses MeshBasicMaterial (which doesn't have emissive)
            if (child.material && child.material.emissive !== undefined) {
                return child;
            }
        }
        // Fallback: return first child if no mesh with emissive found
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
        
        // No rotation - bomb stays still
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
        
        // Set green color and make visible
        glowData.material.color.setHex(0x00ff00);
        glowData.material.emissive.setHex(0x00ff00);
        glowData.material.emissiveIntensity = 1.0;
        glowData.material.opacity = 0.8;
    }
    
    // Show red flash around module for 1 second when strike occurs
    showModuleStrike(moduleIndex) {
        if (!this.moduleGlows || moduleIndex < 0 || moduleIndex >= this.moduleGlows.length) {
            return;
        }
        
        const glowData = this.moduleGlows[moduleIndex];
        if (!glowData) return;
        
        // Set red color
        glowData.material.color.setHex(0xff0000);
        glowData.material.emissive.setHex(0xff0000);
        glowData.material.emissiveIntensity = 2.0;
        glowData.material.opacity = 1.0;
        
        // Animate fade out over 1 second
        const startTime = Date.now();
        const duration = 1000; // 1 second
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Fade out
            glowData.material.opacity = 1.0 - progress;
            glowData.material.emissiveIntensity = 2.0 * (1.0 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Reset to invisible
                glowData.material.opacity = 0;
                glowData.material.emissiveIntensity = 0;
            }
        };
        
        animate();
    }
}

