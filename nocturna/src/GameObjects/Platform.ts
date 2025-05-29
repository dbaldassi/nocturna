/**
 * Platform.ts defines the classes and factories for platforms in Nocturna.
 * 
 * Responsibilities:
 * - Defines fixed and parented platforms, as well as special variants (rocket activation).
 * - Handles creation, configuration, physics, observer integration, and parenting.
 * - Provides factories to instantiate platforms for gameplay or the editor.
 * - Supports integration with the rocket system (automatic rocket spawning on contact).
 * 
 * Usage:
 * - Use `ParentedPlatformFactory` or `FixedPlatformFactory` to create standard platforms.
 * - Use `ParentedRocketActivationPlatformFactory` or `FixedRocketActivationPlatformFactory` for platforms that spawn rockets.
 * - Platforms can be observed to react to rotations or rocket spawns.
 * - The `create` and `createForEditor` methods generate objects for gameplay or the editor.
 */

import { Mesh, Scene, PhysicsAggregate, PhysicsShapeType, Vector3, GlowLayer, Color3, AssetsManager } from "@babylonjs/core";
import { App } from "../app";
import { ParentNodeObserver } from "../ParentNode";
import { GameObject, CharacterInput, GameObjectObserver, GameObjectFactory, GameObjectConfig, Utils, EditorObject } from "../types";
import { ObjectEditorImpl } from "./EditorObject";
import { FixedRocketFactory, RocketObject } from "./Rocket";

/**
 * Platform is the base class for all platforms in the game.
 * Provides common implementation for mesh management, scene reference, and observer methods.
 */
export class Platform implements GameObject {
    public static readonly Type: string = "platform";
    private static nextId: number = 0;
    private id: string;

    public mesh: Mesh[] = [];
    protected scene: Scene;

    constructor(mesh: Mesh, scene: Scene) {
        if(mesh) this.mesh.push(mesh);
        this.scene = scene;
        this.id = `${Platform.Type}_${Platform.nextId++}`;
    }

    public getId(): string {
        return this.id;
    }

    public getMesh(): Mesh {
        return this.mesh[0];
    }

    public getMeshes(): Mesh[] {
        return this.mesh;
    }

    public accept(_: any): void {}
    public update(_: number, __: CharacterInput): void {}
    public getType(): string {
        return Platform.Type;
    }
    public onPause(): void {}
    public onResume(): void {}
    public onContact(): boolean {
        return false;
    }
    public addObserver(_: GameObjectObserver): void {}
}

/**
 * ParentedPlatform represents a platform attached to a ParentNode.
 * Reacts to parent rotation changes to update its physics.
 */
export class ParentedPlatform extends Platform implements ParentNodeObserver {
    public static readonly Type: string = "parented_platform";

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }

    public onRotationStart(): void {}

    public onRotationChange() {
        const mesh = this.getMesh();
        const physicsBody = mesh.physicsBody;
        if (physicsBody) {
            // Update physics body position and rotation to match mesh
            const newPosition = mesh.position;
            const newRotation = mesh.rotationQuaternion;

            physicsBody.disablePreStep = false;
            physicsBody.transformNode.position.set(newPosition.x, newPosition.y, newPosition.z);
            physicsBody.transformNode.rotationQuaternion.set(newRotation.x, newRotation.y, newRotation.z, newRotation.w);
            this.scene.onAfterRenderObservable.addOnce(() => {
                physicsBody.disablePreStep = true;
            });
        }
    }

    public getType(): string {
        return ParentedPlatform.Type;
    }
}

/**
 * FixedPlatform represents a fixed, non-parented platform.
 */
export class FixedPlatform extends Platform  {
    public static readonly Type: string = "fixed_platform";

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }

    public getType(): string {
        return FixedPlatform.Type;
    }
}

/**
 * ParentedPlatformFactory creates ParentedPlatform instances for gameplay or the editor.
 * Handles mesh loading, configuration, physics, and parenting to a ParentNode.
 */
export class ParentedPlatformFactory implements GameObjectFactory {
    protected createPlatformObject(config: GameObjectConfig): ParentedPlatform {
        return new ParentedPlatform(null, config.scene);
    }

    protected setupPhysics(mesh: Mesh, config: GameObjectConfig): void {
        new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, config.scene);
    }

    private createImpl(config: GameObjectConfig, physics: boolean): ParentedPlatform {
        const platform = this.createPlatformObject(config);
        if(!config.size) {
            config.size = new Vector3(50, 50, 50);
        }

        const path = App.selectedGraphics + "/" + ParentedPlatform.Type + ".glb";

        Utils.createMeshTask(config, ParentedPlatform.Type, path, (task) => {
            const meshes = task.loadedMeshes;

            config.position = Utils.calculatePositionRelativeToParent(config.parent, config.position);
            config.rotation = Utils.calculateRotationRelativeToParent(config.parent, config.rotation);
            Utils.configureMesh(meshes, config);
            
            if (!config.scene.getGlowLayerByName("platformGlow")) {
                const glowLayer = new GlowLayer("platformGlow", config.scene);
                glowLayer.intensity = 0.1;
            }            
            meshes[1].material.emissiveColor = new Color3(0.2, 0.6, 1); 

            if(physics) {
                this.setupPhysics(meshes[0], config);
                config.parent.addObserver(platform);
            }

            config.parent.addChild(meshes[0]);

            meshes.forEach((m) => {
                m.name = Platform.Type;
                platform.mesh.push(m as Mesh);
            });
        });

        return platform;
    }

    public create(GameObjectConfig: any): GameObject {
        return this.createImpl(GameObjectConfig, true);
    }

    public createForEditor(config: GameObjectConfig): EditorObject {
        const platform = this.createImpl(config, false);
        return new ObjectEditorImpl(platform);        
    }
}

/**
 * FixedPlatformFactory creates FixedPlatform instances for gameplay or the editor.
 * Handles mesh loading, configuration, and physics.
 */
export class FixedPlatformFactory implements GameObjectFactory {
    protected createPlatformObject(config: GameObjectConfig): Platform {
        return new FixedPlatform(null, config.scene);
    }

    protected setupPhysics(mesh: Mesh, config: GameObjectConfig): void {
        new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, config.scene);
    }

    private createImpl(config: GameObjectConfig, physics: boolean): FixedPlatform {
        const platform = this.createPlatformObject(config);
        if(!config.size) {
            config.size = new Vector3(50, 50, 50);
        }

        const path = App.selectedGraphics + "/" + FixedPlatform.Type + ".glb";

        Utils.createMeshTask(config, FixedPlatform.Type, path, (task) => {
            const meshes = task.loadedMeshes;

            Utils.configureMesh(meshes, config);
            if (physics) {
                this.setupPhysics(meshes[0], config);
            }

            meshes.forEach((m) => {
                m.name = Platform.Type;
                platform.mesh.push(m as Mesh);
            });
        });

        return platform;
    }

    public create(config: GameObjectConfig): Platform {
        return this.createImpl(config, true);
    }

    public createForEditor(config: GameObjectConfig): EditorObject {
        const actual_platform = this.createImpl(config, false);
        return new ObjectEditorImpl(actual_platform);        
    }
}

/**
 * RocketFactorySpawner handles automatic rocket spawning for rocket activation platforms.
 * Used by both parented and fixed rocket activation platforms.
 */
class RocketFactorySpawner {
    private rocketFactory: FixedRocketFactory;
    private assetsManager: AssetsManager;
    private platform: ParentedRocketActivationPlatform | FixedRocketActivationPlatform;
    private readonly respawnTimer: number = 1500;
    private timer: number = 0;

    constructor(platform: ParentedRocketActivationPlatform | FixedRocketActivationPlatform) {
        this.platform = platform;
        this.rocketFactory = new FixedRocketFactory();
        this.assetsManager = new AssetsManager(platform.getScene());
        this.assetsManager.useDefaultLoadingScreen = false;
    }

    public createRocket() {
        console.log("Adding rocket to platform");

        const config = {
            position: this.platform.getMesh().getAbsolutePosition().clone().addInPlace(Vector3.Up().scale(200)),
            rotation: Vector3.Zero(),
            scene: this.platform.getScene(),
            assetsManager: this.assetsManager,
        }
        const rocket = this.rocketFactory.create(config);

        this.assetsManager.onFinish = () => {
            this.platform.notifyObservers(rocket);
        }

        this.assetsManager.load();
    }

    public create() {
        if (this.timer >= this.respawnTimer) {
            this.createRocket();
            this.timer = 0;
        }
    }

    public update(dt: number): void {
        this.timer += dt;
    }
}

/**
 * ParentedRocketActivationPlatform is a parented platform that can spawn rockets on contact.
 * Notifies its observers when a rocket is spawned.
 */
export class ParentedRocketActivationPlatform extends ParentedPlatform {
    public static readonly Type: string = "parented_rocket_activation_platform";
    private spawner: RocketFactorySpawner = new RocketFactorySpawner(this);
    private observers: GameObjectObserver[] = [];

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }

    public getType(): string {
        return ParentedRocketActivationPlatform.Type;
    }

    public onContact(): boolean {
        this.spawner.create();
        return false;
    }

    public getScene(): Scene {
        return this.scene;
    }

    public notifyObservers(rocket: RocketObject): void {
        this.observers.forEach(observer => {
            observer.onSpawnObject(rocket);
        });
    }

    public addObserver(observer: GameObjectObserver): void {
        this.observers.push(observer);
    }

    public update(dt: number, __: CharacterInput): void {
        this.spawner.update(dt);
    }
}

/**
 * ParentedRocketActivationPlatformFactory creates ParentedRocketActivationPlatform instances.
 * Configures physics and enables collision callbacks.
 */
export class ParentedRocketActivationPlatformFactory extends ParentedPlatformFactory {
    protected createPlatformObject(config: GameObjectConfig): ParentedPlatform {
        return new ParentedRocketActivationPlatform(null, config.scene);
    }

    protected setupPhysics(mesh: Mesh, config: GameObjectConfig): void {
        const agggregate = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, config.scene);
        agggregate.body.setCollisionCallbackEnabled(true);
    }
}

/**
 * FixedRocketActivationPlatform is a fixed platform that can spawn rockets on contact.
 * Notifies its observers when a rocket is spawned.
 */
export class FixedRocketActivationPlatform extends FixedPlatform {
    public static readonly Type: string = "fixed_rocket_activation_platform";
    private spawner: RocketFactorySpawner = new RocketFactorySpawner(this);
    private observers: GameObjectObserver[] = [];

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }

    public getType(): string {
        return ParentedRocketActivationPlatform.Type;
    }

    public onContact(): boolean {
        this.spawner.create();
        return false;
    }

    public getScene(): Scene {
        return this.scene;
    }

    public notifyObservers(rocket: RocketObject): void {
        this.observers.forEach(observer => {
            observer.onSpawnObject(rocket);
        });
    }

    public addObserver(observer: GameObjectObserver): void {
        this.observers.push(observer);
    }

    public update(dt: number, __: CharacterInput): void {
        this.spawner.update(dt);
    }
}

/**
 * FixedRocketActivationPlatformFactory creates FixedRocketActivationPlatform instances.
 * Configures physics and enables collision callbacks.
 */
export class FixedRocketActivationPlatformFactory extends FixedPlatformFactory {
    protected createPlatformObject(config: GameObjectConfig): FixedPlatform {
        return new FixedRocketActivationPlatform(null, config.scene);
    }

    protected setupPhysics(mesh: Mesh, config: GameObjectConfig): void {
        const agggregate = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, config.scene);
        agggregate.body.setCollisionCallbackEnabled(true);
    }
}