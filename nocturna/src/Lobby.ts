import { Scene } from "@babylonjs/core";

class GameModeSelecction {
    private scene: Scene;
    private gameModes: string[] = ["Single Player", "Multiplayer", "Tutorial"];

    constructor(scene: Scene) {
        this.scene = scene;
        this.createGameModeSelectionUI();
    }

    private createGameModeSelectionUI() {
        // create a box with rounded border
        
    }
}