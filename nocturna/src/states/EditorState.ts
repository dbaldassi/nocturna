import { Coin, CoinFactory } from "../GameObjects/Coin";
import { ParentedPlatform, ParentedPlatformFactory, FixedPlatform, FixedPlatformFactory } from "../GameObjects/Platform";
import { Player, PlayerFactory } from "../GameObjects/Player";
import { FixedRocket, FixedRocketFactory } from "../GameObjects/Rocket";
import { SpikeTrapObject, SpikeTrapFactory } from "../GameObjects/SpikeTrap";
import { VictoryCondition, VictoryConditionFactory } from "../GameObjects/Victory";
import { InputHandler } from "../InputHandler";
import { LevelSelectionObserver, LevelSelectionScene } from "../HUD/LevelSelection";
import { EditorScene } from "../scene/EditorScene";
import { AbstractState, CharacterInput, GameObjectFactory } from "../types";

/**
 * EditorState is the abstract base class for all editor mode states in the level editor.
 * 
 * - Manages state transitions (next/previous mode).
 * - Handles registration and switching of editor states.
 * - Provides a template for state-specific logic (Addition, Move, Rotation, Resize).
 * 
 * Subclasses must implement `name()` and `clone()`.
 */
export abstract class EditorState implements AbstractState {
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

    public static addState(...states: EditorState[]): void {
        this.stateList.push(...states);
    }

    public static clearState(): void {
        this.stateList = []
        this.currentStateIndex = 0;
    }

    private static nextIndex(): number {
        return (EditorState.currentStateIndex + 1) % EditorState.stateList.length;
    }

    private static previousIndex(): number {
        return (EditorState.currentStateIndex - 1 + EditorState.stateList.length) % EditorState.stateList.length;
    }

    protected getModeChangeText(): string {
        const next = EditorState.nextIndex();
        const previous = EditorState.previousIndex();

        return `+: ${EditorState.stateList[next].name()} -: ${EditorState.stateList[previous].name()}`;
    }

    public abstract name(): string;
    public abstract clone(): EditorState;

    enter() {
        this.inputHandler.addAction("action_plus", () => {
            if (!this.goPreviousState) {
                EditorState.currentStateIndex = EditorState.nextIndex();
                this.goNextState = true;
            }
        });
        this.inputHandler.addAction("action_minus", () => {
            if (!this.goNextState) {
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

/**
 * AdditionState allows the user to add new objects to the level.
 * 
 * - Maps input actions to object creation (platforms, coins, traps, player, etc.).
 * - Handles cloning and deletion of selected objects.
 * - Inherits state transition logic from EditorState.
 */
export class AdditionState extends EditorState {
    private factories: Map<string, GameObjectFactory>;

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
        return "Addition";
    }

    public clone(): EditorState {
        return new AdditionState(this.scene, this.inputHandler);
    }

    enter() {
        super.enter();

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
    }

    update(dt: number, input: CharacterInput): AbstractState | null {
        this.scene.moveCamera(dt, input);
        return super.update(dt, input);
    }
}

/**
 * MoveState allows the user to move the selected object in the editor.
 * 
 * - Handles input for moving the current selection.
 * - Inherits state transition logic from EditorState.
 */
export class MoveState extends EditorState {
    constructor(scene: EditorScene, inputHandler: InputHandler) {
        super(scene, inputHandler);
    }

    public name(): string {
        return "Move";
    }

    public clone(): EditorState {
        return new MoveState(this.scene, this.inputHandler);
    }

    enter() {
        super.enter();
    }
    exit() {
        super.exit();
    }

    update(dt: number, input: CharacterInput): AbstractState | null {
        this.scene.moveSelection(dt, input);
        return super.update(dt, input);
    }
}

/**
 * RotationState allows the user to rotate the selected object in the editor.
 * 
 * - Handles input for rotating the current selection.
 * - Inherits state transition logic from EditorState.
 */
export class RotationState extends EditorState {
    constructor(scene: EditorScene, inputHandler: InputHandler) {
        super(scene, inputHandler);
    }

    enter() {
        super.enter();
    }
    exit() {
        super.exit();
    }
    update(dt: number, input: CharacterInput): AbstractState | null {
        this.scene.rotateSelection(dt, input);
        return super.update(dt, input);
    }
    public clone(): EditorState {
        return new RotationState(this.scene, this.inputHandler);
    }

    public name(): string {
        return "Rotation";
    }
}

/**
 * ResizeState allows the user to resize the selected object in the editor.
 * 
 * - Handles input for resizing the current selection.
 * - Inherits state transition logic from EditorState.
 */
export class ResizeState extends EditorState {
    constructor(scene: EditorScene, inputHandler: InputHandler) {
        super(scene, inputHandler);
    }
    enter() {
        super.enter();
    }
    exit() {
        super.exit();
    }
    update(dt: number, input: CharacterInput): AbstractState | null {
        this.scene.resizeSelection(dt, input);
        return super.update(dt, input);
    }

    public name(): string {
        return "Resize";
    }

    public clone(): EditorState {
        return new ResizeState(this.scene, this.inputHandler);
    }
}

/**
 * InitState is a placeholder state used for initialization.
 * 
 * - Does not perform any actions or transitions.
 */
export class InitState implements AbstractState {

    public name(): string {
        return "Init state";
    }

    enter() { }
    exit() { }

    update(_: number, __: CharacterInput): AbstractState | null {
        return null;
    }
}

/**
 * SelectionState manages the level selection screen in the editor.
 * 
 * - Displays the level selection UI.
 * - Handles user selection of a level to edit.
 * - Transitions to InitState once a level is selected.
 */
export class SelectionState implements AbstractState, LevelSelectionObserver {
    private scene: EditorScene;
    private levelSelector: LevelSelectionScene;
    private level: string = null;

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

    onDataTransmited(_: JSON): void {
    }
}
