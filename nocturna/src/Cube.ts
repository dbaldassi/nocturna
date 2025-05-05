import { Scene, Vector3, MeshBuilder, Color3 } from "@babylonjs/core";
import { Face } from "./Face";
import { CharacterInput } from "./types";

export class Cube {
    private scene: Scene;
    private size: number;
    private faces: Face[] = [];
    private mesh: any;

    public static readonly Type: string = "Cube";
    public static readonly DefaultSize: number = 3000;

    constructor(scene: Scene, size: number) {
        this.scene = scene;
        this.size = size;
    }

    public static create(scene: Scene, position: Vector3 = Vector3.Zero(), size: number = Cube.DefaultSize): Cube {
        const cube = new Cube(scene, size);

        const mesh = MeshBuilder.CreateBox("cubeMesh", { size: size }, scene);
        mesh.position = position;
        mesh.isVisible = false;
        cube.mesh = mesh; 

        cube.createPlanes();

        return cube;
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

    public getMesh(): any {
        return this.mesh;
    }

    public getFaces(): Face[] {
        return this.faces;
    }

    public serialize(): any {
        const data = {
            position: this.mesh.position,
            size: this.size,
        };
        return data;
    }
}