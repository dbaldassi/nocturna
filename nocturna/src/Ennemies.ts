import { Color3, Color4, MeshBuilder, ParticleSystem, PhysicsAggregate, PhysicsShapeType, Scene, StandardMaterial, Texture, Vector3 } from "@babylonjs/core";

class Ennemi {
    damageDone: number;

    constructor(damageDone: number) {
        this.damageDone = damageDone;
    }
}

export class Rocket extends Ennemi {
    speed: number;
    private mesh: any; // Placeholder for the mesh type

    constructor(damageDone: number, mesh: any, speed: number) {
        super(damageDone);
        this.mesh = mesh;
        this.speed = speed;
    }

    public static createEnnemi(scene: Scene, position: Vector3): Ennemi {
        // Create the rocket mesh
        const rocketMesh = MeshBuilder.CreateCylinder("rocket", { diameter: 5, height: 10 }, scene);
        rocketMesh.position = position; // Set initial position

        // Apply material to the rocket
        const material = new StandardMaterial("rocketMaterial", scene);
        material.diffuseColor = new Color3(1, 0, 1); // Red color
        rocketMesh.material = material;

        // Add physics to the rocket
        new PhysicsAggregate(rocketMesh, PhysicsShapeType.CYLINDER, { mass: 5, friction: 0.5, restitution: 0.2 }, scene);
        const rocket = new Rocket(10, rocketMesh, 100);
        rocket.act();
        // Return a new Rocket instance
        return rocket;
    }

    act(): void {
        const physicsBody = this.mesh.physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the rocket mesh.");
            return;
        }

        const downwardVelocity = new Vector3(0, -this.speed, 0); // Move straight down
        physicsBody.setLinearVelocity(downwardVelocity);

        physicsBody.setCollisionCallbackEnabled(true);
        const rocketObservable = physicsBody.getCollisionObservable();
        rocketObservable.add((collisionEvent) => {
            this.explode(); // Call explode method on collision  
        });
    }

    private explode(): void {
        // Create a particle system for the explosion
        const particleSystem = new ParticleSystem("explosion", 2000, this.mesh.getScene());
    
        // Set the texture for the particles
        particleSystem.particleTexture = new Texture("textures/flare.png", this.mesh.getScene());
    
        // Set the emitter to the rocket's position
        particleSystem.emitter = this.mesh.position.clone();
    
        // Configure particle system properties
        particleSystem.minEmitBox = new Vector3(-1, -1, -1); // Minimum box size
        particleSystem.maxEmitBox = new Vector3(1, 1, 1); // Maximum box size
        particleSystem.color1 = new Color4(1, 0.5, 0, 1); // Orange
        particleSystem.color2 = new Color4(1, 0, 0, 1); // Red
    
        // Increase particle size
        particleSystem.minSize = 5; // Increased from 2
        particleSystem.maxSize = 20; // Increased from 10
    
        particleSystem.minLifeTime = 0.2;
        particleSystem.maxLifeTime = 1;
        particleSystem.emitRate = 1000;
    
        // Set particle system direction and speed
        particleSystem.direction1 = new Vector3(-1, 1, -1);
        particleSystem.direction2 = new Vector3(1, 1, 1);
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 3;
    
        // Start the particle system
        particleSystem.start();
    
        // Stop the particle system after a short duration
        setTimeout(() => {
            particleSystem.stop();
            particleSystem.dispose();
        }, 1000);
    
        // Optionally, remove the rocket mesh from the scene
        this.mesh.dispose();
    }
}

