import { Scene, TransformNode, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";
import { Face } from "./Face";

export class Cube {
    private scene: Scene;
    private size: number;
    private parent: TransformNode;
    mesh: any;
    private faces: Face[] = [];

    constructor(scene: Scene, size: number, parent: TransformNode) {
        this.scene = scene;
        this.size = size;

        // Create a parent node for the cube
        this.parent = parent;

        // Initialize the cube mesh
        this.mesh = MeshBuilder.CreateBox("cubeMesh", { size: this.size }, this.scene);
        this.mesh.parent = this.parent;

        // Initialize the cube
        this.createPlanes();
    }

    private createPlanes() {
        // create 6 face with face class
        const colors = [
            new Color3(1, 0, 0), // Red
            new Color3(0, 1, 0), // Green
            new Color3(0, 0, 1), // Blue
            new Color3(1, 1, 0), // Yellow
            new Color3(1, 0.5, 0), // Orange
            new Color3(1, 1, 1) // White
        ];
        const positions = [
            new Vector3(0, 0, -this.size / 2),
            new Vector3(0, 0, this.size / 2),
            new Vector3(this.size / 2, 0, 0),
            new Vector3(-this.size / 2, 0, 0),
            new Vector3(0, this.size / 2, 0),
            new Vector3(0, -this.size / 2, 0)
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

    public getParent(): TransformNode {
        return this.parent;
    }

    public rotateLeft(): void {
        return;
    }
}