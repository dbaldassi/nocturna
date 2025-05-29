/**
 * Rocket.ts defines the RocketObject class and its factory for creating and managing rocket enemies in the game.
 * 
 * Responsibilities:
 * - Implements the RocketObject class, representing a rocket enemy with physics, sound, and explosion effects.
 * - Handles rocket activation, collision, and explosion logic (including particle effects and sound).
 * - Provides a FixedRocket subclass and a FixedRocketFactory for instantiating rockets in the game or editor.
 * - Integrates with Babylon.js for mesh creation, physics, and particle systems.
 * 
 * Usage:
 * - Use `FixedRocketFactory.create(config)` to create a rocket for gameplay (with physics and collision).
 * - Use `FixedRocketFactory.createForEditor(config)` to create a rocket for the editor (without physics).
 * - The rocket explodes on contact, plays sounds, and displays a particle effect.
 * - Use `addSound(name, sound)` and `playSound(name)` to manage rocket sounds.
 * - Use `activate()` to enable physics and collision for the rocket.
 * - The rocket notifies observers and interacts with the game world as an Enemy.
 */

import { Mesh, Scene, StaticSound, ParticleSystem, Texture, Vector3, Color4, PhysicsAggregate, PhysicsShapeType, MeshBuilder, StandardMaterial, Color3 } from "@babylonjs/core";
import { Enemy, GameObjectVisitor, CollisionGroup, GameObjectObserver, GameObjectFactory, GameObjectConfig, Utils, EditorObject } from "../types";
import { ObjectEditorImpl } from "./EditorObject";

/**
 * RocketObject represents a rocket enemy in the game.
 * - Handles mesh, physics, sound, and explosion effects.
 * - Implements the Enemy interface.
 */
export class RocketObject implements Enemy {
    static readonly Type: string = "rocket";
    private static nextId: number = 0;
    private id: string;

    protected mesh: Mesh;
    protected scene: Scene;
    private damage: number = 5;
    public explosionRadius: number = 10;

    private sounds: Map<string, StaticSound> = new Map();

    /**
     * Constructs a new RocketObject.
     * @param mesh The rocket's mesh.
     * @param scene The Babylon.js scene.
     */
    constructor(mesh: Mesh, scene: Scene) {
        this.mesh = mesh;
        this.scene = scene;
        this.id = `${RocketObject.Type}_${RocketObject.nextId++}`;
    }

    /**
     * Adds a sound effect to the rocket.
     * @param name The sound name.
     * @param sound The StaticSound instance.
     */
    public addSound(name: string, sound: StaticSound): void {
        this.sounds.set(name, sound);
    }

    /**
     * Plays a sound effect by name.
     * @param name The sound name.
     */
    public playSound(name: string): void {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.play();
        } else {
            console.warn(`Sound ${name} not found for rocket.`);
        }
    }

    /**
     * Stops a sound effect by name.
     * @param name The sound name.
     */
    public stopSound(name: string): void {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.stop();
        } else {
            console.warn(`Sound ${name} not found for rocket.`);
        }
    }

    /**
     * Returns the main mesh of the rocket.
     */
    public getMesh(): Mesh {
        return this.mesh;
    }

    /**
     * Returns the unique ID of the rocket.
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Returns all meshes associated with the rocket.
     */
    public getMeshes(): Mesh[] {
        return [this.mesh];
    }

    /**
     * Returns the type of the object ("rocket").
     */
    public getType(): string {
        return RocketObject.Type;
    }

    /**
     * Returns the damage value of the rocket.
     */
    public getDamage(): number {
        return this.damage;
    }

    /**
     * Accepts a visitor (for the visitor pattern).
     * @param visitor The GameObjectVisitor.
     */
    public accept(visitor: GameObjectVisitor): void {
        visitor.visitEnemy(this);
    }

    /**
     * Handles contact events (collision), triggers explosion and returns true.
     */
    public onContact(): boolean {
        this.explode();
        return true;
    }

    /**
     * Updates the rocket (no-op by default).
     */
    public update(_: number): void { }

    /**
     * Enables collision detection for the rocket's physics body.
     */
    public enableCollision(): void {
        const physicsBody = this.mesh.physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the rocket mesh.");
            return;
        }

        physicsBody.shape.filterMembershipMask = CollisionGroup.ROCKET;
        physicsBody.shape.filterCollideMask = 0xFFFFFFFF & ~CollisionGroup.FACES;
        physicsBody.setCollisionCallbackEnabled(true);
    }

    /**
     * Triggers the rocket's explosion: plays sound, spawns particles, and disposes the mesh.
     */
    private explode(): void {
        this.stopSound("drop");
        this.playSound("explosion");

        // Create a particle system for the explosion
        const particleSystem = new ParticleSystem("explosion", 2000, this.scene);
        particleSystem.particleTexture = new Texture("textures/flare.png", this.scene);
        particleSystem.emitter = this.mesh.position.clone();
        particleSystem.minEmitBox = new Vector3(-1, -1, -1);
        particleSystem.maxEmitBox = new Vector3(1, 1, 1);
        particleSystem.color1 = new Color4(1, 0.5, 0, 1);
        particleSystem.color2 = new Color4(1, 0, 0, 1);
        particleSystem.minSize = 2;
        particleSystem.maxSize = 7;
        particleSystem.minLifeTime = 0.2;
        particleSystem.maxLifeTime = 1;
        particleSystem.emitRate = 1000;
        particleSystem.direction1 = new Vector3(-1, 1, -1);
        particleSystem.direction2 = new Vector3(1, 1, 1);
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 3;

        this.mesh.dispose(); // Dispose the rocket mesh
        particleSystem.start();

        // Stop the particle system after a short duration
        setTimeout(() => {
            particleSystem.stop();
            particleSystem.dispose();
        }, 1000);
    }

    /**
     * Handles logic when the game is paused (optional).
     */
    public onPause(): void {
        // Optionally dispose or pause physics here
    }
    
    /**
     * Handles logic when the game is resumed (optional).
     */
    public onResume(): void {}

    /**
     * Activates the rocket: adds physics and enables collision.
     */
    public activate(): void {
        new PhysicsAggregate(this.mesh, PhysicsShapeType.CYLINDER, { mass: 5, friction: 0.5, restitution: 0.2 }, this.scene);
        this.enableCollision();
    }

    /**
     * Adds an observer to the rocket (not used in this implementation).
     */
    public addObserver(_: GameObjectObserver): void {}
}

/**
 * FixedRocket is a subclass of RocketObject for rockets with fixed properties.
 */
export class FixedRocket extends RocketObject {
    public static readonly Type: string = "rocket";

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }

    public getType(): string {
        return FixedRocket.Type;
    }
}

/**
 * FixedRocketFactory creates FixedRocket instances for gameplay or the editor.
 * - Handles mesh creation, physics, sound loading, and collision setup.
 */
export class FixedRocketFactory implements GameObjectFactory {
    /**
     * Creates the mesh for the rocket.
     * @param config The configuration for the rocket.
     */
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

    /**
     * Creates a FixedRocket for gameplay, with physics and sounds.
     * @param config The configuration for the rocket.
     */
    public create(config: GameObjectConfig): RocketObject {
        const mesh = this.createMesh(config);
        new PhysicsAggregate(mesh, PhysicsShapeType.CYLINDER, { mass: 20, friction: 0.5, restitution: 0.2 }, config.scene);
        const rocket = new FixedRocket(mesh, config.scene);
        rocket.enableCollision();

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

    /**
     * Creates a FixedRocket for the editor (no physics).
     * @param config The configuration for the rocket.
     */
    public createForEditor(config: GameObjectConfig): EditorObject {
        const rocket = new FixedRocket(this.createMesh(config), config.scene);
        return new ObjectEditorImpl(rocket);
    }
}
