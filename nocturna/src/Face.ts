import { Color3, HemisphericLight, MeshBuilder, PhysicsAggregate, PhysicsShapeType, PointLight, Scene, StandardMaterial, Texture, TransformNode, Vector3 } from "@babylonjs/core";
import { Cube } from "./Cube";

export class Face {
    private scene: Scene;
    private size: number;
    private parent: TransformNode;
    private position: Vector3;
    private cubeFace: string;
    private color: Color3;
    private rotation: Vector3;
    private mesh: any;

    constructor(scene: Scene, size: number, parent: TransformNode, position: Vector3, cubeFace: string, color: Color3, rotation: Vector3) {
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

        // Adjust the position to be relative to the parent cube
        const cloudMaterial = new StandardMaterial(this.cubeFace + "Material", this.scene);
        cloudMaterial.diffuseTexture = new Texture("images/clouds.jpg", this.scene); // Replace with your cloud texture path
        cloudMaterial.backFaceCulling = false; // Ensure the texture is visible from all angles
        plane.material = cloudMaterial;

        const pointLight = new HemisphericLight("hemisphericLight", new Vector3(this.position.x / 2, this.position.y / 2, this.position.z / 2   ), this.scene); // Place light at the center
        pointLight.intensity = 0.4;

        // Add physics to the plane
        new PhysicsAggregate(plane, PhysicsShapeType.BOX, { mass: 0, friction: 0.5, restitution: 0.3 }, this.scene);
    }

}