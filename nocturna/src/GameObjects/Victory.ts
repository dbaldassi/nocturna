import { Animation, Mesh, PhysicsAggregate, PhysicsShapeType, Scene, StaticSound, Vector3 } from '@babylonjs/core';
import { GameObject, CharacterInput, Utils } from '../types';
import { GameObjectConfig, GameObjectFactory, EditorObject, GameObjectVisitor } from '../types';
import { ParentNodeObserver } from '../ParentNode';
import "@babylonjs/loaders";
import { ObjectEditorImpl } from './EditorObject';
import { App } from '../app';

export class VictoryCondition implements GameObject, ParentNodeObserver {
    public static readonly Type: string = "victory_condition";
    private static nextId: number = 0;
    private scene: Scene;
    public mesh: Mesh[] = [];
    private id: string;
    public victoryAggregate: PhysicsAggregate;
    private sounds: Map<string, StaticSound> = new Map();

    constructor(mesh: Mesh, scene: Scene) {
        this.scene = scene;
        if (mesh) {
            this.mesh = [mesh];
        }

        this.id = `${VictoryCondition.Type}_${VictoryCondition.nextId++}`;
    }

    public addSound(name: string, sound: StaticSound): void {
        this.sounds.set(name, sound);
    }
    public playSound(name: string): void {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.play();
        } else {
            console.warn(`Sound ${name} not found for victory condition.`);
        }
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


    public startAnimation(): void {
        this.animate();
    }

    public onRotationStart(): void {
        // this.mesh[0].physicsBody.disablePreStep = false;
    }

    public onRotationChange(): void {
        const mesh = this.getMesh();
        const physicsBody = mesh.physicsBody;
        if (physicsBody) {
            // Obtenez la position et la rotation actuelles du mesh
            const newPosition = mesh.position;
            const newRotation = mesh.rotationQuaternion;

            physicsBody.disablePreStep = false;
            // The position where you want to move the body to
            physicsBody.transformNode.position.set(newPosition.x, newPosition.y, newPosition.z);
            physicsBody.transformNode.rotationQuaternion.set(newRotation.x, newRotation.y, newRotation.z, newRotation.w);
            this.scene.onAfterRenderObservable.addOnce(() => {
                // Turn disablePreStep on again for maximum performance
                physicsBody.disablePreStep = true;
            });
        }
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

    public getMesh(): Mesh {
        return this.mesh[0];
    }

    public update(__: number, _: CharacterInput): void {
    }

    public accept(visitor: GameObjectVisitor): void {
        this.scene.stopAnimation(this.mesh);
        visitor.visitVictory(this);
        this.playSound("victory");
    }

    public onPause(): void {
    }
    public onResume(): void {}
    public onContact(): boolean {
        // Not used in this class
        return false;
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

        Utils.loadSound(config.assetsManager, "victory", "assets/sounds/crystal.ogg", (sound) => {
            victory.addSound("victory", sound);
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