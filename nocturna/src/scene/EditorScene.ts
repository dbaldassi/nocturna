import { Engine, Vector3, FreeCamera, Mesh, Scene, AssetsManager, StaticSound, CreateSoundAsync } from "@babylonjs/core";

import { BaseScene } from "./BaseScene";import { ParentNode } from "../ParentNode";
import { Cube } from "../Cube";
import { CharacterInput, AbstractState, EditorObject, GameObjectFactory, Utils } from "../types";
import { InputHandler } from "../InputHandler";
import { Player } from "../GameObjects/Player";
import { LevelLoader, LevelLoaderObserver } from "../LevelLoader";
import { createHUDEditor, IHUDEditor, IHUDEditorListener } from "../HUD/EditorHUD";
import { EditorState, AdditionState, MoveState, RotationState, ResizeState, SelectionState } from "../states/EditorState";

/**
 * EditorScene provides the in-game level editor for Nocturna.
 * 
 * Allows users to create, modify, and test custom levels in a 3D environment.
 * Handles adding, selecting, moving, rotating, resizing, cloning, and deleting objects.
 * Uses Babylon.js for rendering, picking, camera control, and asset management.
 * Integrates a HUD for editor controls and mode display.
 * Manages editor states (Addition, Move, Rotation, Resize, Selection) via a state machine.
 * Plays sound feedback for editor actions (select, drop, delete, save, etc.).
 * Supports serialization/export of the current level to a JSON file.
 * 
 * Implements:
 * - LevelLoaderObserver: callbacks when the level/cube/parent/player are loaded.
 * - IHUDEditorListener: callbacks for HUD actions (mode, cancel, remove, clone).
 */
export class EditorScene extends BaseScene implements LevelLoaderObserver, IHUDEditorListener {

    private parentNode: ParentNode;
    private cube: Cube;
    private camera: FreeCamera;
    private currentState: AbstractState;
    private currentSelection: EditorObject | null = null;
    private editorObjects: EditorObject[] = [];
    private levelLoader: LevelLoader;
    private assetsManager: AssetsManager;
    private hud : IHUDEditor | null = null;
    private sounds: Map<string, StaticSound> = new Map<string, StaticSound>();

    /**
     * Initializes the editor, states, loads sounds, and prepares the HUD.
     */
    constructor(engine: Engine, inputHandler: InputHandler) {
        super(engine, inputHandler);

        EditorState.clearState();

        // States order
        EditorState.addState(new AdditionState(this, this.inputHandler),
            new MoveState(this, this.inputHandler),
            new RotationState(this, this.inputHandler),
            new ResizeState(this, this.inputHandler)
        );

        // Load sounds
        const audio = [
            { name: "drop", path: "assets/sounds/drop_003.ogg" },
            { name: "select", path: "assets/sounds/select_007.ogg" },
            { name: "unselect", path: "assets/sounds/error_007.ogg" },
            { name: "delete", path: "assets/sounds/scratch_005.ogg" },
            { name: "clone", path: "assets/sounds/drop_003.ogg" },
            { name: "mode", path: "assets/sounds/bong_001.ogg" },
//             { name: "move", path: "assets/sounds/move.ogg" },
            { name: "save", path: "assets/sounds/confirmation_003.ogg" },
        ];
        
        audio.forEach(({ name, path }) => {
            CreateSoundAsync(name, path).then(sound => {
                this.sounds.set(name, sound);
            });
        });
    }

    /**
     * Plays a sound for editor actions.
     * @param name Name of the sound to play.
     */
    playSound(name: string): void {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.play();
        } else {
            console.warn(`Sound "${name}" not found.`);
        }
    }

    /**
     * Static factory to create and initialize a new EditorScene.
     */
    static async createScene(engine: Engine, inputHandler: InputHandler): Promise<BaseScene> {
        const scene = new EditorScene(engine, inputHandler);
        
        scene.currentState = new SelectionState(scene);
        scene.currentState.enter();

        return scene;
    }

    /**
     * Loads a level from a file or JSON string.
     * @param level The level to load.
     */
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

    /**
     * Enables multi-mode setup for the editor (prepares the cube for multiplayer).
     */
    public setMultiMode(): void {
        this.cube.setupMulti();
    }

    /**
     * Callback when the cube is loaded.
     */
    public onCube(cube: Cube): void {
        this.cube = cube;
    }
    public onPlayer(_: Player): void {}
    /**
     * Callback when the parent node is loaded.
     */
    public onParent(parent: ParentNode): void {
        this.parentNode = parent;
        this.parentNode.setupKeyActions(this.inputHandler);
    }
    /**
     * Callback when the level is fully loaded.
     */
    public onLevelLoaded(): void {
        this.currentState = new AdditionState(this, this.inputHandler);
        this.currentState.enter();

        this.hud = createHUDEditor(this.getScene(), this);
    }
    /**
     * Callback when an object is created in the editor.
     */
    public onObjectCreated(object: EditorObject): void {
        this.editorObjects.push(object);
    }

    /**
     * Finds the EditorObject corresponding to a Babylon mesh.
     */
    private getEditorObjectByMesh(mesh: Mesh): EditorObject | null {
        // Parcourir tous les objets EditorObject pour trouver celui qui correspond au mesh
        return this.editorObjects.find((obj) => obj.getMeshes().includes(mesh)) || null;
    }

    /**
     * Selects an EditorObject in the editor.
     */
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

    /**
     * Deselects the current selection.
     */
    private deselectCurrentSelection() {
        if (this.currentSelection) {
            this.currentSelection.setSelected(false);
            this.currentSelection = null;
            this.playSound("unselect");
        }
    }

    /**
     * Sets up the mouse click listener for object selection.
     */
    public setupClickListener() {
        this.scene.onPointerDown = (_, pickResult) => {
            console.log("Pointer down event:");
            if (pickResult?.hit && pickResult.pickedMesh) {
                console.log("Mesh clicked:", pickResult.pickedMesh.name);
                // Vérifier si le mesh appartient à un EditorObject
                const selectedObject = this.getEditorObjectByMesh(pickResult.pickedMesh as Mesh);
                if (selectedObject) {
                    this.selectEditorObject(selectedObject);
                    this.playSound("select");
                } else {
                    // Si aucun objet n'est sélectionné, désélectionner l'objet actuel
                    this.deselectCurrentSelection();
                }
            }
        };
    }

    /**
     * Adds a new object at the position pointed by the mouse.
     */
    public addObject(factory: GameObjectFactory, size?: Vector3, rotation?: Vector3) {
        // Do a raycast to find the position where the mouse is pointing
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
    
        if (pickResult?.hit && pickResult.pickedPoint) {
            // Get the position of the picked point
            const position = pickResult.pickedPoint;
    
            const config = {
                position: position,
                rotation: rotation ?? Vector3.Zero(),
                size: size,
                scene: this.scene,
                parent: this.parentNode,
                assetsManager: this.assetsManager
            };

            const object = factory.createForEditor(config);
            this.editorObjects.push(object);

            this.assetsManager.load();
            this.assetsManager.onFinish = () => {
                this.scene.executeWhenReady(() => {
                    this.playSound("drop");

                    object.getMeshes().forEach(m => m.refreshBoundingInfo());
                    
                    const totalbox = Utils.getTotalBoundingBox(object.getMeshes());
                    const box = totalbox.maximum.subtract(totalbox.minimum);
                    console.log("rotation : ", object.getMesh().rotation);
                    object.move(new Vector3(0, 0, -box.z / 2)); // Translate so the object is not in the wall
                    this.selectEditorObject(object);
                });
            }
    
        } else {
            console.log("No intersection detected.");
        }
    }

    /**
     * Moves the camera based on keyboard input.
     */
    public moveCamera(dt:number, input: CharacterInput) {
        const moveSpeed = this.camera.speed * dt;
        this.camera.position.x += (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed;
        this.camera.position.y += (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed;
        this.camera.position.z += (input.forward ? 1 : (input.backward ? -1 : 0)) * moveSpeed;
    }

    /**
     * Moves the selected object.
     */
    public moveSelection(dt: number, input: CharacterInput) {
        if (this.currentSelection) {
            this.currentSelection.updatePosition(dt, input);
        }
    }

    /**
     * Resizes the selected object.
     */
    public resizeSelection(dt: number, input: CharacterInput) {
        if (this.currentSelection) {
            this.currentSelection.updateScale(dt, input);
        }
    }

    /**
     * Rotates the selected object.
     */
    public rotateSelection(dt: number, input: CharacterInput) {
        if (this.currentSelection) {
            this.currentSelection.updateRotation(dt, input);
        }
    }

    /**
     * Deletes the selected object from the scene.
     */
    public deleteSelection() {
        console.log("Deleting selection");

        if (this.currentSelection) {
            if (this.editorObjects.includes(this.currentSelection)) {
                this.playSound("delete");
                // Supprimer l'objet de la scène
                this.editorObjects = this.editorObjects.filter((obj) => obj !== this.currentSelection);
                this.currentSelection.getMesh().dispose();
                this.currentSelection = null;
            }
        }
    }

    /**
     * Main update loop for the editor.
     */
    public update(dt: number) {
        const input = this.inputHandler.getInput();

        const nextState = this.currentState.update(dt, input);
        if (nextState) {
            this.currentState.exit();
            this.currentState = nextState;
            this.currentState.enter();
            this.hud?.setMode(this.currentState.name());
            this.playSound("mode");
        }
    }

    /**
     * Serializes the current scene and triggers a JSON download.
     */
    public serializeScene(): void {
        const serializedObjects = this.editorObjects.map((obj) => obj.serialize());
        const jsonScene = { objects : serializedObjects }; // Convertir en JSON formaté
        jsonScene[Cube.Type] = this.cube.serialize();
        jsonScene[ParentNode.Type] = this.parentNode.serialize();

        this.playSound("save");
    
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

    /**
     * Returns the current Babylon.js scene.
     */
    getScene(): Scene {
        return this.scene;
    }

    /**
     * Clones the selected object.
     */
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

    // HUD methods (mode navigation, cancel, remove, clone)
    onNextMode(): void {
        
    }

    onPreviousMode(): void {
        console.log("Previous mode");
    }

    onCancelSelection(): void {
        // unselect the current selection
        this.deselectCurrentSelection();
    }

    onRemoveSelection(): void {
        this.deleteSelection();
    }

    onCloneSelection(): void {
        // this.clone(this.parentNode.getFactories());
    }
}