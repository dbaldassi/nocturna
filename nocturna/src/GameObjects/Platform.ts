import { Scene, Vector3, PhysicsAggregate, PhysicsShapeType, Mesh, AssetsManager, GlowLayer, Color3 } from "@babylonjs/core";
import { ParentNodeObserver } from "../ParentNode";
import { CharacterInput, EditorObject, GameObject, GameObjectConfig, GameObjectFactory, GameObjectObserver, Utils } from "../types";
import { ObjectEditorImpl } from "./EditorObject";
import { App } from "../app";
import { FixedRocketFactory, RocketObject } from "./Rocket";

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

    public accept(_: any): void {
    }

    public update(_: number, __: CharacterInput): void {
    }

    public getType(): string {
        return Platform.Type;
    }

    public onPause(): void {
    }
    public onResume(): void {
    }
    public onContact(): boolean {
        return false;
    }

    public addObserver(_: GameObjectObserver): void {
    }
}

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

    public getType(): string {
        return ParentedPlatform.Type;
    }
}

export class FixedPlatform extends Platform  {
    public static readonly Type: string = "fixed_platform";

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }

    public getType(): string {
        return FixedPlatform.Type;
    }
}

export class ParentedPlatformFactory implements GameObjectFactory {

    protected createPlatformObject(config: GameObjectConfig): ParentedPlatform {
        return new ParentedPlatform(null, config.scene);
    }

    protected setupPhysics(mesh: Mesh, config: GameObjectConfig): void {
        new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, config.scene);
    }

    private createImpl(config: GameObjectConfig, physics: boolean): ParentedPlatform {
            // const mesh = this.createMesh(config);
            // const player = new Player(mesh, config.scene);
            const platform = this.createPlatformObject(config);
            if(!config.size) {
                config.size = new Vector3(50, 50, 50);
            }

            const path = App.selectedGraphics + "/" + ParentedPlatform.Type + ".glb";

            Utils.createMeshTask(config, ParentedPlatform.Type, path, (task) => {
                const meshes = task.loadedMeshes;
    
                config.position = Utils.calculatePositionRelativeToParent(config.parent, config.position);
                // set rotation as if parent is not rotated
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
        const platform = this.createImpl(GameObjectConfig, true);
        return platform;
    }

    public createForEditor(config: GameObjectConfig): EditorObject {
        const platform = this.createImpl(config, false);
        const editor = new ObjectEditorImpl(platform);        
        return editor;
    }
}

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

            // platform.mesh[0] = mesh;
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
        const platform = new ObjectEditorImpl(actual_platform);        
        return platform;
    }
}

class RocketFactorySpawner {
    private rocketFactory: FixedRocketFactory;
    private assetsManager: AssetsManager; // Assuming assetsManager is part of the config
    private platform: ParentedRocketActivationPlatform | FixedRocketActivationPlatform;

    private readonly respawnTimer: number = 1500; // Static timer for the platform
    private timer: number = 0;

    constructor(platform: ParentedRocketActivationPlatform | FixedRocketActivationPlatform) {
        this.platform = platform;
        this.rocketFactory = new FixedRocketFactory();
        this.assetsManager = new AssetsManager(platform.getScene());
        this.assetsManager.useDefaultLoadingScreen = false; // Disable default loading screen
    }

    public createRocket() {
        console.log("Adding rocket to platform");

        const config = {
            position: this.platform.getMesh().position.clone().addInPlace(Vector3.Up().scale(200)), // Position the rocket above the platform
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
            this.timer = 0; // Reset timer after adding a rocket
        }
    }

    public update(dt: number): void {
        this.timer += dt;
    }
}

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
        this.spawner.create(); // Check if we need to spawn a rocket
        return false; // No specific contact behavior for this platform
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
        // No observers for fixed platforms
        this.observers.push(observer);
    }

    public update(dt: number, __: CharacterInput): void {
        this.spawner.update(dt);
    }
}

export class ParentedRocketActivationPlatformFactory extends ParentedPlatformFactory {
    protected createPlatformObject(config: GameObjectConfig): ParentedPlatform {
        return new ParentedRocketActivationPlatform(null, config.scene);
    }

    protected setupPhysics(mesh: Mesh, config: GameObjectConfig): void {
        const agggregate = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, config.scene);
        agggregate.body.setCollisionCallbackEnabled(true); // Enable collision callback
    }
}

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
        this.spawner.create(); // Check if we need to spawn a rocket
        return false; // No specific contact behavior for this platform
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
        // No observers for fixed platforms
        this.observers.push(observer);
    }

    public update(dt: number, __: CharacterInput): void {
        this.spawner.update(dt);
    }
}

export class FixedRocketActivationPlatformFactory extends FixedPlatformFactory {
    protected createPlatformObject(config: GameObjectConfig): FixedPlatform {
        return new FixedRocketActivationPlatform(null, config.scene);
    }

    protected setupPhysics(mesh: Mesh, config: GameObjectConfig): void {
        const agggregate = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, config.scene);
        agggregate.body.setCollisionCallbackEnabled(true); // Enable collision callback
    }
}