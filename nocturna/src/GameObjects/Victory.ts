import { Animation, Mesh, PhysicsAggregate, PhysicsShapeType, Scene, Vector3 } from '@babylonjs/core';
import { GameObject, CharacterInput, Utils, EndConditionObserver } from '../types';
import { GameObjectConfig, GameObjectFactory, EditorObject, GameObjectVisitor } from '../types';
import { ParentNodeObserver } from '../ParentNode';
import "@babylonjs/loaders";
import { ObjectEditorImpl } from './EditorObject';
import { App } from '../app';

export class VictoryCondition implements GameObject, ParentNodeObserver {
    public static readonly Type: string = "victory_condition";
    private static nextId: number = 0;
    public static mode = "normal";
    private scene: Scene;
    public mesh: Mesh[] = [];
    private observers: EndConditionObserver[] = []; // Liste des observateurs
    private current: number = 0;
    private targetScore: number;
    private ended: boolean = false;
    private id: string;
    public victoryAggregate: PhysicsAggregate;

    constructor(mesh: Mesh, scene: Scene) {
        this.scene = scene;
        if (mesh) {
            this.mesh = [mesh];
        }

        this.id = `${VictoryCondition.Type}_${VictoryCondition.nextId++}`;
    }

    public getId(): string {
        return this.id;
    }

    public getMeshes(): Mesh[] {
        return this.mesh;
    }

    public getType(): string {
        return VictoryCondition.Type;
    }

    public addObserver(observer: EndConditionObserver): void {
        if (!this.observers.includes(observer)) {
            this.observers.push(observer);
        }
    }

    public removeObserver(observer: EndConditionObserver): void {
        this.observers = this.observers.filter((obs) => obs !== observer);
    }


    public startAnimation(): void {
        this.animate();
    }

    public onRotationStart(): void {
        // this.mesh[0].physicsBody.disablePreStep = false;
    }

    public onRotationChange(): void {
        this.recreatePhysicsBody();
        // this.mesh[0].physicsBody.disablePreStep = true;
        // const absoluteMeshPosition = this.mesh[0].getAbsolutePosition();
        // this.victoryAggregate.body.transformNode.position = absoluteMeshPosition;
        // console.log("onRotationChange", absoluteMeshPosition, this.victoryAggregate.body.transformNode.getAbsolutePosition());
    }
    public recreatePhysicsBody(): void {
        // Supprimez l'ancien corps physique
        if (this.mesh[0].physicsBody) {
            // this.mesh[0].physicsBody.dispose();
            const physicsBody = this.mesh[0].physicsBody;

            // Obtenez la position et la rotation actuelles du mesh
            const newPosition = this.mesh[0].absolutePosition;
            const newRotation = this.mesh[0].absoluteRotationQuaternion;

            physicsBody.setTargetTransform(newPosition, newRotation);
        }
        // Créez un nouveau corps physique avec les nouvelles transformations
        // new PhysicsAggregate(this.mesh[0], PhysicsShapeType.CYLINDER, { mass: 0, friction: 0, restitution: 0 }, this.scene);
    }


    public display(score: number, timer: number): void {
        // display win scrreen from html
        const winScreen = document.getElementById("win-screen") as HTMLElement;
        winScreen.classList.remove("hidden");
        this.animateScore(score, timer);
    }

    public hide(): void {
        const loseScreen = document.getElementById("win-screen") as HTMLElement;
        loseScreen.classList.add("hidden"); // Ajouter la classe "hidden" pour masquer l'écran
    }

    public animate() {
        const animationY = new Animation("coinAnimationY", "position.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        animationY.dataType = Animation.ANIMATIONTYPE_FLOAT;
        animationY.loopMode = Animation.ANIMATIONLOOPMODE_CYCLE;
        const keysY = [
            { frame: 0, value: this.getMesh().position.y },
            { frame: 30, value: this.getMesh().position.y + 2 },
            { frame: 60, value: this.getMesh().position.y },
        ];
        animationY.setKeys(keysY);
        this.getMesh().animations.push(animationY);

        this.scene.beginAnimation(this.mesh, 0, 60, true);
    }

    public animateScore(targetScore: number, time: number): void {
        this.targetScore = targetScore;
        this.current = 0;

        const finalTimerElement = document.getElementById("final-timer")
        const finalTime = Math.floor(time / 1000);
        const minutes = Math.floor(finalTime / 60);
        const seconds = finalTime % 60;
        finalTimerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        this.initialiseButtons();
    }

    private initialiseButtons(): void {
        const restartButton = document.getElementById("continue-button") as HTMLElement;
        const menuButton = document.getElementById("win-menu-button") as HTMLElement;
        if (VictoryCondition.mode == "normal") {
            restartButton.textContent = "Restart";
        } else if (VictoryCondition.mode == "tutorial") {
            restartButton.textContent = "Continue";
        }
        restartButton.addEventListener("click", () => {
            this.observers.forEach(obs => obs.onRetry());
        });
        menuButton.addEventListener("click", () => {
            this.observers.forEach(obs => obs.onQuit());
        });
    }

    public getMesh(): Mesh {
        return this.mesh[0];
    }

    public updateScore(dt: number) {
        const finalScoreElement = document.getElementById("final-score")

        this.current += dt;
        if (this.current >= this.targetScore) {
            finalScoreElement.textContent = this.targetScore.toLocaleString();
        } else {
            finalScoreElement.textContent = Math.floor(this.current).toLocaleString();
        }
    }

    public update(dt: number, _: CharacterInput): void {
        if (this.ended) this.updateScore(dt);
    }

    public accept(visitor: GameObjectVisitor): void {
        this.scene.stopAnimation(this.mesh);
        visitor.visitVictory(this);
    }

    public onPause(): void {
    }
    public onResume(): void {
    }
}

export class VictoryConditionFactory implements GameObjectFactory {

    private createImpl(config: GameObjectConfig, physics: boolean): VictoryCondition {
        const victory = new VictoryCondition(null, config.scene); // Placeholder for the mesh
        if (!config.size) {
            config.size = new Vector3(20, 20, 20);
        }

        const path = App.selectedGraphics + "/" + VictoryCondition.Type + ".glb";


        Utils.createMeshTask(config, VictoryCondition.Type, path, (task) => {
            const meshes = task.loadedMeshes;

            meshes[0].name = VictoryCondition.Type;
            Utils.configureMesh(meshes, config);

            config.parent.addChild(meshes[0]);

            meshes.forEach((m) => {
                victory.mesh.push(m);
            });

            if (physics) {
                const p = new PhysicsAggregate(meshes[0], PhysicsShapeType.CYLINDER, { mass: 0, friction: 0, restitution: 0 }, config.scene);
                p.body.setCollisionCallbackEnabled(true);
                config.parent.addObserver(victory);
                victory.victoryAggregate = p;
                victory.startAnimation();
            }
        });

        return victory;
    }

    public create(config: GameObjectConfig): VictoryCondition {
        return this.createImpl(config, true);
    }

    public createForEditor(config: GameObjectConfig): EditorObject {
        const victory = this.createImpl(config, false);
        const editor = new ObjectEditorImpl(victory);
        return editor;
    }
}