import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Mesh, Space, TransformNode, BoundingBox } from "@babylonjs/core";
import { Cube } from "./Cube";
import { Platform } from "./Platform";

export class Player {
    private scene: Scene;
    private mesh: Mesh;
    private diameter: number = 10;
    private position: Vector3;
    private parent: Cube;

    constructor(scene: Scene, position: Vector3, parent: any) {
        this.scene = scene;
        this.position = position;
        this.parent = parent;

        this.mesh = this.createPlayer();
        this.addMovement();
    }

    public createPlayer(): Mesh {
        const sphere = MeshBuilder.CreateSphere("player", { diameter: this.diameter }, this.scene);
        sphere.position = this.position;
        sphere.position.y += this.diameter;
        sphere.parent = this.parent.mesh;

        const material = new StandardMaterial("playerMaterial", this.scene);
        material.diffuseColor = new Color3(1, 0, 0);
        sphere.material = material;

        // Add physics to the platform
        new PhysicsAggregate(sphere, PhysicsShapeType.SPHERE, { mass: 1, friction: 0.5, restitution: 0.1 }, this.scene);

        return sphere;
    }

    public addMovement() {
        window.addEventListener("keydown", (event) => {
            if (event.key === "z" || event.key === "Z") {
                this.mesh.position.z += 1;
            } else if (event.key === "s" || event.key === "S") {
                this.mesh.position.z -= 1;
            }
        });
    }
}
