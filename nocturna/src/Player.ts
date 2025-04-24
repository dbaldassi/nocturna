import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Mesh, Space, TransformNode, BoundingBox, Ray } from "@babylonjs/core";
import { Cube } from "./Cube";
import { Platform } from "./Platform";
import { CharacterInput } from "./types";

export class Player {
    private scene: Scene;
    public mesh: Mesh;
    private diameter: number = 10;
    private position: Vector3;
    private speed: number = 2000.0;
    private jumpPosition: Vector3 = undefined;

    constructor(scene: Scene, position: Vector3) {
        this.scene = scene;
        this.position = position;

        this.mesh = this.createPlayer();
    }

    public createPlayer(): Mesh {
        const sphere = MeshBuilder.CreateSphere("player", { diameter: this.diameter }, this.scene);
        sphere.position = this.position;
        sphere.position.y += this.diameter * 2;

        const material = new StandardMaterial("playerMaterial", this.scene);
        material.diffuseColor = new Color3(1, 0, 0);
        sphere.material = material;
        new PhysicsAggregate(sphere, PhysicsShapeType.SPHERE, { mass: 70, friction: 10, restitution: 0 }, this.scene);
        // sphere.physicsBody.setMassProperties({ mass: 1 });

        return sphere;
    }

    // public move(dt: number, input: CharacterInput) {
    //     const forward = this.mesh.getDirection(Vector3.Forward()).scale(input.left ? 1 : 0);
    //     const right = this.mesh.getDirection(Vector3.Right()).scale(input.right ? 1: 0);
    //     const up = this.mesh.getDirection(Vector3.Up()).scale(input.jump ? 1 : 0);

    //     const movement = forward.add(right).add(up).scale(this.speed * dt / 1000);
    //     console.log("Movement Vector: ", movement);

    //     // Apply the movement to the player
    //     this.mesh.moveWithCollisions(movement);
    // }

    public move(dt: number, input: CharacterInput) {
        // Récupérer le corps physique du joueur
        const physicsBody = this.mesh.physicsBody;

        if (!physicsBody) {
            console.warn("Physics body not found for the player mesh.");
            return;
        }

        // console.log(input);

        // Calculer les directions locales
        const right = Vector3.Right().scale(input.right ? -5 : 0);
        const left = Vector3.Left().scale(input.left ? -5 : 0);

        // Combiner les mouvements horizontaux
        const horizontalMovement = right.add(left);
        // console.log("Velocity Vector: ", horizontalMovement);
        // Appliquer la vitesse en fonction de l'entrée utilisateur
        const velocity = horizontalMovement.scale(this.speed * dt / 1000);


        // Récupérer la vitesse actuelle pour conserver l'effet de gravité
        const currentVelocity = physicsBody.getLinearVelocity();
        velocity.y = currentVelocity.y; // Conserver la composante verticale (gravité)

        physicsBody.setLinearVelocity(velocity);

        // const maxJumpVelocity = Math.sqrt(2 * 9.81 * 200); // Calcul de la vitesse maximale

        // console.log(this.mesh.getAbsolutePosition().y, this.jumpPosition?.y);

        // if (this.jumpPosition && this.mesh.getAbsolutePosition().y >= this.jumpPosition.y + 20) {
        //     velocity.y = -1; // Limiter la vitesse verticale

        //     const extraGravity = new Vector3(0, -5000, 0); // Force descendante supplémentaire
        //     physicsBody.applyForce(extraGravity, this.mesh.getAbsolutePosition());

        //     this.jumpPosition = undefined; 
        // }

        // // Appliquer la nouvelle vitesse
        // physicsBody.setLinearVelocity(velocity);

        // //console.log("Applied Velocity:", velocity);
        // if (currentVelocity.y < 0) {
        //     const extraGravity = new Vector3(0, -5000, 0); // Force descendante supplémentaire
        //     physicsBody.applyForce(extraGravity, this.mesh.getAbsolutePosition());
        // }

        const ray = new Vector3(0, -1, 0); // Downward ray
        const rayLength = this.diameter / 2 + 0.1; // Slightly below the player
        const rayOrigin = this.mesh.getAbsolutePosition().add(new Vector3(0, -this.diameter / 2, 0)); // Adjust ray origin to the bottom of the player
        const hit = this.scene.pickWithRay(new Ray(rayOrigin, ray, rayLength));

        const isGrounded = hit && hit.pickedMesh && hit.pickedMesh.name.startsWith("platform");

        if (input.jump && isGrounded) {
            const jumpForce = new Vector3(0, 100000, 0); 
            physicsBody.applyImpulse(jumpForce, this.mesh.getAbsolutePosition());
        }
    }

    public update(dt: number, input: CharacterInput) {
        this.move(dt, input);
    }
}
