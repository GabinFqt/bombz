// Scene, camera, renderer, and lighting setup
class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.directionalLight = null;
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
    }
    
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
}

