// Zoom functionality (zoomToModule, exitZoom, animation)
class ZoomManager {
    constructor(camera, bombGroup, modulePanels) {
        this.camera = camera;
        this.bombGroup = bombGroup;
        this.modulePanels = modulePanels;
        
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
        
        // Store original camera position for zoom return
        this.originalCameraPosition.set(0, 0.8, 5);
        this.originalCameraRotation.copy(this.camera.rotation);
    }
    
    zoomToModule(moduleIndex) {
        if (!this.modulePanels || moduleIndex < 0 || moduleIndex >= this.modulePanels.length) {
            return;
        }
        
        const modulePanel = this.modulePanels[moduleIndex];
        if (!modulePanel) return;
        
        // Reset bomb rotation first so we can calculate positions correctly
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
    }
    
    exitZoom() {
        if (!this.isZoomed) return;
        
        this.zoomStartPosition.copy(this.camera.position);
        this.zoomTargetPosition.copy(this.originalCameraPosition);
        this.zoomAnimationStartTime = Date.now();
        this.zoomAnimationProgress = 0;
        this.isZoomed = false;
        this.zoomedModuleIndex = null;
        this.zoomedModuleWorldPosition = null;
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
}

