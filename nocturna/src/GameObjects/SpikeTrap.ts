/**
 * SpikeTrap.ts defines the SpikeTrapObject enemy and its factory for creating spike traps in the game.
 * 
 * Responsibilities:
 * - Implements the SpikeTrapObject class, representing a spike trap enemy with physics and collision.
 * - Handles mesh creation, material assignment, and collision setup.
 * - Provides a SpikeTrapFactory for instantiating spike traps in the game or editor.
 * - Integrates with Babylon.js for mesh, material, and physics management.
 * 
 * Usage:
 * - Use `SpikeTrapFactory.create(config)` to create a spike trap for gameplay (with physics and collision).
 * - Use `SpikeTrapFactory.createForEditor(config)` to create a spike trap for the editor (without physics).
 * - The spike trap can be visited by a GameObjectVisitor and returns its damage value.
 * - Use `enableCollision()` to enable collision callbacks for the spike trap.
 */

import { Mesh, Scene, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";
import { Enemy, GameObjectVisitor, GameObjectObserver, GameObjectFactory, GameObjectConfig, EditorObject } from "../types";
import { ObjectEditorImpl } from "./EditorObject";

/**
 * SpikeTrapObject represents a spike trap enemy in the game.
 * - Handles mesh, physics, and collision.
 * - Implements the Enemy interface.
 */
export class SpikeTrapObject implements Enemy {
    public static readonly Type: string = "spike_trap";
    private static nextId: number = 0;
    private id: string;
    protected mesh: Mesh;
    protected scene: Scene;
    private damage: number = 1;

    /**
     * Constructs a new SpikeTrapObject.
     * @param mesh The spike trap's mesh.
     * @param scene The Babylon.js scene.
     */
    constructor(mesh: Mesh, scene: Scene) {
        this.mesh = mesh;
        this.scene = scene;
        this.id = `${SpikeTrapObject.Type}_${SpikeTrapObject.nextId++}`;
    }

    /**
     * Returns the unique ID of the spike trap.
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Returns the main mesh of the spike trap.
     */
    public getMesh(): Mesh {
        return this.mesh;
    }

    /**
     * Returns all meshes associated with the spike trap.
     */
    public getMeshes(): Mesh[] {
        return [this.mesh];
    }

    /**
     * Returns the type of the object ("spike_trap").
     */
    public getType(): string {
        return SpikeTrapObject.Type;
    }

    /**
     * Returns the damage value of the spike trap.
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
     * Handles contact events (collision). Returns false (no special logic).
     */
    public onContact(): boolean {
        return false;
    }

    /**
     * Updates the spike trap (no-op).
     */
    public update(_: number): void { }

    /**
     * Enables collision detection for the spike trap's physics body.
     */
    public enableCollision(): void {
        const physicsBody = this.mesh.physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the spike trap mesh.");
            return;
        }
        physicsBody.setCollisionCallbackEnabled(true);
    }

    /**
     * Handles logic when the game is paused (no-op).
     */
    public onPause(): void {}

    /**
     * Handles logic when the game is resumed (no-op).
     */
    public onResume(): void {}

    /**
     * Adds an observer to the spike trap (not used).
     */
    public addObserver(_: GameObjectObserver): void {
        // SpikeTrap does not support observers
    }
}

/**
 * SpikeTrapFactory creates SpikeTrapObject instances for gameplay or the editor.
 * - Handles mesh creation, material assignment, and physics setup.
 */
export class SpikeTrapFactory implements GameObjectFactory {
    /**
     * Creates the mesh for the spike trap.
     * @param config The configuration for the spike trap.
     */
    public createMesh(config: GameObjectConfig): Mesh {
        if(!config.size) {
            config.size = new Vector3(10, 0.1, 10); // Default size if not provided
        }

        const mesh = MeshBuilder.CreateBox("spikeTrap", { width: config.size.x, height: 0.1, depth: config.size.z }, config.scene);
        mesh.position = config.position;
        mesh.rotation = config.rotation;

        const material = new StandardMaterial("spikeTrapMaterial", config.scene);
        material.diffuseColor = Color3.Gray();
        mesh.material = material;

        return mesh;
    }

    /**
     * Creates a SpikeTrapObject for gameplay, with physics and collision.
     * @param config The configuration for the spike trap.
     */
    public create(config: GameObjectConfig): SpikeTrapObject {
        const mesh = this.createMesh(config);
        new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 0.5, restitution: 0.2 }, config.scene);
        const spikeTrap = new SpikeTrapObject(mesh, config.scene);
        spikeTrap.enableCollision(); // Enable collision detection
        return spikeTrap;
    }

    /**
     * Creates a SpikeTrapObject for the editor (no physics).
     * @param config The configuration for the spike trap.
     */
    public createForEditor(config: GameObjectConfig): EditorObject {
        const spikeTrap = new SpikeTrapObject(this.createMesh(config), config.scene);
        return new ObjectEditorImpl(spikeTrap);
    }
}