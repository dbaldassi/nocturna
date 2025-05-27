import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Mesh, ParticleSystem, Texture, Color4, StaticSound } from "@babylonjs/core";
import { GameObjectConfig, GameObjectFactory, EditorObject, GameObjectVisitor, Enemy, CollisionGroup, Utils } from "../types";
import { ObjectEditorImpl } from "./EditorObject";

export class RocketObject implements Enemy {
    static readonly Type: string = "rocket";
    private static nextId: number = 0;
    private id: string;

    protected mesh: Mesh;
    protected scene: Scene;
    private damage: number = 5;
    public explosionRadius: number = 10;

    private sounds: Map<string, StaticSound> = new Map();

    constructor(mesh: Mesh, scene: Scene) {
        this.mesh = mesh;
        this.scene = scene;
        this.id = `${RocketObject.Type}_${RocketObject.nextId++}`;
    }
    public addSound(name: string, sound: StaticSound): void {
        this.sounds.set(name, sound);
    }
    public playSound(name: string): void {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.play();
        } else {
            console.warn(`Sound ${name} not found for rocket.`);
        }
    }
    public stopSound(name: string): void {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.stop();
        } else {
            console.warn(`Sound ${name} not found for rocket.`);
        }
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
        this.explode();
        return true;
    }

    public update(_: number): void { }

    public enableCollision(): void {
        const physicsBody = this.mesh.physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the rocket mesh.");
            return;
        }

        physicsBody.shape.filterMembershipMask = CollisionGroup.ROCKET; // Set the membership mask for rockets
        physicsBody.shape.filterCollideMask = 0xFFFFFFFF & ~CollisionGroup.FACES; // Allow collision with except faces

        physicsBody.setCollisionCallbackEnabled(true);
    }

    private explode(): void {
        this.stopSound("drop");
        this.playSound("explosion");

        // Create a particle system for the explosion
        const particleSystem = new ParticleSystem("explosion", 2000, this.scene);

        // Set the texture for the particles
        particleSystem.particleTexture = new Texture("textures/flare.png", this.scene);

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
        this.mesh.dispose(); // Dispose the rocket mesh
        particleSystem.start();

        // Stop the particle system after a short duration
        setTimeout(() => {
            particleSystem.stop();
            particleSystem.dispose();
        }, 1000);
    }
    public onPause(): void {
        // if (this.mesh.physicsBody) {
        //     this.mesh.physicsBody.dispose();
        //     this.mesh.physicsBody = null;
        // }
    }
    
    public onResume(): void {
    }

    public activate(): void {
        new PhysicsAggregate(this.mesh, PhysicsShapeType.CYLINDER, { mass: 5, friction: 0.5, restitution: 0.2 }, this.scene);
        this.enableCollision();
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
        new PhysicsAggregate(mesh, PhysicsShapeType.CYLINDER, { mass: 20, friction: 0.5, restitution: 0.2 }, config.scene);
        const rocket = new FixedRocket(mesh, config.scene);
        rocket.enableCollision(); // Enable collision detection

        Utils.loadSound(config.assetsManager, "drop", "assets/sounds/drop.mp3", (sound) => {
            rocket.addSound("drop", sound);
            rocket.playSound("drop");
        });
        Utils.loadSound(config.assetsManager, "explosion", "assets/sounds/explosion.ogg", (sound) => {
            sound.spatial.attach(mesh);
            rocket.addSound("explosion", sound);
        }, true);

        return rocket;
    }

    public createForEditor(config: GameObjectConfig): EditorObject {
        const rocket = new FixedRocket(this.createMesh(config), config.scene);
        return new ObjectEditorImpl(rocket);
    }
}
