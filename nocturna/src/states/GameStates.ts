import { createWinScreenHUD, createLoseScreenHUD, IEndScreenHUD } from "../HUD/EndScreenHUD";
import { LevelSelectionObserver, LevelSelectionScene } from "../HUD/LevelSelection";
import { GameScene } from "../scene/GameScene";
import { CharacterInput } from "../types";

/**
 * AbstractGameSceneState is the abstract base class for all game scene states.
 * 
 * - Provides a common interface for state transitions, rendering, and updates.
 * - Stores a reference to the associated GameScene.
 * - Subclasses implement specific logic for each state (in-game, loading, end, selection).
 */
export abstract class AbstractGameSceneState {
    protected gameScene: GameScene;

    constructor(gameScene: GameScene) {
        this.gameScene = gameScene;
    }

    /**
     * Called when entering the state.
     */
    public enter(): void {
        console.log(`Entering state: ${this.constructor.name}`);
    }

    /**
     * Called when exiting the state.
     */
    public exit(): void {}

    /**
     * Renders the state (default: no-op).
     */
    public render(): void { }

    /**
     * Updates the state.
     * @param _ Delta time.
     * @param __ Character input.
     * @returns The next state, or null to stay in the current state.
     */
    public update(_: number, __: CharacterInput): AbstractGameSceneState | null {
        return null;
    }
}

/**
 * InGameState handles the main gameplay loop.
 * 
 * - Updates all game objects and the timer.
 * - Checks for win/lose conditions and transitions to EndState if needed.
 * - Renders the game scene.
 */
export class InGameState extends AbstractGameSceneState {
    constructor(gameScene: GameScene) {
        super(gameScene);
    }

    /**
     * Called when exiting the in-game state. Hides the UI.
     */
    public exit(): void {
        this.gameScene.hideUI();
    }

    /**
     * Updates game objects, timer, and checks for win/lose.
     * @returns EndState if the game is won or lost, otherwise null.
     */
    public update(dt: number, input: CharacterInput): AbstractGameSceneState | null {
        this.gameScene.updateObjects(dt, input);
        this.gameScene.updateTimer(dt);

        if(this.gameScene.checkWin()) {
            return new EndState(this.gameScene, 
                createWinScreenHUD(this.gameScene,
                    this.gameScene.hasNextLevel() ? "continue" : "normal",
                    this.gameScene.getScore(), 
                    this.gameScene.getTimer()));
        }

        if(this.gameScene.checkLoose()) {
            return new EndState(this.gameScene, createLoseScreenHUD(this.gameScene, this.gameScene.getScore(), this.gameScene.getTimer()));
        }

        return null;
    }

    /**
     * Renders the game scene.
     */
    public render(): void {
        this.gameScene.getScene().render();
    }
}

/**
 * LoadingState represents the loading phase of the game scene.
 * 
 * - Used while assets and levels are being loaded.
 * - Can be extended for loading animations or progress bars.
 */
export class LoadingState extends AbstractGameSceneState {
    constructor(gameScene: GameScene) {
        super(gameScene);
    }
}

/**
 * EndState handles the end-of-level screen (win or lose).
 * 
 * - Displays the end screen HUD.
 * - Handles cleanup and HUD disposal.
 * - Waits for user input to continue, retry, or quit.
 */
export class EndState extends AbstractGameSceneState {
    protected hud: IEndScreenHUD;

    constructor(scene: GameScene, hud: IEndScreenHUD) {
        super(scene);
        this.hud = hud;   
    }

    /**
     * Renders the end screen (no-op by default).
     */
    render(): void {}

    /**
     * Called when entering the end state. Removes physics from the scene.
     */
    enter(): void {
        this.gameScene.removePhysics()
    }

    /**
     * Called when exiting the end state. Disposes the HUD.
     */
    exit() {
        this.hud.dispose();
        this.hud = null;
    }

    /**
     * Updates the end screen HUD.
     */
    update(dt: number, input: CharacterInput): AbstractGameSceneState | null {
        this.hud.update(dt, input);
        return null;
    }
}

/**
 * SelectionState manages the level selection screen before starting the game.
 * 
 * - Displays the level selection UI.
 * - Handles user selection of a level to play.
 * - Transitions to LoadingState once a level is selected.
 */
export class SelectionState extends AbstractGameSceneState implements LevelSelectionObserver {
    private levelSelector: LevelSelectionScene;
    private level: string = null;
    private file: string = "game_levels.json";
    private data: JSON = null;

    constructor(gameScene: GameScene) {
        super(gameScene);
    }

    /**
     * Renders the level selection scene.
     */
    public render(): void {
        this.gameScene.getScene().render();
    }

    /**
     * Returns the name of the state.
     */
    public name(): string {
        return "Selection state";
    }

    /**
     * Called when entering the selection state. Initializes the level selector UI.
     */
    enter() {
        this.levelSelector = new LevelSelectionScene(this.gameScene.getScene(), this, this.file);
    }

    /**
     * Called when exiting the selection state. Disposes the selector and loads the chosen level.
     */
    exit() {
        this.levelSelector.dispose();
        if (this.level) {
            this.gameScene.createLevel(this.level);
        } else if (this.data) {
            this.gameScene.createLevelFromData(this.data);
        }
    }

    /**
     * Updates the state. Transitions to LoadingState if a level is selected or data transmitted.
     */
    update(_: number, __: CharacterInput): AbstractGameSceneState | null {
        return this.level || this.data ? new LoadingState(this.gameScene) : null;
    }

    /**
     * Callback when a level is selected by the user.
     * @param level The selected level file.
     */
    onLevelSelected(level: string): void {
        this.level = level;
    }

    /**
     * Callback when data is transmitted (not used in this state).
     * @param _ Data transmitted.
     */
    onDataTransmited(data: JSON): void {
        this.data = data;
    }
}