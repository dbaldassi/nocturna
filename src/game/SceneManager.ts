import { Scene } from '@babylonjs/core';

export class SceneManager {
    private currentScene: Scene | null = null;

    public loadScene(sceneName: string): void {
        // Logic to load the scene based on the sceneName
        // This could involve creating a new Scene instance and setting it as the currentScene
    }

    public updateCurrentScene(deltaTime: number): void {
        if (this.currentScene) {
            // Logic to update the current scene with the given deltaTime
        }
    }
}