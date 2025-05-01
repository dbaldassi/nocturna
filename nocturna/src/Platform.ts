import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Texture, Mesh } from "@babylonjs/core";
import { ParentNodeObserver, ParentNode } from "./ParentNode";

export class Platform implements ParentNodeObserver {

    private mesh: Mesh;

    constructor(mesh: Mesh) {
        this.mesh = mesh;
    }

    static create(config: { size: Vector3, position: Vector3, color: Color3, rotation: Vector3 }, parent: ParentNode, scene: Scene): Platform {
        // const platform = new Platform(scene, config.size, config.position, config.rotation, config.color);

        const mesh = MeshBuilder.CreateBox("platform", { width: config.size.x, height: config.size.y, depth: config.size.z }, scene);
        mesh.position = config.position;
        mesh.rotation = config.rotation;

        // Apply material
        const material = new StandardMaterial("platformMaterial", scene);
        material.diffuseTexture = new Texture("images/wood.jpg", scene); // Replace with the path to your wood texture
        material.backFaceCulling = false; // Ensure the texture is visible from all sides
        mesh.material = material;

        // Add physics to the platform
        new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, scene);

        const platform = new Platform(mesh);

        parent.addChild(mesh);
        parent.addObserver(platform);

        return platform;
    }

    public onRotationChange() {
        this.recreatePhysicsBody();
    }

    public recreatePhysicsBody() {
        // Supprimez l'ancien corps physique
        if (this.mesh.physicsBody) {
            this.mesh.physicsBody.dispose();
        }
    
        // Créez un nouveau corps physique avec les nouvelles transformations
        new PhysicsAggregate(this.mesh, PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, this.scene);
    }

    public getMesh(): Mesh {
        return this.mesh;
    }
}
