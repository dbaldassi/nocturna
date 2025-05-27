import { Scene, Vector3, PhysicsAggregate, PhysicsShapeType, Mesh } from "@babylonjs/core";
import { ParentNodeObserver } from "../ParentNode";
import { CharacterInput, EditorObject, GameObject, GameObjectConfig, GameObjectFactory, Utils } from "../types";
import { ObjectEditorImpl } from "./EditorObject";
import { App } from "../app";
import { RocketObject } from "./Rocket";

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
}

export class ParentedPlatform extends Platform implements ParentNodeObserver {

    public static readonly Type: string = "parented_platform";

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }

    public onRotationStart(): void {}

    public onRotationChange() {
        this.recreatePhysicsBody();
    }

    public recreatePhysicsBody() {
        // Supprimez l'ancien corps physique
        if (this.mesh[0].physicsBody) {
            this.mesh[0].physicsBody.dispose();
        }
    
        // Créez un nouveau corps physique avec les nouvelles transformations
        new PhysicsAggregate(this.mesh[0], PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, this.scene);
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

    private createImpl(config: GameObjectConfig, physics: boolean): ParentedPlatform {
            // const mesh = this.createMesh(config);
            // const player = new Player(mesh, config.scene);
            const platform = new ParentedPlatform(null, config.scene);
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
                
                if(physics) {
                    new PhysicsAggregate(meshes[0], PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, config.scene);
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

    private createImpl(config: GameObjectConfig, physics: boolean): FixedPlatform {
        const platform = new FixedPlatform(null, config.scene);
        if(!config.size) {
            config.size = new Vector3(50, 50, 50);
        }

        const path = App.selectedGraphics + "/" + FixedPlatform.Type + ".glb";

        Utils.createMeshTask(config, FixedPlatform.Type, path, (task) => {
            const meshes = task.loadedMeshes;

            Utils.configureMesh(meshes, config);
           
            if (physics) {
                new PhysicsAggregate(meshes[0], PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, config.scene);
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

export interface RocketActivationPlatform extends GameObject {
    addRocket(rocket: RocketObject): void;
    activateRockets(): void;
}

export class ParentedRocketActivationPlatform extends ParentedPlatform implements RocketActivationPlatform {
    public static readonly Type: string = "parented_rocket_activation_platform";
    public rockets: RocketObject[] = [];

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }

    public getType(): string {
        return ParentedRocketActivationPlatform.Type;
    }

    public addRocket(rocket: RocketObject) {
        this.rockets.push(rocket);
    }

    public activateRockets() {
        this.rockets.forEach((rocket) => {
            rocket.activate();
        });
    }
}

export class ParentedRocketActivationPlatformFactory extends ParentedPlatformFactory {
}

export class FixedRocketActivationPlatform extends FixedPlatform implements RocketActivationPlatform {
    public static readonly Type: string = "fixed_rocket_activation_platform";
    public rockets: RocketObject[] = [];

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }

    public getType(): string {
        return ParentedRocketActivationPlatform.Type;
    }

    public addRocket(rocket: RocketObject) {
        this.rockets.push(rocket);
    }

    public activateRockets() {
        this.rockets.forEach((rocket) => {
            rocket.activate();
        });
    }
}

export class FixedRocketActivationPlatformFactory extends FixedPlatformFactory {
}