import { Scene, Vector3, FreeCamera } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, StackPanel, TextBlock, Control } from "@babylonjs/gui";

/**
 * LevelSelection.ts defines the LevelSelectionScene class and its observer interface for displaying
 * and managing the level selection UI in Nocturna.
 * 
 * Responsibilities:
 * - Loads the list of available levels from a JSON file.
 * - Displays a GUI for selecting a level, with a button for each available level.
 * - Allows users to drag and drop a custom JSON file to load a level.
 * - Verifies the validity of the loaded JSON level data.
 * - Notifies an observer when a level is selected or custom data is loaded.
 * - Handles error display for invalid files or loading issues.
 * 
 * Usage:
 * - Instantiate LevelSelectionScene with a Babylon.js Scene and a LevelSelectionObserver.
 * - The observer must implement `onLevelSelected(levelFile)` and `onDataTransmited(data)`.
 * - The UI is automatically created and disposed as needed.
 * - Use drag-and-drop or select a level from the list to trigger observer callbacks.
 */

/**
 * LevelSelectionObserver defines the interface for objects that want to be notified
 * when a level is selected or custom data is loaded.
 */
export interface LevelSelectionObserver {
    onLevelSelected(levelFile: string): void;
    onDataTransmited(data: JSON): void;
};

/**
 * LevelSelectionScene manages the level selection user interface.
 * - Loads level data from a JSON file.
 * - Displays a list of levels as buttons.
 * - Supports drag-and-drop of custom JSON files.
 * - Notifies the observer of user actions.
 */
export class LevelSelectionScene {
    private guiTexture: AdvancedDynamicTexture;
    private scene: Scene;
    private observer: LevelSelectionObserver;
    private fileName: string;

    /**
     * Constructs a new LevelSelectionScene.
     * @param scene The Babylon.js scene.
     * @param observer The observer to notify of user actions.
     * @param fileName The JSON file listing available levels (default: "levels.json").
     */
    constructor(scene: Scene, observer: LevelSelectionObserver, fileName: string = "levels.json") {
        this.scene = scene;
        this.observer = observer;
        this.fileName = fileName;

        // Set up the camera for the selection scene
        const camera = new FreeCamera("camera", new Vector3(0, 0, -10), this.scene);
        camera.attachControl(true);
        scene.activeCamera = camera;

        this.loadLevelList();
    }

    /**
     * Loads the list of available levels from the JSON file.
     * On success, creates the level selection UI.
     */
    private async loadLevelList() {
        try {
            const response = await fetch("/assets/levels/" + this.fileName);
            const levels = await response.json();
            this.createLevelSelectionUI(levels);
        } catch (error) {
            this.displayError("Failed to load level list: " + error);
        }
    }

    /**
     * Creates the GUI for level selection, with a button for each level.
     * @param levels The list of levels (array of { name, file }).
     */
    private createLevelSelectionUI(levels: { name: string; file: string }[]) {
        this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);

        const panel = new StackPanel();
        panel.width = "50%";
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.guiTexture.addControl(panel);

        // Title
        const title = new TextBlock();
        title.text = "Select a Level";
        title.color = "white";
        title.fontSize = 32;
        title.height = "50px";
        panel.addControl(title);

        // Level buttons
        levels.forEach((level) => {
            const button = Button.CreateSimpleButton(level.name, level.name);
            button.width = "100%";
            button.height = "50px";
            button.color = "white";
            button.background = "gray";
            button.onPointerClickObservable.add(() => {
                this.observer.onLevelSelected(level.file);
            });
            panel.addControl(button);
        });

        this.addDragAndDropArea(panel);
    }

    /**
     * Adds a drag-and-drop area to the UI for loading custom JSON files.
     * @param panel The StackPanel to add the area to.
     */
    private addDragAndDropArea(panel: StackPanel) {
        const dropInfo = new TextBlock();
        dropInfo.text = "Or drag & drop a JSON file here";
        dropInfo.color = "lightgray";
        dropInfo.fontSize = 18;
        dropInfo.height = "30px";
        panel.addControl(dropInfo);

        const canvas = this.scene.getEngine().getRenderingCanvas();
        if (canvas) {
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

    /**
     * Disposes the GUI resources used by the level selection scene.
     */
    public dispose() {
        if (this.guiTexture) {
            this.guiTexture.dispose();
        }
    }

    /**
     * Verifies if the provided JSON data is valid for a level.
     * @param data The JSON data to verify.
     * @returns True if the data is valid, false otherwise.
     */
    private verifyJson(data: JSON): boolean {
        const allowedNames = [
            "fixed_platform",
            "parented_platform",
            "fixed_rocket_activation_platform",
            "parented_rocket_activation_platform",
            "player",
            "victory_condition",
            "rocket",
            "spike_trap",
            "coin",
            "super_coin"
        ];

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
            if (
                typeof obj !== "object" ||
                !("position" in obj) ||
                !("rotation" in obj) ||
                !("size" in obj) ||
                !("type" in obj)
            ) {
                return false;
            }
            if (!allowedNames.includes(obj.type)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Displays an error message in the console and on the UI.
     * @param message The error message to display.
     */
    private displayError(message: string): void {
        console.error(message);
        const errorText = new TextBlock();
        errorText.text = message;
        errorText.color = "red";
        errorText.fontSize = 28;
        errorText.top = "-200px";
        this.guiTexture.addControl(errorText);
        setTimeout(() => {
            this.guiTexture.removeControl(errorText);
        }, 2000);
    }
}