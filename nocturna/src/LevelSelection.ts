import { Scene, Vector3, FreeCamera } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, StackPanel, TextBlock, Control } from "@babylonjs/gui";

export interface LevelSelectionObserver {
    onLevelSelected(levelFile: string): void;
    onDataTransmited(data: JSON): void;
};

export class LevelSelectionScene {
    private guiTexture: AdvancedDynamicTexture;
    private scene: Scene;
    private observer: LevelSelectionObserver;
    private fileName: string;
    private hasDragAndDrop: boolean;

    constructor(scene: Scene, observer: LevelSelectionObserver, fileName: string = "levels.json", hasDragAndDrop: boolean = false) {
        console.log(scene);
        this.scene = scene;
        this.observer = observer;
        this.fileName = fileName;
        this.hasDragAndDrop = hasDragAndDrop;

        // Configurer la caméra
        const camera = new FreeCamera("camera", new Vector3(0, 0, -10), this.scene);
        camera.attachControl(true);
        scene.activeCamera = camera;

        this.loadLevelList();
    }

    private async loadLevelList() {
        try {
            // Effectuer un fetch pour récupérer les niveaux disponibles
            const response = await fetch("/assets/levels/" + this.fileName); // Chemin vers le fichier JSON contenant les niveaux
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

        if (this.hasDragAndDrop) {
            this.addDragAndDropArea(panel);
        }
    }

    private addDragAndDropArea(panel: StackPanel) {
        // Ajouter une zone de drop pour charger un fichier JSON
        const dropInfo = new TextBlock();
        dropInfo.text = "Or drag & drop a JSON file here";
        dropInfo.color = "lightgray";
        dropInfo.fontSize = 18;
        dropInfo.height = "30px";
        panel.addControl(dropInfo);
        // Drag and drop logic
        const canvas = this.scene.getEngine().getRenderingCanvas();
        if (canvas) {
            // Prevent default drag behaviors
            canvas.addEventListener("dragover", (e) => {
                e.preventDefault();
                dropInfo.color = "yellow";
            });
            canvas.addEventListener("dragleave", (e) => {
                e.preventDefault();
                dropInfo.color = "lightgray";
            });
            canvas.addEventListener("drop", (e) => {
                e.preventDefault();
                dropInfo.color = "lightgray";
                if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    const reader = new FileReader();
                    reader.onload = () => {
                        const content = JSON.parse(reader.result as string) as JSON;
                        if (this.verifyJson(content)) {
                            this.observer.onDataTransmited(content);
                        } else {
                            this.displayError("Invalid level data format.");
                        }

                    };
                    reader.readAsText(file);
                }
            });
        }
    }

    public dispose() {
        if (this.guiTexture) {
            this.guiTexture.dispose();
        }
        // this.scene.dispose();
    }

    /**
     * Verifies if the provided JSON data is valid for a level.
     * @param data The JSON data to verify.
     * @returns True if the data is valid, false otherwise.
     */
    private verifyJson(data: JSON): boolean {
        // Allowed object types
        const allowedNames = [
            "fixed_platform",
            "parented_platform",
            "fixed_rocket_activation_platform",
            "parented_rocket_activation_platform",
            "player",
            "victory_condition",
            "rocket",
            "spike_trap",
        ];

        // Check if data is an object and has required root properties
        if (
            typeof data !== "object" ||
            data === null ||
            !("objects" in data) ||
            !Array.isArray((data as any).objects) ||
            !("Cube" in data) ||
            !("parent_node" in data)
        ) {
            return false;
        }

        const objects = (data as any).objects;
        for (const obj of objects) {
            // Check required properties
            if (
                typeof obj !== "object" ||
                !("position" in obj) ||
                !("rotation" in obj) ||
                !("size" in obj) ||
                !("type" in obj)
            ) {
                return false;
            }
            // Check type is allowed
            if (!allowedNames.includes(obj.type)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Displays an error message in the console and optionally on the UI.
     * @param message The error message to display.
     */
    private displayError(message: string): void {
        console.error(message);
        const errorText = new TextBlock();
        errorText.text = message;
        errorText.color = "red";
        errorText.fontSize = 28;
        errorText.top = "-200px"; // Move the error message higher
        this.guiTexture.addControl(errorText);
        setTimeout(() => {
            this.guiTexture.removeControl(errorText);
        }, 2000);
    }
}