// Button creation, updates, and management
class ButtonManager {
    constructor(bombGroup, modulePanels) {
        this.bombGroup = bombGroup;
        this.modulePanels = modulePanels;
        this.buttons = []; // Array of button groups: buttons[moduleIndex] = button group for that module
        this.gauges = []; // Array of gauge groups: gauges[moduleIndex] = gauge group for that module
        this.wireModuleCount = 0; // Number of wire modules (buttons come after wires)
    }
    
    setWireModuleCount(count) {
        this.wireModuleCount = count || 0;
    }
    
    updateButtons(buttonModules) {
        // Remove all existing buttons and gauges
        this.buttons.forEach(buttonGroup => {
            if (buttonGroup) this.bombGroup.remove(buttonGroup);
        });
        this.gauges.forEach(gaugeGroup => {
            if (gaugeGroup) this.bombGroup.remove(gaugeGroup);
        });
        this.buttons = [];
        this.gauges = [];
        
        if (!buttonModules || !Array.isArray(buttonModules)) return;
        
        if (!this.modulePanels || this.modulePanels.length === 0) return;
        
        // Create buttons for each module
        buttonModules.forEach((buttonConfig, buttonModuleIndex) => {
            if (!buttonConfig) return;
            
            // Calculate actual module panel index
            // Buttons are placed after wire modules
            const modulePanelIndex = this.wireModuleCount + buttonModuleIndex;
            const modulePanel = this.modulePanels[modulePanelIndex];
            if (!modulePanel) return;
            
            const panelCenterY = modulePanel.y;
            const panelCenterX = modulePanel.x;
            
            // Create button (center of module)
            const buttonGroup = this.createButton(
                buttonConfig.buttonText,
                buttonConfig.buttonColor,
                buttonConfig.isPressed,
                panelCenterX,
                panelCenterY,
                buttonModuleIndex
            );
            this.buttons[buttonModuleIndex] = buttonGroup;
            this.bombGroup.add(buttonGroup);
            
            // Create gauge (right side of module) - only visible when pressed
            const gaugeGroup = this.createGauge(
                buttonConfig.isPressed ? buttonConfig.gaugeColor : "", // Only show color when pressed
                panelCenterX + 0.4, // Right side
                panelCenterY,
                buttonModuleIndex
            );
            this.gauges[buttonModuleIndex] = gaugeGroup;
            this.bombGroup.add(gaugeGroup);
        });
    }
    
    createButton(text, color, isPressed, xPos, yPos, moduleIndex) {
        const buttonGroup = new THREE.Group();
        
        // Button color mapping
        const colorMap = {
            'red': 0xff0000,
            'blue': 0x0066ff,
            'white': 0xffffff,
        };
        
        const buttonColor = colorMap[color] || 0xffffff;
        
        // Button geometry - cylinder/sphere hybrid
        const buttonGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 32);
        const buttonMaterial = new THREE.MeshStandardMaterial({
            color: buttonColor,
            metalness: 0.7,
            roughness: 0.3,
            emissive: new THREE.Color(buttonColor).multiplyScalar(0.2),
            emissiveIntensity: 0.8,
        });
        
        const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
        button.rotation.x = Math.PI / 2;
        button.position.set(xPos, yPos, 0.62 + (isPressed ? -0.05 : 0));
        button.userData = { text, color, isPressed, moduleIndex };
        
        buttonGroup.add(button);
        
        // Add text label using canvas texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        context.font = 'bold 48px Arial';
        context.fillStyle = '#ffffff';
        context.strokeStyle = '#000000';
        context.lineWidth = 4;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Draw text with outline for visibility
        context.strokeText(text, canvas.width / 2, canvas.height / 2);
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Create plane with text texture
        const textGeometry = new THREE.PlaneGeometry(0.3, 0.15);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
        });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        // Position text below button, on the same plane as the module panel
        textMesh.position.set(xPos, yPos - 0.25, 0.62);
        // No rotation needed - text plane faces forward like the module panel
        buttonGroup.add(textMesh);
        
        // Store text for later rendering
        buttonGroup.userData = { text, color, isPressed, moduleIndex, buttonMesh: button, textMesh: textMesh };
        
        return buttonGroup;
    }
    
    createGauge(color, xPos, yPos, moduleIndex) {
        const gaugeGroup = new THREE.Group();
        
        // Gauge color mapping
        const colorMap = {
            'red': 0xff0000,
            'blue': 0x0066ff,
            'white': 0xffffff,
        };
        
        // If no color, make gauge invisible/transparent
        const gaugeColor = color && color !== '' ? colorMap[color] : 0x000000;
        const opacity = color && color !== '' ? 1.0 : 0.0;
        
        // Gauge geometry - rectangle (box)
        const gaugeWidth = 0.15;
        const gaugeHeight = 0.3;
        const gaugeDepth = 0.05;
        const gaugeGeometry = new THREE.BoxGeometry(gaugeWidth, gaugeHeight, gaugeDepth);
        const gaugeMaterial = new THREE.MeshStandardMaterial({
            color: gaugeColor,
            metalness: 0.6,
            roughness: 0.4,
            emissive: color && color !== '' ? new THREE.Color(gaugeColor).multiplyScalar(0.3) : new THREE.Color(0x000000),
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: opacity,
        });
        
        const gauge = new THREE.Mesh(gaugeGeometry, gaugeMaterial);
        gauge.position.set(xPos, yPos, 0.62);
        gauge.userData = { color, moduleIndex };
        
        gaugeGroup.add(gauge);
        gaugeGroup.userData = { color, moduleIndex, gaugeMesh: gauge };
        
        return gaugeGroup;
    }
    
    updateButtonState(moduleIndex, isPressed) {
        if (this.buttons[moduleIndex]) {
            const buttonGroup = this.buttons[moduleIndex];
            const buttonMesh = buttonGroup.userData.buttonMesh;
            if (buttonMesh) {
                buttonMesh.position.z = 0.62 + (isPressed ? -0.05 : 0);
                buttonGroup.userData.isPressed = isPressed;
            }
        }
    }
    
    updateGaugeColor(moduleIndex, color) {
        if (this.gauges[moduleIndex]) {
            const gaugeGroup = this.gauges[moduleIndex];
            const gaugeMesh = gaugeGroup.userData.gaugeMesh;
            if (gaugeMesh) {
                const colorMap = {
                    'red': 0xff0000,
                    'blue': 0x0066ff,
                    'white': 0xffffff,
                };
                
                // If no color or empty string, hide gauge
                if (!color || color === '') {
                    gaugeMesh.material.opacity = 0.0;
                    gaugeMesh.material.color.setHex(0x000000);
                    gaugeMesh.material.emissive = new THREE.Color(0x000000);
                } else {
                    const gaugeColor = colorMap[color] || 0xffffff;
                    gaugeMesh.material.opacity = 1.0;
                    gaugeMesh.material.color.setHex(gaugeColor);
                    gaugeMesh.material.emissive = new THREE.Color(gaugeColor).multiplyScalar(0.3);
                }
                gaugeGroup.userData.color = color;
            }
        }
    }
}

