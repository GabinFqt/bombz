// Animation loop and frame updates
class AnimationManager {
    constructor(scene, camera, renderer, directionalLight, bombGroup, zoomManager) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.directionalLight = directionalLight;
        this.bombGroup = bombGroup;
        this.zoomManager = zoomManager;
        
        // Rotation state
        this.isRotating = false;
        this.rotationSpeed = 0.005;
        this.bombRotationX = 0;
        this.bombRotationY = 0;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update zoom animation
        this.zoomManager.updateZoomAnimation();
        
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
        if (this.zoomManager.isZoomed) {
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
    
    updateRotation(deltaX, deltaY) {
        if (this.zoomManager.isZoomed) return;
        
        this.bombRotationY += deltaX * this.rotationSpeed;
        this.bombRotationX += deltaY * this.rotationSpeed;
        
        // Limit vertical rotation
        this.bombRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.bombRotationX));
    }
    
    setRotating(isRotating) {
        this.isRotating = isRotating;
    }
}

