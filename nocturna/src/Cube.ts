import { Scene, TransformNode, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Animation } from "@babylonjs/core";
import { Face } from "./Face";
import { Platform } from "./Platform";
import { CharacterInput } from "./types";

export class Cube {
    private scene: Scene;
    private size: number;
    private faces: Face[] = [];
    public mesh: any;

    constructor(scene: Scene, size: number) {
        this.scene = scene;
        this.size = size;
        // Initialize the cube mesh
        const mesh = MeshBuilder.CreateBox("cubeMesh", { size: this.size }, this.scene);
        this.mesh = mesh; 
        this.mesh.isVisible = false;

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
            const face = new Face(this.scene, this.size, this.mesh, positions[i], names[i], colors[i], rotations[i]);
            this.faces.push(face);
        }
    }

    public update(_: number, __: CharacterInput) {

    }

    public getMesh(): any {
        return this.mesh;
    }

    public getFaces(): Face[] {
        return this.faces;
    }

}