import { Scene, Vector3, HemisphericLight, FollowCamera, MeshBuilder, StandardMaterial, Color3, DirectionalLight } from "@babylonjs/core";
import { Character } from "./Character";
import { InputHandler } from "./InputHandler";

export class MainScene {
    private scene: Scene;
    private character: Character;
    private inputHandler: InputHandler;
    private camera: FollowCamera;

    constructor(engine: any) {
        this.scene = new Scene(engine);
        this.initializeScene();
    }

    private initializeScene() {
        // Create a hemispheric light
        const light = new HemisphericLight("light", new Vector3(0, 10, 0), this.scene);
        light.intensity = 1.0; // Augmentez l'intensité pour tester

        // const directionalLight = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), this.scene);
        // directionalLight.intensity = 1.0;

        // Create the ground
        const ground = MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, this.scene);
        const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
        groundMaterial.diffuseColor = new Color3(0.5, 0.8, 0.5); // Greenish color
        ground.material = groundMaterial;
        ground.position.y = 0; // Assurez-vous que le sol est à la hauteur 0
        console.log("Ground created:", ground);

        // Initialize the character as a cube
        this.character = new Character(new Vector3(0, 1, 0), this.scene);
        this.inputHandler = new InputHandler();
        console.log("Character created:", this.character.mesh);

        // Initialize the camera
        this.camera = new FollowCamera("FollowCamera", new Vector3(0, 10, 10), this.scene); // Position temporaire
        // this.camera.target = new Vector3(0, 1, 0);
        this.camera.lockedTarget = this.character.mesh; 
        this.camera.radius = 10; 
        this.camera.heightOffset = 5; 
        this.camera.rotationOffset = 0; 
        this.camera.fov = 1.2; 

        this.scene.activeCamera = this.camera; // Set the camera as active
        console.log("Camera initialized:", this.camera);
        console.log("Camera position:", this.camera.position);
        console.log("Camera target:", this.camera.getTarget());
    }

    public update(dt: number) {
        const input = this.inputHandler.getInput();
        this.character.update(dt, input);
    }

    public render() {
        this.scene.render();
    }
}