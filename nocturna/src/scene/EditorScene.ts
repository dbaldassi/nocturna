import { AdvancedDynamicTexture, TextBlock, Control } from "@babylonjs/gui";
import { Engine, Vector3, FreeCamera, Mesh, Scene, AssetsManager } from "@babylonjs/core";

import { BaseScene } from "./BaseScene";import { ParentNode } from "../ParentNode";
import { Cube } from "../Cube";
import { CharacterInput, AbstractState, EditorObject, GameObjectFactory, Utils } from "../types";
import { InputHandler } from "../InputHandler";
import { FixedPlatform, FixedPlatformFactory, ParentedPlatform, ParentedPlatformFactory } from "../GameObjects/Platform";
import { Player, PlayerFactory } from "../GameObjects/Player";
import { VictoryCondition, VictoryConditionFactory } from "../GameObjects/Victory";
import { LevelLoader, LevelLoaderObserver } from "../LevelLoader";
import { LevelSelectionScene, LevelSelectionObserver } from "../LevelSelection";
import { FixedRocket, FixedRocketFactory } from "../GameObjects/Rocket";
import { SpikeTrapFactory, SpikeTrapObject } from "../GameObjects/SpikeTrap";
import { Coin, CoinFactory } from "../GameObjects/Coin";

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
        this.inputHandler.addAction("action_multi", () => {
            this.scene.setMultiMode();
        });
    }

    exit() {
        this.inputHandler.removeAction("action_plus");
        this.inputHandler.removeAction("action_minus");
        this.inputHandler.removeAction("action_multi");
    }

    update(_: number, __: CharacterInput): AbstractState | null {
        if (this.goNextState || this.goPreviousState) 
            return EditorState.stateList[EditorState.currentStateIndex].clone();

        return null;
    }
}

class AdditionState extends EditorState {
    private factories : Map<string, GameObjectFactory>; 

    constructor(scene: EditorScene, inputHandler: InputHandler) {
        super(scene, inputHandler);
        this.factories = new Map<string, GameObjectFactory>();
        this.factories.set(ParentedPlatform.Type, new ParentedPlatformFactory());
        this.factories.set(FixedPlatform.Type, new FixedPlatformFactory());
        this.factories.set(VictoryCondition.Type, new VictoryConditionFactory());
        this.factories.set(Player.Type, new PlayerFactory());
        this.factories.set(FixedRocket.Type, new FixedRocketFactory());
        this.factories.set(SpikeTrapObject.Type, new SpikeTrapFactory());
        this.factories.set(Coin.Type, new CoinFactory());
    }

    public name(): string {
        return "Addition Mode";
    }

    public clone(): EditorState {
        return new AdditionState(this.scene, this.inputHandler);
    }

    enter() {
        super.enter();

        this.scene.showMenu(`${this.name()} -> 1: Fixed Platform 2: Parented Platform 3: Spike Trap 4: Coin 5: Player 6: Victory f: clone ${this.getModeChangeText()}`);

        this.inputHandler.addAction("action_1", () => this.scene.addObject(this.factories.get(FixedPlatform.Type)));
        this.inputHandler.addAction("action_2", () => this.scene.addObject(this.factories.get(ParentedPlatform.Type)));
        this.inputHandler.addAction("action_3", () => this.scene.addObject(this.factories.get(SpikeTrapObject.Type)));
        this.inputHandler.addAction("action_4", () => this.scene.addObject(this.factories.get(Coin.Type)));
        this.inputHandler.addAction("action_5", () => this.scene.addObject(this.factories.get(Player.Type)));
        this.inputHandler.addAction("action_6", () => this.scene.addObject(this.factories.get(VictoryCondition.Type)));
        this.inputHandler.addAction("clone", () => this.scene.clone(this.factories));
        this.inputHandler.addAction("delete", () => this.scene.deleteSelection());
    }

    exit() {
        super.exit();
        this.inputHandler.removeAction("action_1");
        this.inputHandler.removeAction("action_2");
        this.inputHandler.removeAction("action_3");
        this.inputHandler.removeAction("action_4");
        this.inputHandler.removeAction("delete");
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

    public name(): string {
        return "Move mode";
    }

    public clone(): EditorState {
        return new MoveState(this.scene, this.inputHandler);
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

    public name(): string {
        return "Resize mode";
    }

    public clone(): EditorState {
        return new ResizeState(this.scene, this.inputHandler);
    }
}

class InitState implements AbstractState {
    
    public name(): string {
        return "Init state";
    }

    enter() {}
    exit() {}

    update(_: number, __: CharacterInput): AbstractState | null {
        return null;
    }
}

class SelectionState implements AbstractState, LevelSelectionObserver {
    private scene: EditorScene;
    private levelSelector: LevelSelectionScene;
    private level :string = null;

    constructor(scene: EditorScene) {
        this.scene = scene;
    }

    public name(): string {
        return "Selection state";
    }

    enter() {
        this.levelSelector = new LevelSelectionScene(this.scene.getScene(), this);

    }
    exit() {
        this.scene.getScene().dispose();
        this.scene.createLevel(this.level);
    }

    update(_: number, __: CharacterInput): AbstractState | null {
        return this.level ? new InitState() : null;
    }

    onLevelSelected(level: string): void {
        this.level = level;
    }
}

export class EditorScene extends BaseScene implements LevelLoaderObserver {

    private parentNode: ParentNode;
    private cube: Cube;
    private camera: FreeCamera;
    private currentState: AbstractState;
    private guiTexture: AdvancedDynamicTexture | null = null;
    private currentSelection: EditorObject | null = null;
    private editorObjects: EditorObject[] = [];
    private levelLoader: LevelLoader;
    private assetsManager: AssetsManager;

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
        
        scene.currentState = new SelectionState(scene);
        scene.currentState.enter();

        return scene;
    }

    public createLevel(level: string): void {
        this.scene = new Scene(this.engine);
        this.levelLoader = new LevelLoader(this.scene, this, { create: (factory: GameObjectFactory, config: any) => factory.createForEditor(config) });

        this.assetsManager = new AssetsManager(this.scene);
        this.assetsManager.useDefaultLoadingScreen = false;

        this.inputHandler.addAction("save", () => this.serializeScene());

        this.camera = new FreeCamera("camera", new Vector3(0, 0, -250), this.scene);
        this.camera.attachControl(true); // Permet de contrôler la caméra avec la souris et le clavier
        this.camera.speed = 2; // Vitesse de la caméra

        this.scene.activeCamera = this.camera;

        this.setupClickListener();

        this.levelLoader.loadLevel(level);
    }

    public setMultiMode() {
        this.cube.setupMulti();
    }

    public onCube(cube: Cube): void {
        this.cube = cube;
    }
    public onPlayer(_: Player): void {}
    public onParent(parent: ParentNode): void {
        this.parentNode = parent;
        this.parentNode.setupKeyActions(this.inputHandler);
    }
    public onLevelLoaded(): void {
        this.currentState = new AdditionState(this, this.inputHandler);
        this.currentState.enter();
    }
    public onObjectCreated(object: EditorObject): void {
        this.editorObjects.push(object);
    }

    private getEditorObjectByMesh(mesh: Mesh): EditorObject | null {
        // Parcourir tous les objets EditorObject pour trouver celui qui correspond au mesh
        return this.editorObjects.find((obj) => obj.getMeshes().includes(mesh)) || null;
    }

    private selectEditorObject(object: EditorObject) {
        // Désélectionner l'objet actuel
        if (this.currentSelection) {
            this.currentSelection.setSelected(false);
        }
    
        // Sélectionner le nouvel objet
        this.currentSelection = object;
        this.currentSelection.setSelected(true);

        console.log(Utils.getTotalBoundingBox(object.getMeshes()));
    }

    private deselectCurrentSelection() {
        if (this.currentSelection) {
            this.currentSelection.setSelected(false);
            this.currentSelection = null;
        }
    }

    public setupClickListener() {
        this.scene.onPointerDown = (_, pickResult) => {
            console.log("Pointer down event:");
            if (pickResult?.hit && pickResult.pickedMesh) {
                console.log("Mesh clicked:", pickResult.pickedMesh.name);
                // Vérifier si le mesh appartient à un EditorObject
                const selectedObject = this.getEditorObjectByMesh(pickResult.pickedMesh as Mesh);
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
        this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);
    
        // Créer un bloc de texte pour les instructions
        const instructions = new TextBlock();
        instructions.text = `${text} enter: Save Scene`;
        instructions.color = "white";
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

    public addObject(factory: GameObjectFactory, size?: Vector3, rotation?: Vector3) {
        // Effectuer un raycast à partir de la position de la souris
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
    
        if (pickResult?.hit && pickResult.pickedPoint) {
            // Récupérer la position où la souris pointe
            const position = pickResult.pickedPoint;
    
            // Configurer les paramètres de la plateforme
            const config = {
                position: position,
                rotation: rotation ?? Vector3.Zero(),
                size: size,
                scene: this.scene,
                parent: this.parentNode,
                assetsManager: this.assetsManager
            };

            // Créer la plateforme avec la factory
            const object = factory.createForEditor(config);
            this.editorObjects.push(object);

            this.assetsManager.load();
            this.assetsManager.onFinish = () => {
                this.scene.executeWhenReady(() => {
                    object.getMeshes().forEach(m => m.refreshBoundingInfo());
                    
                    const totalbox = Utils.getTotalBoundingBox(object.getMeshes());
                    const box = totalbox.maximum.subtract(totalbox.minimum);
                    console.log("rotation : ", object.getMesh().rotation);
                    object.move(new Vector3(0, 0, -box.z / 2)); // Ajuster la position pour que l'objet soit au-dessus du sol
                    // object.getMesh().position.z -= box.z / 2; 
                    this.selectEditorObject(object);
                });
            }
    
        } else {
            console.log("No intersection detected.");
        }
    }

    public moveCamera(dt:number, input: CharacterInput) {
        const moveSpeed = this.camera.speed * dt;
        this.camera.position.x += (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed;
        this.camera.position.y += (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed;
        this.camera.position.z += (input.forward ? 1 : (input.backward ? -1 : 0)) * moveSpeed;
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

    public deleteSelection() {
        console.log("Deleting selection");

        if (this.currentSelection) {
            if (this.editorObjects.includes(this.currentSelection)) {
                // Supprimer l'objet de la scène
                this.editorObjects = this.editorObjects.filter((obj) => obj !== this.currentSelection);
                this.currentSelection.getMesh().dispose();
                this.currentSelection = null;
            }
        }
    }

    public update(dt: number) {
        const input = this.inputHandler.getInput();

        const nextState = this.currentState.update(dt, input);
        if (nextState) {
            this.currentState.exit();
            this.currentState = nextState;
            this.currentState.enter();
        }
    }

    public serializeScene(): void {
        const serializedObjects = this.editorObjects.map((obj) => obj.serialize());
        const jsonScene = { objects : serializedObjects }; // Convertir en JSON formaté
        jsonScene[Cube.Type] = this.cube.serialize();
        jsonScene[ParentNode.Type] = this.parentNode.serialize();
    
        // Créer un Blob contenant le JSON
        const blob = new Blob([JSON.stringify(jsonScene)], { type: "application/json" });
    
        // Créer un lien de téléchargement
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "scene.json"; // Nom du fichier téléchargé
        a.style.display = "none";
    
        // Ajouter le lien au document et déclencher le clic
        document.body.appendChild(a);
        a.click();
    
        // Nettoyer le DOM
        document.body.removeChild(a);
    
        console.log("Scene serialized and download triggered.");
    }

    getScene(): Scene {
        return this.scene;
    }

    public clone(factories: Map<string, GameObjectFactory>) {
        if (this.currentSelection) {
            const type = this.currentSelection.getType();
            const factory = factories.get(type);
            
            if(factory) {
                const config = this.currentSelection.getMesh();
                this.addObject(factory, config.scaling, config.rotation);
            }
        }
    }
}