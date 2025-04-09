import { Scene, Vector3, HemisphericLight, FollowCamera, MeshBuilder, StandardMaterial, Color3, DirectionalLight, Mesh, ExecuteCodeAction, ActionManager } from "@babylonjs/core";
import { Character } from "./Character";
import { InputHandler } from "./InputHandler";
import { CharacterInput } from "./types";

export class MainScene {
    private scene: Scene;
    private character: Character;
    private remoteCharacter: Character = undefined;
    private remoteInput: CharacterInput = undefined;
    private inputHandler: InputHandler;
    private camera: FollowCamera;
    private platforms: Mesh[] = [];
    private readonly width: number = 100;
    private readonly height: number = 50;

    public sendPosition: (input: Vector3) => void;

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
        const ground = MeshBuilder.CreateGround("ground", { width: this.width, height: this.height }, this.scene);
        const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
        groundMaterial.diffuseColor = new Color3(0.5, 0.8, 0.5); // Greenish color
        ground.material = groundMaterial;
        ground.position.y = 0; // Assurez-vous que le sol est à la hauteur 0
        console.log("Ground created:", ground);

        // Initialize the character as a cube
        this.character = new Character(new Vector3(0, 1, 0), this.scene, "localPlayer", new Vector3(this.width, 0, 30));

        this.inputHandler = new InputHandler();
        console.log("Character created:", this.character.mesh);

        // Initialize the camera
        this.camera = new FollowCamera("FollowCamera", new Vector3(0, 10, 100), this.scene); // Position temporaire
        // this.camera.target = new Vector3(0, 1, 0);
        this.camera.lockedTarget = this.character.mesh; 
        this.camera.radius = 20; 
        this.camera.heightOffset = 5; 
        this.camera.rotationOffset = 0; 
        this.camera.fov = 1.2; 

        this.scene.activeCamera = this.camera; // Set the camera as active
        console.log("Camera initialized:", this.camera);
        console.log("Camera position:", this.camera.position);
        console.log("Camera target:", this.camera.getTarget());
    }

    public addRemoteCharacter(caller : boolean) {
        this.character.mesh.position.x = caller ? 10 : 0;

        this.remoteCharacter = new Character(new Vector3(caller ? 0 : 10, 1, 0), this.scene, "remotePlayer", new Vector3(this.width, 0, 30));

        this.remoteCharacter.mesh.actionManager = new ActionManager(this.scene);
        this.remoteCharacter.mesh.actionManager.registerAction(
            new ExecuteCodeAction({
                    trigger: ActionManager.OnIntersectionEnterTrigger,
                    parameter: this.character.mesh,
                },
                () => this.character.onPlatformEnter(this.remoteCharacter.mesh)
            )
        );

        this.remoteCharacter.mesh.actionManager.registerAction(
            new ExecuteCodeAction({
                    trigger: ActionManager.OnIntersectionExitTrigger,
                    parameter: this.character.mesh,
                },
                () => this.character.onPlatformExit(this.remoteCharacter.mesh)
            )
        );
    }

    public updateRemoteCharacter(position: Vector3) {
        this.remoteCharacter.mesh.position = position;
    }

    public update(dt: number) {
        const input = this.inputHandler.getInput();
        this.character.update(dt, input);

        if(this.sendPosition) this.sendPosition(this.character.mesh.position);
    }

    public render() {
        this.scene.render();
    }
}