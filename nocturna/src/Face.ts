import { Color3, HemisphericLight, Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, PointLight, Scene, StandardMaterial, Texture, TransformNode, Vector3 } from "@babylonjs/core";

export class Face {
    private scene: Scene;
    private size: number;
    private parent: TransformNode;
    private position: Vector3;
    private cubeFace: string;
    private color: Color3;
    private rotation: Vector3;
    private mesh: Mesh;

    constructor(scene: Scene, size: number, parent: any, position: Vector3, cubeFace: string, color: Color3, rotation: Vector3) {
        this.rotation = rotation;
        this.scene = scene;
        this.size = size;
        this.parent = parent;
        this.position = position;
        this.cubeFace = cubeFace;
        this.color = color;

        // Initialize the cube face
        this.createFace();
    }
    private createFace() {
        // Create a plane for the cube face
        const plane = MeshBuilder.CreatePlane(this.cubeFace, { size: this.size * 2 }, this.scene);
        this.mesh = plane; // Store the mesh reference
        plane.position = this.position;
        plane.rotation = this.rotation;
        plane.parent = this.parent;
        plane.name = this.cubeFace;

        // Adjust the position to be relative to the parent cube
        const material = new StandardMaterial(this.cubeFace + "Material", this.scene);
        material.diffuseColor = new Color3(0.1, 0.1, 0.1); // Dark color, but not completely black
        material.backFaceCulling = false; // Ensure the texture is visible from all angles
        material.specularColor = new Color3(0, 0, 0);
        plane.material = material;

        const pointLight = new HemisphericLight("hemisphericLight", new Vector3(this.position.x / 2, this.position.y / 2, this.position.z / 2), this.scene); // Place light at the center
        pointLight.intensity = 0.2; // Lower intensity for a dimmer effect
    }

    public getMesh() : Mesh {
        return this.mesh;
    }

}