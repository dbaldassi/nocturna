import { AdvancedDynamicTexture, TextBlock, Control } from "@babylonjs/gui";
import { Engine, Vector3, FreeCamera, MeshBuilder } from "@babylonjs/core";

import { BaseScene } from "./BaseScene";import { ParentNode } from "../ParentNode";
import { Cube } from "../Cube";
import { CharacterInput, AbstractState, EditorObject } from "../types";
import { InputHandler } from "../InputHandler";
import { Platform, FixedPlatformFactory, ParentedPlatformFactory, PlatformFactory } from "../Platform";

const CUBE_SIZE = 3000;

class AdditionState implements AbstractState {
    private scene: EditorScene;
    private nextState: boolean = false;
    private inputHandler: InputHandler;
    private fixedPlatformFactory: FixedPlatformFactory;
    private parentedPlatformFactory: ParentedPlatformFactory;

    constructor(scene: EditorScene, inputHandler: InputHandler) {
        this.scene = scene;
        this.inputHandler = inputHandler;

        this.fixedPlatformFactory = new FixedPlatformFactory();
        this.parentedPlatformFactory = new ParentedPlatformFactory(); 
    }

    enter() {
        console.log("Entering Addition State");
        this.scene.showMenu("Addition mode -> 1: Platform 0: Move Mode");

        this.inputHandler.addAction("action_1", () => {
            // add platform
            this.scene.addPlatform(this.fixedPlatformFactory);
        });
        this.inputHandler.addAction("action_2", () => {
            // add platform
            this.scene.addPlatform(this.parentedPlatformFactory);
        });
        this.inputHandler.addAction("action_0", () => {
            this.nextState = true;
        });
    }

    exit() {
        this.inputHandler.removeAction("action_1");
        this.inputHandler.removeAction("action_0");

        console.log("Exiting Addition State");
        this.scene.hideMenu();
    }

    update(dt: number, input: CharacterInput): AbstractState | null {
        // Logic for addition state

        if(this.nextState) {
            return new MoveState(this.scene, this.inputHandler);
        }

        this.scene.moveCamera(dt, input);
        return null;
    }
}

class MoveState implements AbstractState {
    private scene: EditorScene;
    private nextState: boolean = false;
    private inputHandler: InputHandler;

    constructor(scene: EditorScene, inputHandler: InputHandler) {
        this.inputHandler = inputHandler;
        this.scene = scene;
    }

    enter() {
        console.log("Entering Move State");
        this.scene.showMenu("Move mode -> WASD: Move Selection 0: Resize Mode");
        this.inputHandler.addAction("action_0", () => {
            this.nextState = true;
        });
    }
    exit() {
        this.inputHandler.removeAction("action_0");
        console.log("Exiting Move State");
        this.scene.hideMenu();
    }

    update(dt: number, input: CharacterInput): AbstractState | null {
        // Logic for move state
        if(this.nextState) {
            return new AdditionState(this.scene, this.inputHandler);
        }
       
        this.scene.moveSelection(dt,input);

        return null;
    }
}

export class EditorScene extends BaseScene {

    private parentNode: ParentNode;
    private cube: Cube;
    private camera: FreeCamera;
    private currentState: AbstractState;
    private guiTexture: AdvancedDynamicTexture | null = null;
    private currentSelection: EditorObject | null = null;

    constructor(engine: Engine, inputHandler: InputHandler) {
        super(engine, inputHandler);
    }

    static async createScene(engine: Engine, inputHandler: InputHandler): Promise<BaseScene> {
        const scene = new EditorScene(engine, inputHandler);
        scene.parentNode = new ParentNode(Vector3.Zero(), scene.scene);
        scene.parentNode.setupKeyActions(scene.inputHandler);
        scene.cube = new Cube(scene.scene, CUBE_SIZE);
        scene.cube.mesh.position = new Vector3(0, CUBE_SIZE / 2, 0);

        // const ground = MeshBuilder.CreateGround("ground", { width: 1000, height: 1000 }, scene.scene);
        // ground.isPickable = true; // Permet au raycast de détecter ce plan
        // ground.visibility = 0; // Rendre le plan invisible

        scene.camera = new FreeCamera("camera", new Vector3(0, 0, -500), scene.scene);
        // scene.camera.setTarget(Vector3.Zero()); // La caméra regarde vers l'origine
        scene.camera.attachControl(true); // Permet de contrôler la caméra avec la souris et le clavier
        scene.camera.speed = 2; // Vitesse de la caméra

        scene.scene.activeCamera = scene.camera;

        scene.currentState = new AdditionState(scene, scene.inputHandler);
        scene.currentState.enter();

        return scene;
    }

    public showMenu(text: string) {
        // Créer une texture GUI pour afficher les instructions
        this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    
        // Créer un bloc de texte pour les instructions
        const instructions = new TextBlock();
        instructions.text = text;
        instructions.color = "black";
        instructions.fontSize = 24;
        instructions.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        instructions.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        instructions.paddingBottom = 20; // Ajouter un peu d'espace en bas
    
        // Ajouter le texte à la texture GUI
        this.guiTexture.addControl(instructions);
    }

    public hideMenu() {
        if (this.guiTexture) {
            this.guiTexture.dispose(); // Supprime la texture GUI
            this.guiTexture = null;
        }
    }

    public addPlatform(factory: PlatformFactory) {
        // Effectuer un raycast à partir de la position de la souris
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
    
        if (pickResult?.hit && pickResult.pickedPoint) {
            // Récupérer la position où la souris pointe
            const position = pickResult.pickedPoint;
            // position.z = 0;
    
            // Configurer les paramètres de la plateforme
            const config = {
                position: position,
                rotation: Vector3.Zero(),
                size: new Vector3(50, 5, 50),
                scene: this.scene,
                parent: this.parentNode,
            };
    
            // Créer la plateforme avec la factory
            const platform = factory.createForEditor(config);
            this.currentSelection = platform;
    
            console.log("Platform created at:", position);
        } else {
            console.log("No intersection detected.");
        }
    }

    public moveCamera(dt:number, input: CharacterInput) {
        const moveSpeed = this.camera.speed * dt;
        this.camera.position.x += (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed;
        this.camera.position.y += (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed;
    }

    public moveSelection(dt: number, input: CharacterInput) {
        if (this.currentSelection) {
            this.currentSelection.updatePosition(dt, input);
        }
    }

    public update(dt: number) {
        const input = this.inputHandler.getInput();

        this.parentNode.update();

        const nextState = this.currentState.update(dt, input);
        if (nextState) {
            this.currentState.exit();
            this.currentState = nextState;
            this.currentState.enter();
        }
    }
}