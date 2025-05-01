import { Animation, Color3, int, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import "@babylonjs/loaders/glTF";
import { Player } from './Player';
import { ParentNode } from './ParentNode';

export class VictoryCondition {
    private scene: Scene;
    public mesh: Mesh;
    private diameter: number = 10;
    private position: Vector3;
    private parent: ParentNode;

    constructor(scene: Scene, position: Vector3, parent: ParentNode) {
        this.scene = scene;
        this.position = position;
        this.parent = parent;
        this.mesh = this.createCoin();
        this.animateCoin();
    }

    // public createCoin(): Mesh {
    //     // Load the mesh from the 3D model file
    //     let crystalMesh: Mesh;
    //     SceneLoader.ImportMesh("", "/3Dmodel/", "crystal.glb", this.scene, (meshes) => {
    //         crystalMesh = meshes[0] as Mesh;
    //         crystalMesh.parent = this.parent;
    //         crystalMesh.position = this.position;

    //         crystalMesh.scaling = new Vector3(10,10,10); // Scale the mesh to the desired size
    //     });
    //     return crystalMesh;
    // }

    public createCoin(): Mesh {
        // create a coin shape
        const coin = MeshBuilder.CreateCylinder("coin", { diameter: this.diameter, height: 0.5 }, this.scene);
        coin.position = this.position;
        coin.position.y += this.diameter * 2;
        // coin.parent = this.parent;
        this.parent.addChild(coin);
        coin.material = new StandardMaterial("coinMaterial", this.scene);
        (coin.material as StandardMaterial).diffuseColor = new Color3(1, 1, 0); // Gold color

        coin.rotation.x = Math.PI / 2;
        return coin;
    }

    public checkWin(player: any, timer: number): void {
        // Check if the player is close to the coin
        const distance = Vector3.Distance(player.mesh.position, this.mesh.position);
        if (distance < this.diameter) {
            player.setWin(true);
            // display win scrreen from html
            const winScreen = document.getElementById("win-screen") as HTMLElement;
            winScreen.classList.remove("hidden");
            this.animateScore(player, timer);
        }
    }

    public animateCoin() {
        const animationY = new Animation("coinAnimationY", "position.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        animationY.dataType = Animation.ANIMATIONTYPE_FLOAT;
        animationY.loopMode = Animation.ANIMATIONLOOPMODE_CYCLE;
        const keysY = [
            { frame: 0, value: this.position.y },
            { frame: 30, value: this.position.y + 2 },
            { frame: 60, value: this.position.y },
        ];
        animationY.setKeys(keysY);
        this.mesh.animations.push(animationY);

        const animationRotation = new Animation("coinRotation", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        const keysRotation = [
            { frame: 0, value: 0 },
            { frame: 60, value: 2 * Math.PI },
        ];
        animationRotation.setKeys(keysRotation);
        this.mesh.animations.push(animationRotation);

        this.scene.beginAnimation(this.mesh, 0, 60, true);
    }

    public animateScore(player: Player, time: number): void {
        const targetScore = player.getScore();
        const duration = 2000;
        const interval = 20;
        const step = targetScore / (duration / interval);
        let current = 0;

        const finalScoreElement = document.getElementById("final-score")
        const finalTimerElement = document.getElementById("final-timer")
        const finalTime = Math.floor(time / 1000);
        const minutes = Math.floor(finalTime / 60);
        const seconds = finalTime % 60;
        finalTimerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        const timer = setInterval(() => {
            current += step;
            if (current >= targetScore) {
                finalScoreElement.textContent = targetScore.toLocaleString();
                clearInterval(timer);
            } else {
                finalScoreElement.textContent = Math.floor(current).toLocaleString();
            }
        }, interval);
    }

}
