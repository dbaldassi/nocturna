import { Scene } from "@babylonjs/core";
import { AdvancedDynamicTexture, Control, Rectangle, StackPanel, TextBlock, Image } from "@babylonjs/gui";


export interface IHUDEditor {
    
    setMode(mode: string): void;
    dispose(): void;
}

export function createHUDEditor(scene: Scene): IHUDEditor {
    return new EditorHUD(scene);
}

class EditorHUD implements IHUDEditor {
    private scene: Scene;
    private gui: AdvancedDynamicTexture;
    private modeTitle: TextBlock;
    private modeBars: Map<string, Rectangle> = new Map();
    private currentMode: string = "";

    constructor(scene: Scene) {
        this.scene = scene;
        this.gui = AdvancedDynamicTexture.CreateFullscreenUI("EditorHUD", true, this.scene);

        // Titre du mode
        this.modeTitle = new TextBlock();
        this.modeTitle.text = "";
        this.modeTitle.color = "white";
        this.modeTitle.fontSize = 36;
        this.modeTitle.height = "60px";
        this.modeTitle.top = "-120px";
        this.modeTitle.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.modeTitle.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.gui.addControl(this.modeTitle);

        // Prépare les barres pour chaque mode (exemple avec 2 modes)
        this.createModeBar("Addition", [
            { icon: "/assets/hud/editor/fixed_platform.png", tooltip: "Plateforme" },
            { icon: "/assets/hud/editor/fixed_platform.png", tooltip: "Pièce" },
            { icon: "/assets/hud/editor/fixed_platform.png", tooltip: "Joueur" }
        ]);
        this.createModeBar("Move", [
            { icon: "textures/icon_move.png", tooltip: "Déplacer" },
            { icon: "textures/icon_rotate.png", tooltip: "Tourner" }
        ]);

        this.setMode("Addition");
    }

    private createModeBar(mode: string, actions: { icon: string, tooltip: string }[]) {
        const barContainer = new Rectangle();
        barContainer.width = "500px";
        barContainer.height = "100px";
        barContainer.thickness = 0;
        barContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        barContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        barContainer.top = "-20px";
        barContainer.isVisible = false;
        barContainer.background = "transparent";

        // Barre horizontale d'icônes
        const bar = new StackPanel();
        bar.isVertical = false;
        bar.height = "100px";
        bar.width = "500px";
        bar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        bar.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        actions.forEach(action => {
            // Conteneur individuel pour chaque action
            const actionContainer = new Rectangle();
            actionContainer.width = "90px";
            actionContainer.height = "90px";
            actionContainer.thickness = 0;
            actionContainer.background = "transparent";

            // Image de fond (conteneur)
            const bgImage = new Image("actionBg", "/assets/hud/elements/Double/Panel/panel-027.png");
            bgImage.width = "90px";
            bgImage.height = "90px";
            bgImage.stretch = Image.STRETCH_FILL;
            actionContainer.addControl(bgImage);

            // Icône de l'action
            const icon = new Image("icon", action.icon);
            icon.width = "60px";
            icon.height = "60px";
            icon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
            icon.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
            icon.zIndex = 1;
            actionContainer.addControl(icon);

            bar.addControl(actionContainer);
        });

        barContainer.addControl(bar);
        this.gui.addControl(barContainer);
        this.modeBars.set(mode, barContainer);
    }

    public setMode(mode: string): void {
        this.currentMode = mode;
        this.modeTitle.text = mode;
        // Affiche uniquement la barre du mode courant
        this.modeBars.forEach((bar, key) => {
            bar.isVisible = (key === mode);
            console.log(`Setting mode bar visibility for ${key}: ${bar.isVisible}`);
        });
    }

    public dispose(): void {
        if (this.gui) {
            this.gui.dispose();
            this.gui = null;
        }
        this.modeBars.clear();
    }
}