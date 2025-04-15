import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, TransformNode, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";

export class Platform {
    private scene: Scene;
    private size: Vector3;
    private position: Vector3;
    private color: Color3;
    private parent: TransformNode;
    private mesh: TransformNode;

    constructor(scene: Scene, size: Vector3, position: Vector3, color: Color3, parent: TransformNode) {
        this.scene = scene;
        this.size = size;
        this.position = position;
        this.color = color;
        this.parent = parent;

        // Create the platform
        this.mesh = this.createPlatform();
    }

    public createPlatform(): TransformNode {
        const platform = MeshBuilder.CreateBox("platform", { width: this.size.x, height: this.size.y, depth: this.size.z }, this.scene);
        platform.position = this.position;
        platform.parent = this.parent;

        // Apply material
        const material = new StandardMaterial("platformMaterial", this.scene);
        material.diffuseColor = this.color; // Set the main color
        material.emissiveColor = this.color; // Ensure uniform color on all sides
        platform.material = material;

        // Add physics to the platform
        new PhysicsAggregate(platform, PhysicsShapeType.BOX, { mass: 0, friction: 0.5, restitution: 0.1 }, this.scene);
        return platform;
    }
}
