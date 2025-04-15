import { Color3, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { Cube } from "./Cube";

export class Face {
    private scene: Scene;
    private size: number;
    private parent: Cube;
    private position: Vector3;
    private cubeFace: string;
    private color: Color3;
    private rotation: Vector3;

    constructor(scene: Scene, size: number, parent: Cube, position: Vector3, cubeFace: string, color: Color3, rotation: Vector3) {
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
        const plane = MeshBuilder.CreatePlane(this.cubeFace, { size: this.size }, this.scene);
        plane.rotation = this.rotation;

        // Ensure the parent mesh is defined
        if (!this.parent.mesh) {
            throw new Error(`Parent mesh is undefined for cube face: ${this.cubeFace}`);
        }

        // Adjust the position to be relative to the parent cube
        plane.position = this.parent.mesh.position.add(this.position);

        plane.material = new StandardMaterial(this.cubeFace + "Material", this.scene);
        (plane.material as StandardMaterial).diffuseColor = this.color;
        plane.parent = this.parent.mesh; // Set the parent to the cube

        // Add physics to the plane
        new PhysicsAggregate(plane, PhysicsShapeType.BOX, { mass: 0, friction: 0.5, restitution: 0.3 }, this.scene);
    }
}