import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Mesh, ParticleSystem, Texture, Color4 } from "@babylonjs/core";
import { GameObject, GameObjectConfig, GameObjectFactory, EditorObject, Utils, CharacterInput, GameObjectVisitor, Enemy, CollisionGroup } from "../types";
import { ObjectEditorImpl } from "./EditorObject";

export class RocketObject implements Enemy {
    static readonly Type: string = "rocket";
    private static nextId: number = 0;
    private id: string;

    protected mesh: Mesh;
    protected scene: Scene;
    private damage: number = 5;
    public explosionRadius: number = 10;

    constructor(mesh: Mesh, scene: Scene) {
        this.mesh = mesh;
        this.scene = scene;
        this.id = `${RocketObject.Type}_${RocketObject.nextId++}`;
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    public getId(): string {
        return this.id;
    }

    public getMeshes(): Mesh[] {
        return [this.mesh];
    }

    public getType(): string {
        return RocketObject.Type;
    }

    public getDamage(): number {
        return this.damage;
    }

    public accept(visitor: GameObjectVisitor): void {
        visitor.visitEnemy(this);
    }

    public onContact(): boolean {
        console.log("Rocket has contacted something.");
        this.explode();
        return true;
    }

    public update(_: number): void {}

    public enableCollision(): void {
        const physicsBody = this.mesh.physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the rocket mesh.");
            return;
        }

        console.log(this.mesh.position);

        physicsBody.shape.filterMembershipMask = CollisionGroup.ROCKET; // Set the membership mask for rockets
        physicsBody.shape.filterCollideMask = 0xFFFFFFFF & ~CollisionGroup.FACES; // Allow collision with except faces

        physicsBody.setCollisionCallbackEnabled(true);
    }

    private explode(): void {
        // Create a particle system for the explosion
        const particleSystem = new ParticleSystem("explosion", 2000, this.scene);

        // Set the texture for the particles
        particleSystem.particleTexture = new Texture("textures/flare.png", this.scene);

        console.log("Explosion at position:", this.mesh.position);
        // Set the emitter to the rocket's position
        particleSystem.emitter = this.mesh.position.clone();

        // Configure particle system properties
        particleSystem.minEmitBox = new Vector3(-1, -1, -1); // Minimum box size
        particleSystem.maxEmitBox = new Vector3(1, 1, 1); // Maximum box size
        particleSystem.color1 = new Color4(1, 0.5, 0, 1); // Orange
        particleSystem.color2 = new Color4(1, 0, 0, 1); // Red
        particleSystem.minSize = 2; // Increased from 2
        particleSystem.maxSize = 7; // Increased from 5
        particleSystem.minLifeTime = 0.2;
        particleSystem.maxLifeTime = 1;
        particleSystem.emitRate = 1000;
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
    }
}

export class FixedRocket extends RocketObject {
    public static readonly Type: string = "rocket";

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }

    public getType(): string {
        return FixedRocket.Type;
    }
}

export class FixedRocketFactory implements GameObjectFactory {
    public createMesh(config: GameObjectConfig): Mesh {
        if (!config.size) {
            config.size = new Vector3(10, 10, 10); // Default size for the rocket
        }

        const mesh = MeshBuilder.CreateCylinder("rocket", { diameter: config.size.x, height: config.size.y }, config.scene);
        mesh.position = config.position;
        mesh.rotation = config.rotation;

        const material = new StandardMaterial("rocketMaterial", config.scene);
        material.diffuseColor = Color3.Red();
        mesh.material = material;
        
        return mesh;
    }

    public create(config: GameObjectConfig): RocketObject {
        const mesh = this.createMesh(config);
        const rocket = new FixedRocket(mesh, config.scene);

        new PhysicsAggregate(mesh, PhysicsShapeType.CYLINDER, { mass: 5, friction: 0.5, restitution: 0.2 }, config.scene);

        rocket.enableCollision(); // Enable collision detection
        return rocket;
    }

    public createForEditor(config: GameObjectConfig): EditorObject {
        const rocket = new FixedRocket(this.createMesh(config), config.scene);
        return new ObjectEditorImpl(rocket);
    }
}
