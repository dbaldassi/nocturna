import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh } from "@babylonjs/core";

export class Ball {
    public mesh: Mesh;

    constructor(scene: Scene, position: Vector3, diameter: number, color: Color3) {
        // Create the sphere mesh
        this.mesh = MeshBuilder.CreateSphere("ball", { diameter: diameter }, scene);

        // Set the position of the ball
        this.mesh.position = position;

        // Create and apply a material to the ball
        const ballMaterial = new StandardMaterial("ballMaterial", scene);
        ballMaterial.diffuseColor = color; // Set the color of the ball
        this.mesh.material = ballMaterial;

        console.log("Ball created at position:", this.mesh.position);
    }

    // Example method to update the ball's position
    public updatePosition(newPosition: Vector3) {
        this.mesh.position = newPosition;
    }
}