/**
 * EditorHUD provides the in-game graphical user interface for the level editor.
 * 
 * Responsibilities:
 * - Displays context-sensitive HUD bars for each editor mode (Addition, Move, Rotation, Resize).
 * - Shows icons, tooltips, and key bindings for available actions in each mode.
 * - Handles user interactions with HUD elements (e.g., clone, delete, mode switching).
 * - Integrates with the InputHandler to display current key bindings.
 * - Notifies a listener (IHUDEditorListener) when HUD actions are triggered.
 * - Supports dynamic switching between modes and proper cleanup.
 * 
 * Usage:
 * - Use `createHUDEditor(scene, listener)` to instantiate.
 * - Call `setMode(mode)` to display the HUD for the current editor mode.
 * - Call `dispose()` to clean up resources when the HUD is no longer needed.
 */

import { Scene } from "@babylonjs/core";
import { AdvancedDynamicTexture, Control, Rectangle, StackPanel, TextBlock, Image } from "@babylonjs/gui";
import { InputHandler } from "../InputHandler";

/**
 * IHUDEditor defines the interface for the editor HUD.
 */
export interface IHUDEditor {
    setMode(mode: string): void;
    dispose(): void;
}

/**
 * IHUDEditorListener defines callbacks for HUD actions (mode switching, selection, etc.).
 */
export interface IHUDEditorListener {
    onNextMode(): void;
    onPreviousMode(): void;
    onCancelSelection(): void;
    onRemoveSelection(): void;
    onCloneSelection(): void;
}

/**
 * Factory function to create an EditorHUD instance.
 * @param scene The Babylon.js scene.
 * @param listener The HUD event listener.
 * @returns An IHUDEditor implementation.
 */
export function createHUDEditor(scene: Scene, listener: IHUDEditorListener): IHUDEditor {
    return new EditorHUD(scene, listener);
}

/**
 * EditorHUD implements the IHUDEditor interface and manages the editor HUD UI.
 * 
 * - Creates and manages mode bars for each editor mode.
 * - Displays icons, tooltips, and key bindings for each action.
 * - Handles user interaction and notifies the listener of HUD events.
 */
class EditorHUD implements IHUDEditor {
    private scene: Scene;
    private gui: AdvancedDynamicTexture;
    private modeBars: Map<string, Rectangle> = new Map();
    private listener: IHUDEditorListener | null = null;

    /**
     * Constructs a new EditorHUD.
     * @param scene The Babylon.js scene.
     * @param listener The HUD event listener.
     */
    constructor(scene: Scene, listener: IHUDEditorListener) {
        this.scene = scene;
        this.gui = AdvancedDynamicTexture.CreateFullscreenUI("EditorHUD", true, this.scene);
        this.listener = listener;

        const inputHandler = InputHandler.getInstance();

        // Prépare les barres pour chaque mode (exemple avec 2 modes)
        this.createModeBar("Addition", "Add element to the scene by pointing on the wall and using action key.", [
            { icon: "/assets/hud/editor/fixed_platform.png", 
                tooltip: "Fixed platform", 
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("action_1")}.png` },
            { icon: "/assets/hud/editor/parented_platform.png", 
                tooltip: "Parented platform", 
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("action_2")}.png` },
            { icon: "/assets/hud/editor/spikes.png", 
                tooltip: "Spikes", 
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("action_3")}.png` },
            { icon: "/assets/hud/editor/coin.png", 
                tooltip: "Coin", 
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("action_4")}.png` },
            { icon: "/assets/hud/editor/player.png", 
                tooltip: "Player", 
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("action_5")}.png` },
            { icon: "/assets/hud/editor/crystal.png", 
                tooltip: "Victory", 
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("action_6")}.png` },
            { icon: "/assets/hud/editor/assets/hud/Switch2/Default/switch_button_c.png", 
                tooltip: "Clone", 
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("clone")}.png`, 
                onclick: () => this.listener?.onCloneSelection() },
            { icon: "/assets/hud/Flairs/Default/flair_disabled.png", 
                tooltip: "Deselect", 
                onclick: () => this.listener?.onCancelSelection() },
            { icon: "/assets/hud/Flairs/Default/flair_disabled_cross.png", 
                tooltip: "Delete", 
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("delete")}.png`,
                onclick: () => this.listener?.onRemoveSelection() },
            { icon: "/assets/hud/Flairs/Default/flair_arrow_long_left.png", 
                tooltip: "Previous mode", 
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("action_minus")}.png`,
                onclick: () => this.listener?.onPreviousMode() },
            { icon: "/assets/hud/Flairs/Default/flair_arrow_long.png",
                tooltip: "Next mode",
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("action_plus")}.png`,
                onclick: () => this.listener?.onNextMode() }
        ]);
        this.createModeBar("Move", "Move the current selection using directional keys", [
            { icon: "/assets/hud/Flairs/Default/flair_arrow_long_left.png", 
                tooltip: "Previous mode", 
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("action_minus")}.png`,
                onclick: () => this.listener?.onPreviousMode() },
            { icon: "/assets/hud/Flairs/Default/flair_arrow_long.png",
                tooltip: "Next mode",
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("action_plus")}.png`,
                onclick: () => this.listener?.onNextMode() }
        ]);
        this.createModeBar("Rotation", "Rotate  the current selection using directional keys", [
            { icon: "/assets/hud/Flairs/Default/flair_arrow_long_left.png", 
                tooltip: "Previous mode", 
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("action_minus")}.png`,
                onclick: () => this.listener?.onPreviousMode() },
            { icon: "/assets/hud/Flairs/Default/flair_arrow_long.png",
                tooltip: "Next mode",
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("action_plus")}.png`,
                onclick: () => this.listener?.onNextMode() }
        ]);
        this.createModeBar("Resize", "Resize the current selection using directional keys", [
            { icon: "/assets/hud/Flairs/Default/flair_arrow_long_left.png", 
                tooltip: "Previous mode", 
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("action_minus")}.png`,
                onclick: () => this.listener?.onPreviousMode() },
            { icon: "/assets/hud/Flairs/Default/flair_arrow_long.png",
                tooltip: "Next mode",
                key: `/assets/hud/Keyboard/Default/keyboard_${inputHandler.getKeyName("action_plus")}.png`,
                onclick: () => this.listener?.onNextMode() }
        ]);

        this.setMode("Addition");
    }

    /**
     * Adds an action icon (with optional key and click handler) to a HUD bar.
     */
    private addIconToBar(bar: StackPanel, actionSize: number, iconPath: string, key?: string) {
        // Conteneur individuel pour chaque action
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

        // Icône de l'action
        const icon = new Image("icon", iconPath);
        icon.width = "60px";
        icon.height = "60px";
        icon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        icon.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        icon.zIndex = 1;
        actionContainer.addControl(icon);

        if(key) {
            const keyImg = new Image("keyIcon", key);
            keyImg.width = "28px";
            keyImg.height = "28px";
            keyImg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            keyImg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            keyImg.left = "4px";
            keyImg.top = "4px";
            keyImg.zIndex = 2;
            actionContainer.addControl(keyImg);
        }

        bar.addControl(actionContainer);
        return actionContainer;
    }

    /**
     * Estimates the width of a text string for layout purposes.
     */
    private estimateTextWidth(text: string, fontSize: number = 20, fontFamily: string = "Arial"): number {
        // Utilise un canvas temporaire pour mesurer le texte
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        ctx.font = `${fontSize}px ${fontFamily}`;
        return ctx.measureText(text).width;
    }

    /**
     * Creates a HUD bar for a specific editor mode, with a title, description, and action icons.
     */
    private createModeBar(mode: string, description: string, actions: { icon: string, tooltip: string, key?: string, onclick?: () => void }[]) {
        const totalActions = actions.length; 

        const actionSize = 90;
        const spacing = 0; // ou 10 si tu veux de l'espace entre les actions
        const totalWidth = totalActions * actionSize + (totalActions - 1) * spacing;

        const descWidth = Math.ceil(this.estimateTextWidth(description, 20, "Arial")) + 40; // +40 pour padding

        const mainWidth = Math.max(totalWidth + 40, descWidth);

        // Conteneur principal (rectangle ou image)
        const mainContainer = new Rectangle();
        mainContainer.width = `${mainWidth}px`;
        mainContainer.height = "220px";
        mainContainer.thickness = 0;
        mainContainer.cornerRadius = 18;
        mainContainer.background = "#222c";
        mainContainer.alpha = 0.92;
        mainContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        mainContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        mainContainer.top = "-30px";
        mainContainer.zIndex = 10;
        mainContainer.isVisible = false; // Par défaut, la barre n'est pas visible

        // StackPanel vertical pour organiser titre, description, barre
        const verticalStack = new StackPanel();
        verticalStack.isVertical = true;
        verticalStack.width = 1.0;
        verticalStack.height = 1.0;
        verticalStack.paddingTop = "10px";
        verticalStack.paddingBottom = "10px";
        verticalStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;

        // Titre du mode
        const title = new TextBlock();
        title.text = mode;
        title.color = "white";
        title.fontSize = 36;
        title.height = "50px";
        title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        title.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        verticalStack.addControl(title);

        // Description sous le titre
        const desc = new TextBlock();
        desc.text = description;
        desc.color = "#cccccc";
        desc.fontSize = 20;
        desc.height = "32px";
        desc.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        desc.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        verticalStack.addControl(desc);

        // Barre horizontale d'icônes
        const bar = new StackPanel();
        bar.isVertical = false;
        bar.height = "100px";
        bar.width = `${totalWidth}px`;
        bar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        bar.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        const tooltip = new TextBlock();
        tooltip.text = "";
        tooltip.color = "white";
        tooltip.fontSize = 24;
        // tooltip.background = "#222c";
        tooltip.height = "40px";
        tooltip.width = "200px";
        tooltip.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        tooltip.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        tooltip.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        tooltip.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        tooltip.alpha = 0;
        tooltip.zIndex = 100;
        this.gui.addControl(tooltip);

        actions.forEach((action) => {
            const actionContainer = this.addIconToBar(bar, actionSize, action.icon, action.key);
             actionContainer.onPointerEnterObservable.add(() => {
                tooltip.text = action.tooltip;
                tooltip.top = "5px";
                tooltip.alpha = 1;
            });
            actionContainer.onPointerOutObservable.add(() => {
                tooltip.alpha = 0;
            });

            if(action.onclick) {
                actionContainer.onPointerClickObservable.add(action.onclick);
            }
        });

        verticalStack.addControl(bar);
        mainContainer.addControl(verticalStack);
        this.gui.addControl(mainContainer);

        this.modeBars.set(mode, mainContainer);
    }

    /**
     * Sets the current editor mode, displaying only the relevant HUD bar.
     * @param mode The mode to display ("Addition", "Move", "Rotation", "Resize").
     */
    public setMode(mode: string): void {
        // Affiche uniquement la barre du mode courant
        this.modeBars.forEach((bar, key) => {
            bar.isVisible = (key === mode);
            console.log(`Setting mode bar visibility for ${key}: ${bar.isVisible}`);
        });
    }

    /**
     * Disposes the HUD and all associated GUI resources.
     */
    public dispose(): void {
        if (this.gui) {
            this.gui.dispose();
            this.gui = null;
        }
        this.modeBars.clear();
    }
}