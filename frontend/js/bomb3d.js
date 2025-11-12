// Three.js 3D bomb rendering - Futuristic Design
// Main Bomb3D class that orchestrates all modules
class Bomb3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        // Initialize scene manager
        this.sceneManager = new SceneManager(containerId);
        this.sceneManager.init();
        
        // Create bomb group for rotation
        this.bombGroup = new THREE.Group();
        this.sceneManager.scene.add(this.bombGroup);
        
        // Initialize bomb geometry
        this.bombGeometry = new BombGeometry(this.bombGroup);
        this.bombGeometry.createBomb();
        
        // Initialize wires manager
        this.wiresManager = new WiresManager(this.bombGroup, this.bombGeometry.modulePanels);
        
        // Initialize button manager
        this.buttonManager = new ButtonManager(this.bombGroup, this.bombGeometry.modulePanels);
        
        // Initialize terminal manager
        this.terminalManager = new TerminalManager(this.bombGroup, this.bombGeometry.modulePanels);
        
        // Initialize visual feedback manager
        this.visualFeedbackManager = new VisualFeedbackManager(
            this.bombGeometry.moduleGlows,
            this.wiresManager.wires
        );
        
        // Initialize zoom manager
        this.zoomManager = new ZoomManager(
            this.sceneManager.camera,
            this.bombGroup,
            this.bombGeometry.modulePanels
        );
        
        // Initialize animation manager
        this.animationManager = new AnimationManager(
            this.sceneManager.scene,
            this.sceneManager.camera,
            this.sceneManager.renderer,
            this.sceneManager.directionalLight,
            this.bombGroup,
            this.zoomManager
        );
        
        // Store wiresModules, buttonModules, and terminalModules state to check if modules are solved
        this.wiresModulesState = null;
        this.buttonModulesState = null;
        this.terminalModulesState = null;
        
        // Initialize interaction manager
        this.interactionManager = new InteractionManager(
            this.container,
            this.sceneManager.scene,
            this.sceneManager.camera,
            this.bombGroup,
            this.bombGeometry.modulePanels,
            this.wiresManager.wires,
            () => this.wiresModulesState, // Getter function for wiresModulesState
            this.zoomManager,
            this.animationManager,
            this.visualFeedbackManager,
            this.wiresManager,
            this.buttonManager,
            () => this.buttonModulesState, // Getter function for buttonModulesState
            this.terminalManager,
            () => this.terminalModulesState // Getter function for terminalModulesState
        );
        this.interactionManager.setupEventListeners();
        
        // Start animation loop
        this.animationManager.animate();
        
        // Expose references for backward compatibility
        this.scene = this.sceneManager.scene;
        this.camera = this.sceneManager.camera;
        this.renderer = this.sceneManager.renderer;
        this.bomb = this.bombGeometry.bomb;
        this.wiresModule = this.bombGeometry.wiresModule;
        this.wires = this.wiresManager.wires;
        this.modulePanels = this.bombGeometry.modulePanels;
        this.moduleGlows = this.bombGeometry.moduleGlows;
    }
    
    // Public API methods - maintain backward compatibility
    
    updateWires(wiresModules) {
        // Store wiresModules state to check if modules are solved
        this.wiresModulesState = wiresModules;
        
        // Update wires manager
        this.wiresManager.updateWires(wiresModules);
        
        // Update visual feedback manager's wire reference
        this.visualFeedbackManager.wires = this.wiresManager.wires;
        
        // Update interaction manager's wire reference and wiresModulesState
        this.interactionManager.wires = this.wiresManager.wires;
        this.interactionManager.wiresModulesState = () => this.wiresModulesState;
    }
    
    markWireAsCut(moduleIndex, wireIndex) {
        this.wiresManager.markWireAsCut(moduleIndex, wireIndex);
    }
    
    onWindowResize() {
        this.sceneManager.onWindowResize();
    }
    
    showModuleSuccess(moduleIndex) {
        this.visualFeedbackManager.showModuleSuccess(moduleIndex);
    }
    
    updateTimerDisplay(timeRemaining) {
        this.bombGeometry.updateTimerDisplay(timeRemaining);
    }
    
    showModuleStrike(moduleIndex) {
        this.visualFeedbackManager.showModuleStrike(moduleIndex);
    }
    
    updateButtons(buttonModules) {
        // Store buttonModules state
        this.buttonModulesState = buttonModules;
        
        // Update button manager with wire module count for correct panel indexing
        const wireModuleCount = this.wiresModulesState ? this.wiresModulesState.length : 0;
        this.buttonManager.setWireModuleCount(wireModuleCount);
        
        // Update buttons manager
        this.buttonManager.updateButtons(buttonModules);
        
        // Update button states and gauge colors
        if (buttonModules && Array.isArray(buttonModules)) {
            buttonModules.forEach((module, moduleIndex) => {
                if (module) {
                    // Update button pressed state
                    this.buttonManager.updateButtonState(moduleIndex, module.isPressed || false);
                    
                    // Update gauge color (only show when pressed)
                    const gaugeColor = module.isPressed ? (module.gaugeColor || '') : '';
                    this.buttonManager.updateGaugeColor(moduleIndex, gaugeColor);
                }
            });
        }
    }
    
    updateTerminals(terminalModules) {
        // Store terminalModules state
        this.terminalModulesState = terminalModules;
        
        // Update terminal manager with module counts for correct panel indexing
        const wireModuleCount = this.wiresModulesState ? this.wiresModulesState.length : 0;
        const buttonModuleCount = this.buttonModulesState ? this.buttonModulesState.length : 0;
        this.terminalManager.setModuleCounts(wireModuleCount, buttonModuleCount);
        
        // Update terminals manager
        this.terminalManager.updateTerminals(terminalModules);
        
        // Update terminal states
        if (terminalModules && Array.isArray(terminalModules)) {
            terminalModules.forEach((module, moduleIndex) => {
                if (module) {
                    this.terminalManager.updateTerminalState(
                        moduleIndex,
                        module.terminalTexts || [],
                        module.currentStep || 0,
                        module.enteredCommands || [],
                        module.isSolved || false
                    );
                }
            });
        }
    }
}
