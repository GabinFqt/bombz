// Bomb body, timer display, and module panels creation
class BombGeometry {
    constructor(bombGroup) {
        this.bombGroup = bombGroup;
        this.bomb = null;
        this.modulePanels = [];
        this.moduleGlows = [];
        this.wiresModule = null;
        this.timerScreen = null;
        this.timerCanvas = null;
        this.timerContext = null;
        this.timerTexture = null;
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
}

