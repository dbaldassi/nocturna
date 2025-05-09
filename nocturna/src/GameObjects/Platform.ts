import { Scene, Vector3, PhysicsAggregate, PhysicsShapeType, Mesh } from "@babylonjs/core";
import { ParentNodeObserver } from "../ParentNode";
import { CharacterInput, EditorObject, GameObject, GameObjectConfig, GameObjectFactory, Utils } from "../types";
import { ObjectEditorImpl } from "./EditorObject";

export class Platform implements GameObject {
    public static readonly Type: string = "platform";

    protected mesh: Mesh[] = [];
    protected scene: Scene;

    constructor(mesh: Mesh, scene: Scene) {
        if(mesh) this.mesh.push(mesh);
        this.scene = scene;
    }

    public getMesh(): Mesh {
        console.log(this.mesh);
        return this.mesh[0];
    }

    public getMeshes(): Mesh[] {
        return this.mesh;
    }

    public accept(_: any): void {
    }

    public update(_: number, __: CharacterInput): void {
    }
}

export class ParentedPlatform extends Platform implements ParentNodeObserver {

    public static readonly Type: string = "parented_platform";

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }

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

}

export class FixedPlatform extends Platform  {
    public static readonly Type: string = "fixed_platform";

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
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
    
            Utils.createMeshTask(config, ParentedPlatform.Type, "platform3.glb", (task) => {
                const meshes = task.loadedMeshes;
    
                meshes[0].name = Platform.Type;
                Utils.configureMesh(meshes, config);
                
                if(physics) {
                    new PhysicsAggregate(meshes[0], PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, config.scene);
                    config.parent.addObserver(platform);
                }

                config.parent.addChild(meshes[0]);

                meshes.forEach((m) => {
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

        Utils.createMeshTask(config, FixedPlatform.Type, "platform4.glb", (task) => {
            const meshes = task.loadedMeshes;

            meshes[0].name = Platform.Type;
            Utils.configureMesh(meshes, config);
           
            if (physics) {
                new PhysicsAggregate(meshes[0], PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, config.scene);
            }

            // platform.mesh[0] = mesh;
            meshes.forEach((m) => {
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
