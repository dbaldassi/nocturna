import { Scene, Vector3, HemisphericLight, FollowCamera, MeshBuilder, StandardMaterial, Color3, DirectionalLight, Mesh, ExecuteCodeAction, ActionManager } from "@babylonjs/core";
import { Character } from "./Character";
import { InputHandler } from "./InputHandler";
import { CharacterInput } from "./types";
import { Ball } from "./Ball"

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
    private ball: Ball;

    public sendPosition: (input: Vector3) => void;

    constructor(engine: any) {
        this.scene = new Scene(engine);

        this.initializeScene();

        this.ball.start();
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
        this.ball = new Ball(this.scene, new Vector3(0,2,0), 1);
        this.addCollisions(this.character.mesh, this.ball);

        this.inputHandler = new InputHandler();
        console.log("Character created:", this.character.mesh);

        // this.addPlatformsAboveCharacter(5, 10, 1, 2, 3, 5); // Add platforms above the character
        this.createBoundary(this.width, this.height, 10); // Create the boundaries
        
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

    private addCollisions(src: Mesh, dst: any) {
        if(!dst.mesh.actionManager) {
            dst.mesh.actionManager = new ActionManager(this.scene);
        }

        dst.mesh.actionManager.registerAction(
            new ExecuteCodeAction({
                    trigger: ActionManager.OnIntersectionEnterTrigger,
                    parameter: src,
                },
                () => dst.onPlatformEnter(src)
            )
        );

        dst.mesh.actionManager.registerAction(
            new ExecuteCodeAction({
                    trigger: ActionManager.OnIntersectionExitTrigger,
                    parameter: src,
                },
                () => dst.onPlatformExit(src)
            )
        );   
    }

    public addRemoteCharacter(caller : boolean) {
        this.character.mesh.position.x = caller ? 10 : 0;

        this.remoteCharacter = new Character(new Vector3(caller ? 0 : 10, 1, 0), this.scene, "remotePlayer", new Vector3(this.width, 0, 30));
        this.addCollisions(this.remoteCharacter.mesh, this.character);
    }

    addPlatformsAboveCharacter(platformCount: number, platformWidth: number, platformHeight: number, spacing: number, columnCount: number, columnSpacing: number) {
        for (let col = 0; col < columnCount; col++) {
            for (let i = 0; i < platformCount; i++) {
                const platform = MeshBuilder.CreateBox(`platform_${col}_${i}`, { width: platformWidth, height: 1, depth: platformHeight }, this.scene);
                const platformMaterial = new StandardMaterial(`platformMaterial_${col}_${i}`, this.scene);
                platformMaterial.diffuseColor = new Color3(0.7, 0.7, 0.7); // Grayish color
                platform.material = platformMaterial;

                // Position the platform in a grid-like structure
                platform.position.x = col * (platformWidth + columnSpacing); // Horizontal spacing for columns
                platform.position.y = this.character.mesh.position.y + 2 + (i + 1) * spacing; // Vertical spacing for rows
                platform.position.z = 0; // Centered in depth

                this.platforms.push(platform); // Add to the platforms array
                console.log(`Platform column ${col}, row ${i} created at position:`, platform.position);
            }
        }
    }

    private createBoundary(width: number, height: number, depth: number) {
        const wallThickness = 1; // Épaisseur des murs
    
        // Mur gauche
        const leftWall = MeshBuilder.CreateBox("leftWall", { width: wallThickness, height: height, depth: depth }, this.scene);
        leftWall.position.x = -width / 2;
        leftWall.position.y = height / 2;
    
        // Mur droit
        const rightWall = MeshBuilder.CreateBox("rightWall", { width: wallThickness, height: height, depth: depth }, this.scene);
        rightWall.position.x = width / 2;
        rightWall.position.y = height / 2;
    
        // Mur avant
        const frontWall = MeshBuilder.CreateBox("frontWall", { width: width, height: height, depth: wallThickness }, this.scene);
        frontWall.position.z = -depth / 2;
        frontWall.position.y = height / 2
    
        // Mur arrière
        /*const backWall = MeshBuilder.CreateBox("backWall", { width: width, height: height, depth: wallThickness }, this.scene);
        backWall.position.z = depth / 2;
        backWall.position.y = height / 2;
        backWall.checkCollisions = true;*/
    
        // Plafond (optionnel, si nécessaire)
        const ceiling = MeshBuilder.CreateBox("ceiling", { width: width, height: wallThickness, depth: depth }, this.scene);
        ceiling.position.y = 10;

        [leftWall, rightWall, frontWall, ceiling].forEach(wall => {
            this.addCollisions(wall, this.character);
            this.addCollisions(wall, this.ball);
        });
    }

    public updateRemoteCharacter(position: Vector3) {
        this.remoteCharacter.mesh.position = position;
    }

    public update(dt: number) {
        const input = this.inputHandler.getInput();
        this.character.update(dt, input);
        this.ball.update(dt);

        if(this.sendPosition) this.sendPosition(this.character.mesh.position);
    }

    public render() {
        this.scene.render();
    }
}