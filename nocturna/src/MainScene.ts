import { Scene, Vector3, HemisphericLight, FollowCamera, MeshBuilder, StandardMaterial, Color3, DirectionalLight, Mesh, ExecuteCodeAction, ActionManager } from "@babylonjs/core";
import { Character } from "./Character";
import { InputHandler } from "./InputHandler";

export class MainScene {
    private scene: Scene;
    private character: Character;
    private inputHandler: InputHandler;
    private camera: FollowCamera;
    private platforms: Mesh[] = [];

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
        const ground = MeshBuilder.CreateGround("ground", { width: 1000, height: 1000 }, this.scene);
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

         // Créer des plateformes
        const platform1 = MeshBuilder.CreateBox("platform1", { width: 5, height: 0.5, depth: 2 }, this.scene);
        platform1.position = new Vector3(6, 2, 0); // Position de la plateforme
        this.platforms.push(platform1);

        const platform2 = MeshBuilder.CreateBox("platform2", { width: 5, height: 0.5, depth: 2 }, this.scene);
        platform2.position = new Vector3(12, 4, 0); // Position de la plateforme
        this.platforms.push(platform2);

        const platformMaterial = new StandardMaterial("platformMaterial", this.scene);
        platformMaterial.diffuseColor = new Color3(0.8, 0.8, 0.8); // Couleur grise
        this.platforms.forEach(platform => {
            platform.material = platformMaterial;
        });

        this.platforms.forEach(platform => {
            platform.actionManager = new ActionManager(this.scene);

            platform.actionManager.registerAction(
                new ExecuteCodeAction(
                    {
                        trigger: ActionManager.OnIntersectionEnterTrigger,
                        parameter: this.character.mesh,
                    },
                    () => {
                        console.log("Character entered the platform:", platform.name);
                        this.character.onPlatformEnter(platform);
                        // this.isOnGround = true;
                        // this.velocity.y = 0;
                        // this.character.mesh.position.y = platform.position.y + 1;
                    }
                )
            );
    
            platform.actionManager.registerAction(
                new ExecuteCodeAction(
                    {
                        trigger: ActionManager.OnIntersectionExitTrigger,
                        parameter: this.character.mesh,
                    },
                    () => {
                        console.log("Character left the platform:", platform.name);
                        // this.isOnGround = false;
                        this.character.onPlatformExit(platform);
                    }
                )
            );
        });
    }

    public update(dt: number) {
        const input = this.inputHandler.getInput();
        this.character.update(dt, input);
    }

    public render() {
        this.scene.render();
    }
}