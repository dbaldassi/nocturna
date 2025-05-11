import { Scene, Vector3, FreeCamera } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, StackPanel, TextBlock, Control } from "@babylonjs/gui";

export interface LevelSelectionObserver {
    onLevelSelected(levelFile: string): void;
};

export class LevelSelectionScene {
    private guiTexture: AdvancedDynamicTexture;
    private scene: Scene;
    private observer: LevelSelectionObserver;

    constructor(scene: Scene, observer: LevelSelectionObserver) {
        console.log(scene);
        this.scene = scene;
        this.observer = observer;

         // Configurer la caméra
         const camera = new FreeCamera("camera", new Vector3(0, 0, -10), this.scene);
         camera.attachControl(true);
         scene.activeCamera = camera;

         this.loadLevelList();
    }

    private async loadLevelList() {
        try {
            // Effectuer un fetch pour récupérer les niveaux disponibles
            const response = await fetch("/assets/levels/levels.json"); // Chemin vers le fichier JSON contenant les niveaux
            console.log("Response:", response);
            const levels = await response.json();

            // Créer une interface utilisateur pour afficher les niveaux
            this.createLevelSelectionUI(levels);
        } catch (error) {
            console.error("Failed to load level list:", error);
        }
    }

    private createLevelSelectionUI(levels: { name: string; file: string }[]) {
        // Créer une texture GUI pour afficher les boutons
        this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);

        // Créer un panneau vertical pour organiser les boutons
        const panel = new StackPanel();
        panel.width = "50%";
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.guiTexture.addControl(panel);

        // Ajouter un titre
        const title = new TextBlock();
        title.text = "Select a Level";
        title.color = "white";
        title.fontSize = 32;
        title.height = "50px";
        panel.addControl(title);

        // Ajouter un bouton pour chaque niveau
        levels.forEach((level) => {
            const button = Button.CreateSimpleButton(level.name, level.name);
            button.width = "100%";
            button.height = "50px";
            button.color = "white";
            button.background = "gray";
            button.onPointerClickObservable.add(() => {
                this.observer.onLevelSelected(level.file); // Notify the observer with the selected level file
            });
            panel.addControl(button);
        });
    }
}