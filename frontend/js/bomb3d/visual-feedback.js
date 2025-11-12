// Module success/strike effects, wire highlighting, glow effects
class VisualFeedbackManager {
    constructor(moduleGlows, wires) {
        this.moduleGlows = moduleGlows;
        this.wires = wires;
        this.selectedWire = null;
        this.selectedModule = null;
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
    
    setWireHover(moduleIndex, wireIndex, isHovered, findWireMesh) {
        if (!this.wires[moduleIndex] || wireIndex < 0 || wireIndex >= this.wires[moduleIndex].length) {
            return;
        }
        
        const wireGroup = this.wires[moduleIndex][wireIndex];
        if (!wireGroup || wireGroup.userData.isCut) {
            return;
        }
        
        const wire = findWireMesh(wireGroup);
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
    
    highlightWire(moduleIndex, wireIndex, findWireMesh) {
        // Remove previous highlight
        if (this.selectedModule !== null && this.selectedWire !== null) {
            if (this.wires[this.selectedModule] && this.wires[this.selectedModule][this.selectedWire]) {
                const prevWire = findWireMesh(this.wires[this.selectedModule][this.selectedWire]);
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
            const wire = findWireMesh(this.wires[moduleIndex][wireIndex]);
            if (wire && wire.material && wire.material.emissive) {
                const r = wire.material.color.r * 0.6;
                const g = wire.material.color.g * 0.6;
                const b = wire.material.color.b * 0.6;
                wire.material.emissive.setRGB(r, g, b);
            }
        }
    }
    
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

