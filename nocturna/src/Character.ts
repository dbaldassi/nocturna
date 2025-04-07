import { Mesh, MeshBuilder, Scene, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";
import { CharacterInput } from "./types";

export class Character {
    // position: Vector3;
    velocity: Vector3;
    speed: number;
    jumpForce: number;
    isJumping: boolean;
    jumpDuration: number;
    jumpTime: number = 0;
    public mesh: Mesh;

    constructor(initialPosition: Vector3, scene: Scene) {

        this.mesh = MeshBuilder.CreateBox("character", { size: 2 }, scene);
        this.mesh.position = initialPosition;

        const material = new StandardMaterial("characterMaterial", scene);
        material.diffuseColor = new Color3(1, 0, 0); // Rouge
        this.mesh.material = material;

        // this.position = initialPosition;
        this.velocity = new Vector3(0, 0, 0);
        this.speed = 2;
        this.jumpForce = 2.5;
        this.jumpDuration = 1; // Durée du saut
        this.isJumping = false;
    }

    jump(dt: number) {
        this.jumpTime += dt / 1000; // Increment jump time

        if (!this.isJumping) {
            this.velocity.y = this.jumpForce;
            this.isJumping = true;
            this.jumpTime = 0;
        }

        if(this.jumpTime >= this.jumpDuration) {
            this.isJumping = false;
            this.jumpTime = 0;
            this.mesh.position.y = 1; // Reset position to ground level
        }
        else {
            const g = (-1/2 * 9.8 * this.jumpTime * this.jumpTime) + (1/2 * 9.8 * this.jumpDuration * this.jumpTime) + 1;
            this.mesh.position.y = g * this.jumpForce; // Apply gravity
            console.log(this.mesh.position.y);
        }   
    }

    update(dt: number, input: CharacterInput) {
        // Handle input
        const direction = new Vector3(0, 0, 0);
        direction.x -= input.right ? 1 : 0;
        direction.x += input.left ? 1 : 0;
        direction.x *= this.speed * (dt/1000); 
        // direction.y = this.velocity.y * (dt/1000); // Apply gravity

        if (input.jump || this.isJumping) this.jump(dt);
        
        // Normalize direction vector
        if (direction.length() > 0) {
            direction.normalize();
        }
        // Move character
        // this.move(direction);
        this.mesh.position.addInPlace(direction)

        // this.position.addInPlace(this.velocity);
        // this.velocity.y -= 0.5; // Simulate gravity

        // Reset jump when character is on the ground

    }
}