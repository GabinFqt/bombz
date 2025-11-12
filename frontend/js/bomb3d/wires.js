// Wire creation, updates, and management
class WiresManager {
    constructor(bombGroup, modulePanels) {
        this.bombGroup = bombGroup;
        this.modulePanels = modulePanels;
        this.wires = []; // Array of arrays: wires[moduleIndex] = array of wires for that module
    }
    
    updateWires(wiresModules) {
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
    
    findWireMesh(wireGroup) {
        for (let child of wireGroup.children) {
            if (child.material && child.material.emissive !== undefined) {
                return child;
            }
        }
        return wireGroup.children[0];
    }
}

