import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, TransformNode, PhysicsAggregate, PhysicsShapeType, Texture, Mesh } from "@babylonjs/core";
import { Cube } from "./Cube";

export class Platform {
    private scene: Scene;
    private size: Vector3;
    private position: Vector3;
    private rotation: Vector3;
    private color: Color3;
    private parent: TransformNode;
    private mesh: Mesh;

    constructor(scene: Scene, size: Vector3, position: Vector3, rotation: Vector3, color: Color3, parent: TransformNode) {
        this.scene = scene;
        this.size = size;
        this.position = position;
        this.color = color;
        this.parent = parent;
        this.rotation = rotation;

        // Create the platform
        this.mesh = this.createPlatform();
    }

    public createPlatform(): Mesh {
        const platform = MeshBuilder.CreateBox("platform", { width: this.size.x, height: this.size.y, depth: this.size.z }, this.scene);
        platform.position = this.position;
        platform.parent = this.parent;
        platform.rotation = this.rotation;

        // Apply material
        const material = new StandardMaterial("platformMaterial", this.scene);
        material.diffuseTexture = new Texture("images/wood.jpg", this.scene); // Replace with the path to your wood texture
        material.backFaceCulling = false; // Ensure the texture is visible from all sides
        platform.material = material;

        // Add physics to the platform
        new PhysicsAggregate(platform, PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, this.scene);

        return platform;
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
