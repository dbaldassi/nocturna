import { Scene, TransformNode, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";
import { Face } from "./Face";
import { Platform } from "./Platform";

export class Cube extends TransformNode {
    private scene: Scene;
    private size: number;
    private faces: Face[] = [];

    constructor(scene: Scene, size: number) {
        super("parentCube", scene); // Initialize TransformNode
        this.scene = scene;
        this.size = size;

        // Initialize the cube mesh
        const mesh = MeshBuilder.CreateBox("cubeMesh", { size: this.size }, this.scene);
        mesh.parent = this;

        // Initialize the cube faces
        this.createPlanes();
    }

    private createPlanes() {
        const colors = [
            new Color3(1, 0, 0), // Red
            new Color3(0, 1, 0), // Green
            new Color3(0, 0, 1), // Blue
            new Color3(1, 1, 0), // Yellow
            new Color3(1, 0.5, 0), // Orange
            new Color3(1, 0.5, 1) // White
        ];
        const positions = [
            new Vector3(0, 0, -this.size),
            new Vector3(0, 0, this.size),
            new Vector3(this.size, 0, 0),
            new Vector3(-this.size, 0, 0),
            new Vector3(0, this.size, 0),
            new Vector3(0, -this.size, 0)
        ];
        const rotations = [
            new Vector3(0, Math.PI, 0),
            new Vector3(0, 0, 0),
            new Vector3(0, Math.PI / 2, 0),
            new Vector3(0, -Math.PI / 2, 0),
            new Vector3(-Math.PI / 2, 0, 0),
            new Vector3(Math.PI / 2, 0, 0)
        ];
        const names = [
            "Front",
            "Back",
            "Right",
            "Left",
            "Top",
            "Bottom"
        ];
        for (let i = 0; i < 6; i++) {
            const face = new Face(this.scene, this.size, this, positions[i], names[i], colors[i], rotations[i]);
            this.faces.push(face);
        }
    }
}