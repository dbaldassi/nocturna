import { AdvancedDynamicTexture, TextBlock, Control } from "@babylonjs/gui";
import { Engine, Vector3, FreeCamera, Mesh } from "@babylonjs/core";

import { BaseScene } from "./BaseScene";import { ParentNode } from "../ParentNode";
import { Cube } from "../Cube";
import { CharacterInput, AbstractState, EditorObject } from "../types";
import { InputHandler } from "../InputHandler";
import { Platform, FixedPlatformFactory, ParentedPlatformFactory, PlatformFactory } from "../Platform";

const CUBE_SIZE = 3000;


abstract class EditorState implements AbstractState {
    protected scene: EditorScene;
    protected inputHandler: InputHandler;
    private goNextState: boolean = false;
    private goPreviousState: boolean = false;

    private static stateList: EditorState[] = [];
    private static currentStateIndex: number = 0;

    constructor(scene: EditorScene, inputHandler: InputHandler) {
        this.scene = scene;
        this.inputHandler = inputHandler;
    }

    public static addState(...states: EditorState[]) : void {
        this.stateList.push(...states);
    }

    public static clearState() : void {
        this.stateList = []
        this.currentStateIndex = 0;
    }

    private static nextIndex() : number {
        return (EditorState.currentStateIndex + 1) % EditorState.stateList.length;
    }

    private static previousIndex() : number {
        return (EditorState.currentStateIndex - 1 + EditorState.stateList.length) % EditorState.stateList.length;
    }

    protected getModeChangeText() : string {
        const next = EditorState.nextIndex();
        const previous = EditorState.previousIndex();

        return `+: ${EditorState.stateList[next].name()} -: ${EditorState.stateList[previous].name()}`;
    }

    public abstract name(): string;
    public abstract clone(): EditorState;

    enter() {
        this.inputHandler.addAction("action_plus", () => {
            if(!this.goPreviousState) {
                EditorState.currentStateIndex = EditorState.nextIndex();
                this.goNextState = true;
            }
        });
        this.inputHandler.addAction("action_minus", () => {
            if(!this.goNextState) {
                EditorState.currentStateIndex = EditorState.previousIndex();
                this.goPreviousState = true;
            }
        });
    }

    exit() {
        this.inputHandler.removeAction("action_plus");
        this.inputHandler.removeAction("action_minus");
    }

    update(dt: number, input: CharacterInput): AbstractState | null {
        if (this.goNextState || this.goPreviousState) 
            return EditorState.stateList[EditorState.currentStateIndex].clone();

        return null;
    }
}

class AdditionState extends EditorState {
    private fixedPlatformFactory: FixedPlatformFactory;
    private parentedPlatformFactory: ParentedPlatformFactory;

    constructor(scene: EditorScene, inputHandler: InputHandler) {
        super(scene, inputHandler);

        this.fixedPlatformFactory = new FixedPlatformFactory();
        this.parentedPlatformFactory = new ParentedPlatformFactory(); 
    }

    public name(): string {
        return "Addition Mode";
    }

    public clone(): EditorState{
        return new AdditionState(this.scene, this.inputHandler);
    }

    enter() {
        super.enter();

        this.scene.showMenu(`${this.name()} -> 1: Platform ${this.getModeChangeText()}`);

        this.inputHandler.addAction("action_1", () => this.scene.addPlatform(this.fixedPlatformFactory));
        this.inputHandler.addAction("action_2", () => this.scene.addPlatform(this.parentedPlatformFactory));
    }

    exit() {
        super.exit();
        this.inputHandler.removeAction("action_1");
        this.scene.hideMenu();
    }

    update(dt: number, input: CharacterInput): AbstractState | null {
        this.scene.moveCamera(dt, input);
        return super.update(dt, input);
    }
}

class MoveState extends EditorState {
    constructor(scene: EditorScene, inputHandler: InputHandler) {
        super(scene, inputHandler);
    }

    public clone(): EditorState {
        return new MoveState(this.scene, this.inputHandler);
    }

    public name(): string {
        return "Move mode";
    }

    enter() {
        super.enter();
        this.scene.showMenu(`${this.name()} -> WASD: Move Selection ${this.getModeChangeText()}`);
    }
    exit() {
        super.exit();
        this.scene.hideMenu();
    }

    update(dt: number, input: CharacterInput): AbstractState | null {
        this.scene.moveSelection(dt,input);
        return super.update(dt, input);
    }
}

class RotationState extends EditorState {
    constructor(scene: EditorScene, inputHandler: InputHandler) {
        super(scene, inputHandler);
    }
    enter() {
        super.enter();
        this.scene.showMenu(`${this.name()} -> WASD: Move Selection ${this.getModeChangeText()}`);
    }
    exit() {
        super.exit();
        this.scene.hideMenu();
    }
    update(dt: number, input: CharacterInput): AbstractState | null {
        this.scene.rotateSelection(dt,input);
        return super.update(dt, input);
    }
    public clone(): EditorState {
        return new RotationState(this.scene, this.inputHandler);
    }

    public name(): string {
        return "Rotation mode";
    }

}

class ResizeState extends EditorState {
    constructor(scene: EditorScene, inputHandler: InputHandler) {
        super(scene, inputHandler);
    }
    enter() {
        super.enter();
        this.scene.showMenu(`${this.name()} -> WASD: Move Selection ${this.getModeChangeText()}`);
    }
    exit() {
        super.exit();
        this.scene.hideMenu();
    }
    update(dt: number, input: CharacterInput): AbstractState | null {
        this.scene.resizeSelection(dt,input);
        return super.update(dt, input);
    }
    public clone(): EditorState {
        return new ResizeState(this.scene, this.inputHandler);
    }

    public name(): string {
        return "Resize mode";
    }
}

export class EditorScene extends BaseScene {

    private parentNode: ParentNode;
    private cube: Cube;
    private camera: FreeCamera;
    private currentState: AbstractState;
    private guiTexture: AdvancedDynamicTexture | null = null;
    private currentSelection: EditorObject | null = null;
    private editorObjects: EditorObject[] = [];

    constructor(engine: Engine, inputHandler: InputHandler) {
        super(engine, inputHandler);

        EditorState.clearState();
        EditorState.addState(new AdditionState(this, this.inputHandler),
            new MoveState(this, this.inputHandler),
            new RotationState(this, this.inputHandler),
            new ResizeState(this, this.inputHandler)
        );
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

        scene.setupClickListener();

        return scene;
    }

    private getEditorObjectByMesh(mesh: Mesh): EditorObject | null {
        // Parcourir tous les objets EditorObject pour trouver celui qui correspond au mesh
        return this.editorObjects.find((obj) => obj.getMesh() === mesh) || null;
    }

    private selectEditorObject(object: EditorObject) {
        // Désélectionner l'objet actuel
        if (this.currentSelection) {
            this.currentSelection.setSelected(false);
        }
    
        // Sélectionner le nouvel objet
        this.currentSelection = object;
        this.currentSelection.setSelected(true);
    
        console.log("Selected object:", object);
    }

    private deselectCurrentSelection() {
        if (this.currentSelection) {
            this.currentSelection.setSelected(false);
            this.currentSelection = null;
            console.log("Deselected current object");
        }
    }

    public setupClickListener() {
        this.scene.onPointerDown = (evt, pickResult) => {
            if (pickResult?.hit && pickResult.pickedMesh) {
                // Vérifier si le mesh appartient à un EditorObject
                const selectedObject = this.getEditorObjectByMesh(pickResult.pickedMesh);
                if (selectedObject) {
                    this.selectEditorObject(selectedObject);
                } else {
                    // Si aucun objet n'est sélectionné, désélectionner l'objet actuel
                    this.deselectCurrentSelection();
                }
            }
        };
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
            position.z -= 50/2;
    
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
            this.editorObjects.push(platform);
            this.selectEditorObject(platform);
    
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

    public resizeSelection(dt: number, input: CharacterInput) {
        if (this.currentSelection) {
            this.currentSelection.updateScale(dt, input);
        }
    }

    public rotateSelection(dt: number, input: CharacterInput) {
        if (this.currentSelection) {
            this.currentSelection.updateRotation(dt, input);
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