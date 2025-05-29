/**
 * MultiHUD.ts defines the interfaces and classes for displaying the multiplayer HUD in Nocturna.
 * 
 * Responsibilities:
 * - Displays the local player's status (HP and score) and available actions.
 * - Displays the status (HP and score) of remote players in the same session.
 * - Updates the HUD in real time as player stats or actions change.
 * - Provides methods to add, update, and remove remote players from the HUD.
 * - Integrates with Babylon.js GUI for all UI elements.
 * - Supports dynamic inventory/action bar and animated status bars.
 * 
 * Usage:
 * - Use `createHUDMulti(scene, listener, maxHp, maxScore)` to instantiate the HUD.
 * - Use `addAction` and `removeAction` to manage available actions.
 * - Use `updateScore` and `updateHp` to update the local player's stats.
 * - Use `addRemotePlayer`, `updateRemotePlayer`, and `removeRemotePlayer` to manage remote players.
 * - Call `dispose()` to clean up resources when the HUD is no longer needed.
 */

import { Scene } from "@babylonjs/core";
import { AdvancedDynamicTexture, Control, Rectangle, StackPanel, TextBlock, Image } from "@babylonjs/gui";
import { InputHandler } from "../InputHandler";
import { Action } from "../action";

export interface IHUDMulti {
    addAction(index: number, action: Action.Type): void;
    removeAction(index: number): void;
    updateScore(score: number): void;
    updateHp(hp: number): void;
    addRemotePlayer(id: string): void;
    updateRemotePlayer(id: string, hp: number, score: number): void;
    removeRemotePlayer(id: string): void;
    dispose(): void;
}

/**
 * IHUDMultiListener defines callbacks for multiplayer HUD actions.
 * (Extend this interface to handle action selection or other events.)
 */
export interface IHUDMultiListener {
    // onActionSelected(index: number): void;
}

/**
 * Factory function to create a multiplayer HUD instance.
 * @param scene The Babylon.js scene.
 * @param listener The HUD event listener.
 * @param maxHp The maximum HP for the player.
 * @param maxScore The maximum score for the player.
 * @returns An IHUDMulti implementation.
 */
export function createHUDMulti(scene: Scene, listener: IHUDMultiListener, maxHp: number, maxScore: number): IHUDMulti {
    return new MultiHUD(scene, listener, maxHp, maxScore);
}

/**
 * MultiHUD implements the IHUDMulti interface and manages the multiplayer HUD UI.
 * 
 * - Displays the local player's HP and score as animated bars.
 * - Shows available actions in an inventory bar with icons and key bindings.
 * - Displays remote players' HP and score in separate status panels.
 * - Updates the HUD in real time as player stats or actions change.
 * - Handles dynamic addition/removal of remote players.
 * - Cleans up all GUI resources on disposal.
 */
class MultiHUD implements IHUDMulti {
    private scene: Scene;
    private gui: AdvancedDynamicTexture;
    private listener: IHUDMultiListener | null = null;
    private actions: Rectangle[] = [];
    private actionsIconPaths: Map<Action.Type, string> = new Map();
    private maxHp: number;
    private maxScore: number;
    private playerStatus: Rectangle;
    private hpAssetsPath:  { left: string, center: string, right: string }; 
    private scoreAssetsPath:  { left: string, center: string, right: string }; 
    private emptyAssetsPath:  { left: string, center: string, right: string }; 
    private remoteContainers: Map<string, { container: Rectangle, score: number, hp: number } > = new Map(); 
    private remoteStatusPanels: StackPanel;
    private mainHudContainer: StackPanel | null = null;

    private currentScore: number = 0;
    private currentHp: number = 0;

    private readonly numberOfActions = 3;

    /**
     * Constructs a new MultiHUD.
     * @param scene The Babylon.js scene.
     * @param listener The HUD event listener.
     * @param maxHp The maximum HP for the player.
     * @param maxScore The maximum score for the player.
     */
    constructor(scene: Scene, listener: IHUDMultiListener, maxHp: number, maxScore: number) {
        this.scene = scene;
        this.gui = AdvancedDynamicTexture.CreateFullscreenUI("MultiHUD", true, this.scene);
        this.listener = listener;
        this.maxHp = maxHp;
        this.maxScore = maxScore;

        // Set up icon paths for each action type
        this.actionsIconPaths.set(Action.Type.ROTATE_X, "/assets/hud/multi/rotate_x.png");
        this.actionsIconPaths.set(Action.Type.ROTATE_Y, "/assets/hud/multi/rotate_y.png");
        this.actionsIconPaths.set(Action.Type.ROTATE_Z, "/assets/hud/multi/rotate_z.png");
        this.actionsIconPaths.set(Action.Type.SPIKE, "/assets/hud/editor/spikes.png");
        this.actionsIconPaths.set(Action.Type.ROCKET, "/assets/hud/multi/rocket.png");

        // Asset paths for status bars
        this.hpAssetsPath = {
            left: "/assets/hud/multi/hp_left.png",
            center: "/assets/hud/multi/hp_center.png",
            right: "/assets/hud/multi/hp_right.png"
        };
        this.scoreAssetsPath = {
            left: "/assets/hud/multi/score_left.png",
            center: "/assets/hud/multi/score_center.png",
            right: "/assets/hud/multi/score_right.png"
        };
        this.emptyAssetsPath = {
            left: "/assets/hud/multi/empty_left.png",
            center: "/assets/hud/multi/empty_center.png",
            right: "/assets/hud/multi/empty_right.png"
        };

        this.init();
    }

    /**
     * Initializes the HUD layout and GUI controls.
     */
    public init(): void {
        this.playerStatus = this.createStatusContainer();
        const inventory = this.createInventoryBar();

        // Main vertical container for the entire HUD
        this.mainHudContainer = new StackPanel();
        this.mainHudContainer.isVertical = true;
        this.mainHudContainer.width = 1.0;
        this.mainHudContainer.height = "160px";
        this.mainHudContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.mainHudContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

        // Remote status panels (vertical, above the local player)
        this.remoteStatusPanels = new StackPanel();
        this.remoteStatusPanels.isVertical = true;
        this.remoteStatusPanels.width = "100%";
        this.remoteStatusPanels.height = "0px";
        this.remoteStatusPanels.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.remoteStatusPanels.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

        // Local player bar + inventory (horizontal, at the bottom)
        const playerBarContainer = new StackPanel("PlayerBarContainer");
        playerBarContainer.isVertical = false;
        playerBarContainer.width = "100%";
        playerBarContainer.height = "160px";
        playerBarContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        playerBarContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

        playerBarContainer.addControl(this.playerStatus);
        playerBarContainer.addControl(inventory);

        // Add remote panels (top), then local player bar (bottom)
        this.mainHudContainer.addControl(this.remoteStatusPanels);
        this.mainHudContainer.addControl(playerBarContainer);

        this.gui.addControl(this.mainHudContainer);
    }

    /**
     * Adds an action icon to the inventory bar at the specified index.
     * @param index The action slot index.
     * @param action The action type.
     */
    public addAction(index: number, action: Action.Type) {
        const actionContainer = this.actions[index];
        const iconPath = this.actionsIconPaths.get(action);

        const icon = new Image("icon", iconPath);
        icon.width = "60px";
        icon.height = "60px";
        icon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        icon.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        icon.zIndex = 1;
        actionContainer.addControl(icon);
    }

    /**
     * Removes the action icon from the inventory bar at the specified index.
     * @param index The action slot index.
     */
    public removeAction(index: number): void {
        const actionContainer = this.actions[index];
        const iconControl = actionContainer.children.find(child => child.name === "icon");
        if (iconControl) {
            actionContainer.removeControl(iconControl);
        }
    }

    /**
     * Updates the local player's score bar.
     * @param score The new score value.
     */
    public updateScore(score: number): void {
        if(this.currentScore === score || !this.playerStatus || !this.playerStatus.children) return;
        this.updateStatus(this.playerStatus, "Score", score, this.maxScore, this.scoreAssetsPath);
        this.currentScore = score;
    }

    /**
     * Updates the local player's HP bar.
     * @param hp The new HP value.
     */
    public updateHp(hp: number): void {
        if(this.currentHp === hp || !this.playerStatus || !this.playerStatus.children) return;
        this.updateStatus(this.playerStatus, "HP", hp, this.maxHp, this.hpAssetsPath);
        this.currentHp = hp;
    }

    private updateStatus(container: Rectangle, label:string, value: number, max: number, assets: any): void {
        const panel = container.children[0] as StackPanel;
        if(!panel || !panel.children) return;   

        const index = panel.children.findIndex(child => child.name === label);

        if (index !== -1) {
            const oldBar = panel.children[index];
            panel.removeControl(oldBar);
            oldBar.dispose();

            const newBar = this.createStatusBar(label, value, max, assets, this.emptyAssetsPath);
            panel.addControl(newBar);
            panel.children.splice(index, 0, panel.children.pop());
        }
    }

    public addRemotePlayer(id: string): void {
        if (this.remoteContainers.has(id)) {
            console.warn(`Remote player with id ${id} already exists.`);
            return;
        }

        const remoteContainer = this.createRemoteStatusContainer(id);
        this.remoteContainers.set(id, {container: remoteContainer, score:0, hp:0});
        this.remoteStatusPanels.addControl(remoteContainer);

        this.remoteStatusPanels.height = `${this.remoteContainers.size * 160}px`;
        this.mainHudContainer.height = `${160 + this.remoteContainers.size * 160}px`;
    }

    /**
     * Updates a remote player's HP and score in the HUD.
     * @param id The remote player's ID.
     * @param hp The new HP value.
     * @param score The new score value.
     */
    public updateRemotePlayer(id: string, hp: number, score: number): void {
        const remoteContainer = this.remoteContainers.get(id);
        if (!remoteContainer) {
            console.warn(`Remote player with id ${id} does not exist.`);
            return;
        }

        if(remoteContainer.hp !== hp) {
            this.updateStatus(remoteContainer.container, "HP", hp, this.maxHp, this.hpAssetsPath);
            remoteContainer.hp = hp;
            if (hp <= 0) {
                remoteContainer.container.alpha = 0.3;
            }
        }
        if(remoteContainer.score !== score) {
            this.updateStatus(remoteContainer.container, "Score", score, this.maxScore, this.scoreAssetsPath);
            remoteContainer.score = score;
        }
    }

    /**
     * Removes a remote player's status panel from the HUD.
     * @param id The remote player's ID.
     */
    public removeRemotePlayer(id: string): void {
        const remoteContainer = this.remoteContainers.get(id);
        if (!remoteContainer) {
            console.warn(`Remote player with id ${id} does not exist.`);
            return;
        }

        this.remoteContainers.delete(id);
        this.remoteStatusPanels.removeControl(remoteContainer.container);
        remoteContainer.container.dispose();
    }

    private createBackgroundContainer(width, height): Rectangle {
        // Conteneur principal (rectangle ou image)
        const mainContainer = new Rectangle();
        mainContainer.width = `${width}px`;
        mainContainer.height = `${height}px`;
        mainContainer.thickness = 0;
        mainContainer.cornerRadius = 18;
        mainContainer.background = "#222c";
        mainContainer.alpha = 0.92;
        mainContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        mainContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        mainContainer.top = "-30px";
        mainContainer.zIndex = 10;
        mainContainer.isVisible = true;

        return mainContainer;
    }

    private createInventoryBar(): Control {
        const inputHandler = InputHandler.getInstance();

        const actionSize = 90;
        const spacing = 0;
        const totalWidth = this.numberOfActions * actionSize + (this.numberOfActions - 1) * spacing;
        const mainWidth = totalWidth + 40;

        const mainContainer = this.createBackgroundContainer(mainWidth, 120);

        // Barre horizontale d'icônes uniquement (pas de titre ni description)
        const bar = new StackPanel();
        bar.isVertical = false;
        bar.height = "100px";
        bar.width = `${totalWidth}px`;
        bar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        bar.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        for (let i = 0; i < this.numberOfActions; i++) {
            const actionContainer = new Rectangle();
            actionContainer.width = `${actionSize}px`;
            actionContainer.height = "90px";
            actionContainer.thickness = 0;
            actionContainer.background = "transparent";

            // Image de fond (conteneur)
            const bgImage = new Image("actionBg", "/assets/hud/elements/Double/Transparent center/panel-transparent-center-001.png");
            bgImage.width = `${actionSize}px`;
            bgImage.height = "90px";
            bgImage.stretch = Image.STRETCH_FILL;
            actionContainer.addControl(bgImage);

            const keyImg = new Image("keyIcon", `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName(`action_${i + 1}`)}.png`);
            keyImg.width = "28px";
            keyImg.height = "28px";
            keyImg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            keyImg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            keyImg.left = "4px";
            keyImg.top = "4px";
            keyImg.zIndex = 2;
            actionContainer.addControl(keyImg);

            this.actions.push(actionContainer);

            bar.addControl(actionContainer);
        }

        mainContainer.addControl(bar);
        return mainContainer;    
    }

    private createStatusBar(
        label: string,
        value: number,
        max: number,
        fullAssets: { left: string, center: string, right: string },
        emptyAssets: { left: string, center: string, right: string }
    ): Rectangle {
        const percent = Math.max(0, Math.min(1, value / max));

        const BAR_HEIGHT = 28; // Hauteur réduite
        const BAR_WIDTH = 200;

        const container = new Rectangle(label);
        container.height = `${BAR_HEIGHT + 22}px`;
        container.width = `${BAR_WIDTH + 60}px`;
        container.thickness = 0;
        container.background = "transparent";
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        const vStack = new StackPanel();
        vStack.isVertical = true;
        vStack.width = 1.0;
        vStack.height = 1.0;
        vStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        vStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        // Label centré au-dessus
        const labelText = new TextBlock();
        labelText.text = label;
        labelText.color = "white";
        labelText.fontSize = 16;
        labelText.height = "22px";
        labelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        labelText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        vStack.addControl(labelText);

        const stack = new StackPanel();
        stack.isVertical = false;
        stack.height = `${BAR_HEIGHT}px`;
        stack.width = `${BAR_WIDTH + 60}px`;
        stack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        stack.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        // Plein (gauche)
        const leftFull = new Image("leftFull", fullAssets.left);
        leftFull.width = "16px";
        leftFull.height = `${BAR_HEIGHT}px`;
        stack.addControl(leftFull);

        // Plein (centre)
        const centerFull = new Image("centerFull", fullAssets.center);
        centerFull.width = `${Math.floor(BAR_WIDTH * percent)}px`;
        centerFull.height = `${BAR_HEIGHT}px`;
        centerFull.stretch = Image.STRETCH_FILL;
        stack.addControl(centerFull);

        // Plein (droit)
        const rightFull = new Image("rightFull", fullAssets.right);
        rightFull.width = "16px";
        rightFull.height = `${BAR_HEIGHT}px`;
        stack.addControl(rightFull);

        // Manque (gauche)
        if (percent < 1) {
            const leftEmpty = new Image("leftEmpty", emptyAssets.left);
            leftEmpty.width = percent === 0 ? "16px" : "0px";
            leftEmpty.height = `${BAR_HEIGHT}px`;
            stack.addControl(leftEmpty);

            // Manque (centre)
            const centerEmpty = new Image("centerEmpty", emptyAssets.center);
            centerEmpty.width = `${Math.floor(BAR_WIDTH * (1 - percent))}px`;
            centerEmpty.height = `${BAR_HEIGHT}px`;
            centerEmpty.stretch = Image.STRETCH_FILL;
            stack.addControl(centerEmpty);

            // Manque (droit)
            const rightEmpty = new Image("rightEmpty", emptyAssets.right);
            rightEmpty.width = "16px";
            rightEmpty.height = `${BAR_HEIGHT}px`;
            stack.addControl(rightEmpty);
        }

        vStack.addControl(stack);
        container.addControl(vStack);
        return container;
    }
    
    private createStatusContainer(): Rectangle {
        // Conteneur principal stylé comme l'inventaire
        const mainContainer = this.createBackgroundContainer(300, 120);

        // Stack vertical pour les barres
        const stack = new StackPanel();
        stack.isVertical = true;
        stack.width = 1.0;
        stack.height = 1.0;
        stack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        stack.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        // Barre de vie
        const hpBar = this.createStatusBar("HP", 0, this.maxHp, this.hpAssetsPath, this.emptyAssetsPath);
        stack.addControl(hpBar);

        // Barre de score
        const scoreBar = this.createStatusBar("Score", 0, this.maxScore, this.scoreAssetsPath, this.emptyAssetsPath);
        scoreBar.top = "6px";
        stack.addControl(scoreBar);

        mainContainer.addControl(stack);
        return mainContainer;
    }

    private createRemoteStatusContainer(id: string): Rectangle {
        const container = this.createStatusContainer();
        container.name = `RemoteStatus_${id}`;
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; 
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;   
        container.height = "150px"; // Hauteur fixe pour chaque joueur distant

        const idText = new TextBlock();
        idText.text = id;
        idText.color = "white";
        idText.fontSize = 18;
        idText.height = "28px";
        idText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        idText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        idText.top = "-44px"; // Décale au-dessus du container

        const stack = container.children[0] as StackPanel;
        if (stack) {
            stack.addControl(idText);
            stack.children.splice(0, 0, stack.children.pop());
        } else {
            console.warn(`StackPanel not found in RemoteStatusContainer for id: ${id}`);
        }

        return container;
    }

    public dispose(): void {
        if (this.gui) {
            this.gui.dispose();
            this.gui = null;
        }
    }
}