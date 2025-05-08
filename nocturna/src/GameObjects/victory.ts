import { Animation, Color3, int, Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { GameObject, CharacterInput, getMeshBoxSize } from '../types';
import { GameObjectConfig, GameObjectFactory, EditorObject, GameObjectVisitor } from '../types';
import { ParentNodeObserver } from '../ParentNode';
import "@babylonjs/loaders";

export class VictoryCondition implements GameObject, ParentNodeObserver {
    public static readonly Type: string = "victory_condition";
    private scene: Scene;
    public mesh: Mesh;

    constructor(mesh: Mesh, scene: Scene) {
        this.scene = scene;
        this.mesh = mesh;
    }

    public startAnimation(): void {
        this.animate();
    }

    public onRotationChange(): void {
        this.recreatePhysicsBody();
    }
    public recreatePhysicsBody(): void {
        // Supprimez l'ancien corps physique
        if (this.mesh.physicsBody) {
            this.mesh.physicsBody.dispose();
        }
        // Créez un nouveau corps physique avec les nouvelles transformations
        new PhysicsAggregate(this.mesh, PhysicsShapeType.CYLINDER, { mass: 0, friction: 0, restitution: 0 }, this.scene);
    }


    public displayWin(score: number, timer: number): void {
        // display win scrreen from html
        const winScreen = document.getElementById("win-screen") as HTMLElement;
        winScreen.classList.remove("hidden");
        this.animateScore(score, timer);
    }

    public animate() {
        const animationY = new Animation("coinAnimationY", "position.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        animationY.dataType = Animation.ANIMATIONTYPE_FLOAT;
        animationY.loopMode = Animation.ANIMATIONLOOPMODE_CYCLE;
        const keysY = [
            { frame: 0, value: this.mesh.position.y },
            { frame: 30, value: this.mesh.position.y + 2 },
            { frame: 60, value: this.mesh.position.y },
        ];
        animationY.setKeys(keysY);
        this.mesh.animations.push(animationY);

        this.scene.beginAnimation(this.mesh, 0, 60, true);
    }

    public animateScore(targetScore: number, time: number): void {
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
        this.initialiseButtons();
    }

    private initialiseButtons(): void {
        const restartButton = document.getElementById("continue-button") as HTMLElement;
        const menuButton = document.getElementById("win-menu-button") as HTMLElement;
        restartButton.addEventListener("click", () => {
            window.location.reload();
        });
        menuButton.addEventListener("click", () => {
            window.location.reload();
        });
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    public update(dt: number, input: CharacterInput): void {

    }

    public accept(visitor: GameObjectVisitor): void {
        visitor.visitVictory(this);
    }
}

export class VictoryConditionEditor extends VictoryCondition implements EditorObject {
    private originalEmissiveColor: Color3;

    public constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }
    public updatePosition(dt: number, input: CharacterInput): void {
        this.mesh.position.x += (input.right ? 1 : input.left ? -1 : 0) * dt;
        this.mesh.position.y += (input.up ? 1 : input.down ? -1 : 0) * dt;

        console.log(input.down, input.up);

        console.log(this.mesh.position);
    }
    public updateRotation(dt: number, input: CharacterInput): void {
    }
    public updateScale(dt: number, input: CharacterInput): void {
    }

    public setSelected(selected: boolean): void {
        const material = this.mesh.material as StandardMaterial;
        if (!material) return;

        if (selected) {
            // save the original color
            this.originalEmissiveColor = material.emissiveColor.clone();
            this.mesh.scaling.x *= 1.1;
            this.mesh.scaling.y *= 1.1;
            material.emissiveColor = Color3.Yellow(); // Jaune
        } else {
            this.mesh.scaling.x /= 1.1;
            this.mesh.scaling.y /= 1.1;
            material.emissiveColor = this.originalEmissiveColor; // Blanc
        }
    }
    public isSelected(): boolean {
        return this.mesh.scaling.x > 1;
    }

    public serialize(): any {
        const data = {
            type: VictoryCondition.Type,
            position: this.mesh.position,
            rotation: this.mesh.rotation,
            size: getMeshBoxSize(this.mesh),
        };
        return data;
    }
}

export class VictoryConditionFactory implements GameObjectFactory {
    private createMesh(config: GameObjectConfig): Mesh {
        const mesh = MeshBuilder.CreateCylinder("coin", { diameter: config.size.x, height: config.size.y }, config.scene);
        mesh.position = config.position;
        mesh.rotation = config.rotation;

        // this.parent.addChild(coin);
        const material = new StandardMaterial("coinMaterial", config.scene);
        material.diffuseColor = Color3.Green(); // Gold color
        mesh.material = material;

        return mesh;
    }

    public create(config: GameObjectConfig): VictoryCondition {
        const victory = new VictoryCondition(null as any, config.scene); // Placeholder for the mesh

        const task = config.assetsManager.addMeshTask("victoryCrystal", "", "models/", "crystal.glb");
        task.onSuccess = (task) => {
            const meshes = task.loadedMeshes;

            const crystalMesh = meshes[0] as Mesh;
            crystalMesh.position = config.position;
            // crystalMesh.rotation = config.rotation;
            crystalMesh.scaling = new Vector3(20, 20, 20);
            crystalMesh.setBoundingInfo(meshes[1].getBoundingInfo());
            crystalMesh.refreshBoundingInfo();

            // Add physics to the crystal mesh
            new PhysicsAggregate(crystalMesh, PhysicsShapeType.CYLINDER, { mass: 0, friction: 0, restitution: 0 }, config.scene);

            // Set the mesh to the VictoryCondition instance
            victory.mesh = crystalMesh;

            // Add the crystal mesh to the parent
            config.parent.addObserver(victory);
            config.parent.addChild(crystalMesh);

            // Start animation
            victory.startAnimation();
        };

        return victory;
    }

    public createForEditor(config: GameObjectConfig): VictoryConditionEditor {
        const mesh = this.createMesh(config);
        config.parent.addChild(mesh);

        return new VictoryConditionEditor(mesh, config.scene);
    }
}