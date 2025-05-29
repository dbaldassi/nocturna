import { Scene, Vector3, PhysicsAggregate, PhysicsShapeType, Mesh, Ray, StaticSound } from "@babylonjs/core";
import { CharacterInput, EditorObject, Utils, GameObject, GameObjectConfig, GameObjectFactory, AbstractState, GameObjectObserver } from "../types";
import { IdleState, KnockbackState, PlayerDamageableState, PlayerDamageState } from "../states/PlayerStates";
import { ObjectEditorImpl } from "./EditorObject";
import { App } from "../app";

// ========================= PLAYER =========================
// This section contains the Player class, which represents the
// player character in the game. It includes methods for movement,
// jumping, and handling game states. The Player class implements
// the GameObject interface, allowing it to be used in the game
// context. 
// ==========================================================

/**
 * Player represents the main controllable character in the game.
 * 
 * Responsibilities:
 * - Handles player movement, jumping, and physics interactions.
 * - Manages player state (idle, knockback, damageable, etc.) using a state machine.
 * - Supports taking damage, death, and respawn logic.
 * - Integrates with Babylon.js for mesh, physics, and sound management.
 * - Provides methods for updating, pausing, resuming, and interacting with the game world.
 * - Implements the GameObject interface for compatibility with the game engine.
 * 
 * Usage:
 * - Instantiated by the PlayerFactory, which loads the mesh, applies physics, and loads sounds.
 * - Use `move(dt, input)` to move the player based on input.
 * - Use `jump()` to make the player jump.
 * - Use `takeDamage(damage)` to apply damage and trigger state changes.
 * - Use `update(dt, input)` in the game loop to update player state.
 * - Use `isAlive()` and `kill()` to manage player life state.
 * - Use `addSound(name, sound)` and `playSound(name)` for sound effects.
 * - Use `getMesh()` and `getMeshes()` to access the player's mesh(es).
 * - Use `onPause()` and `onResume()` to handle game pause/resume.
 */
export class Player implements GameObject {
    public static readonly Type: string = "player";
    private static nextId: number = 0;

    public mesh: Mesh[] = [];
    private scene: Scene;
    private speed: number = 5.0;
    private jumpForce: Vector3 = undefined;
    private state: AbstractState = null;
    private damageState: PlayerDamageState = null;
    private hp: number = 10;
    private id: string;
    private sounds: Map<string, StaticSound> = new Map();
    private maxHp: number = 10;

    /**
     * Constructs a new Player.
     * @param mesh The player's mesh (can be null, will be loaded by the factory).
     * @param scene The Babylon.js scene.
     */
    constructor(mesh: Mesh, scene: Scene) {
        this.scene = scene;
        this.jumpForce = new Vector3(0, 100000, 0); // Initial jump force
        this.hp = this.maxHp;
        if (mesh) this.mesh.push(mesh);
        this.state = new IdleState(this);
        this.damageState = new PlayerDamageableState(this);

        this.id = `${Player.Type}_${Player.nextId++}`;
    }

    /**
     * Adds an observer to the player (not used in this implementation).
     */
    addObserver(_: GameObjectObserver): void {}

    /**
     * Returns the unique ID of the player.
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Sets the unique ID of the player.
     * @param id The new ID.
     */
    public setId(id: string): void {
        this.id = id;
    }

    /**
     * Adds a sound effect to the player.
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
            console.warn(`Sound ${name} not found for player.`);
        }
    }

    /**
     * Makes the player jump by applying an upward impulse.
     */
    public jump() {
        const physicsBody = this.getMesh().physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the player mesh.");
            return;
        }
        physicsBody.applyImpulse(this.jumpForce, this.getMesh().getAbsolutePosition());
    }

    /**
     * Checks if the player is currently on the ground.
     * @returns True if grounded, false otherwise.
     */
    public isGrounded(): boolean {
        const bounding = Utils.getTotalBoundingSphere(this.mesh);
        const rayLength = bounding.radius;
        const rayOrigin = new Vector3(bounding.center.x, bounding.center.y, bounding.center.z);
        const rayDirection = Vector3.Down();
        const ray = new Ray(rayOrigin, rayDirection, rayLength);
        const result = this.scene.pickWithRay(ray, (mesh) => !this.mesh.includes(mesh as Mesh) && mesh.name === "platform");
        return result?.hit;
    }

    /**
     * Moves the player using physics based on input and delta time.
     * @param dt Delta time.
     * @param input The current input state.
     */
    public move(dt: number, input: CharacterInput) {
        const physicsBody = this.getMesh().physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the player mesh.");
            return;
        }
        const right = Vector3.Right().scale(input.right ? 1 : 0);
        const left = Vector3.Left().scale(input.left ? 1 : 0);
        const horizontalMovement = right.add(left);
        const velocity = horizontalMovement.scale(this.speed * dt);
        const currentVelocity = physicsBody.getLinearVelocity();
        velocity.y = currentVelocity.y;
        physicsBody.setLinearVelocity(velocity);
    }

    /**
     * Updates the player's state machine and damage state.
     * @param dt Delta time.
     * @param input The current input state.
     */
    public update(dt: number, input: CharacterInput) {
        const newState = this.state.update(dt, input);
        if (newState) {
            this.state.exit();
            this.state = newState;
            this.state.enter();
        }
        const damageState = this.damageState.update(dt, input);
        if (damageState) {
            this.damageState.exit();
            this.damageState = damageState as PlayerDamageState;
            this.damageState.enter();
        }
    }

    /**
     * Returns the type of the object ("player").
     */
    public getType(): string {
        return Player.Type;
    }

    /**
     * Returns the Babylon.js scene.
     */
    public getScene(): Scene {
        return this.scene;
    }

    /**
     * Returns the main mesh of the player.
     */
    public getMesh(): Mesh {
        return this.mesh[0];
    }

    /**
     * Returns all meshes associated with the player.
     */
    public getMeshes(): Mesh[] {
        return this.mesh;
    }

    /**
     * Removes the physics body from the player.
     */
    public removePhysics() {
        this.getMesh().physicsBody.dispose();
        this.getMesh().physicsBody = null;
    }

    /**
     * Accepts a visitor (not used in this implementation).
     */
    public accept(_: any): void { }

    /**
     * Returns the maximum HP of the player.
     */
    public getMaxHp(): number {
        return this.maxHp;
    }

    /**
     * Returns the current HP of the player.
     */
    public getHp(): number {
        return this.hp;
    }

    /**
     * Applies a knockback impulse to the player, usually after taking damage.
     */
    public dashBack() {
        const mesh = this.getMesh();
        const physicsBody = mesh.physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the player mesh.");
            return;
        }
        const currentVelocity = physicsBody.getLinearVelocity();
        let backward: Vector3;
        if (currentVelocity.length() > 0.01) {
            backward = currentVelocity.scale(-1).normalize();
        } else {
            backward = mesh.forward.scale(-1);
        }
        const impulseStrength = 10000;
        const impulse = backward.scale(impulseStrength);
        physicsBody.applyImpulse(impulse, mesh.getAbsolutePosition());
    }

    /**
     * Applies damage to the player, triggers knockback and state change.
     * @param damage The amount of damage to apply.
     */
    public doTakeDamage(damage: number): void {
        this.hp -= damage;
        if (this.hp <= 0) {
            this.kill();
            return;
        }
        this.playSound("hit");
        this.state.exit();
        this.state = new KnockbackState(this);
        this.state.enter();
        this.dashBack();
    }

    /**
     * Handles taking damage using the player's damage state.
     * @param damage The amount of damage to apply.
     */
    public takeDamage(damage: number): void {
        this.damageState.takeDamage(damage);
    }

    /**
     * Returns whether the player is alive.
     */
    public isAlive(): boolean {
        return this.hp > 0;
    }

    /**
     * Kills the player, sets HP to 0, and plays the death sound.
     */
    public kill(): void {
        this.playSound("death");
        this.hp = 0;
    }

    /**
     * Handles logic when the game is paused.
     */
    public onPause(): void {
        // Optionally disable physics or animations here
    }

    /**
     * Handles logic when the game is resumed.
     */
    public onResume(): void {
        // Optionally re-enable physics or animations here
        this.state = new IdleState(this);
        this.state.update(0, {
            left: false, right: false, jump: true,
            backward: false,
            forward: false,
            up: false,
            down: false
        });
    }

    /**
     * Handles contact events (not used for player).
     * @returns Always false.
     */
    public onContact(): boolean {
        return false;
    }
}

// ========================= FACTORY =========================
// This section contains the PlayerFactory class, which is responsible
// for creating player objects in the game. It includes methods to
// create the player mesh and apply physics properties. The factory
// also provides a method to create player objects for the editor.
// ==========================================================

export class PlayerFactory implements GameObjectFactory {
    private createImpl(config: GameObjectConfig, physics: boolean): Player {
        const player = new Player(null, config.scene);
        if (!config.size) {
            config.size = new Vector3(10, 10, 10);
        }

        const path = App.selectedGraphics + "/" + Player.Type + ".glb";

        Utils.createMeshTask(config, "player", path, (task) => {
            const meshes = task.loadedMeshes;

            Utils.configureMesh(meshes, config);

            if (physics) {
                const aggregate = new PhysicsAggregate(meshes[0], PhysicsShapeType.SPHERE, { mass: 70, friction: 10, restitution: 0 }, config.scene);
                aggregate.body.setMassProperties({ mass: 70, inertia: new Vector3(0, 0, 1) });
            }

            meshes[0].name = "player";
            meshes.forEach((mesh) => { player.mesh.push(mesh); });
        });

        const sounds = [
            { name: "jump", path: "/assets/sounds/sfx_jump.flac" },
            { name: "land", path: "/assets/sounds/jumpland.wav" },
            { name: "death", path: "/assets/sounds/death.wav" },
            { name: "move", path: "/assets/sounds/footstep_wood_001.ogg", volume: 0.5 },
            { name: "hit", path: "/assets/sounds/playerhit.mp3" },
        ];

        // load sounds
        sounds.forEach(({ name, path, volume }) => {
            Utils.loadSound(config.assetsManager, name, path, (sound) => {
                if (volume) sound.volume = volume;
                player.addSound(name, sound);
            });
        });

        return player;
    }

    public create(config: GameObjectConfig): Player {
        const player = this.createImpl(config, true);
        return player;
    }

    public createForEditor(config: GameObjectConfig): EditorObject {
        const player = this.createImpl(config, false);
        const editor = new ObjectEditorImpl(player);
        return editor;
    }
}

