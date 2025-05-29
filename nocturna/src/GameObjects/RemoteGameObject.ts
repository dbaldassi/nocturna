import { GameObject, IRemoteGameObject, CharacterInput, GameObjectVisitor, GameObjectObserver } from "../types";
import { Vector3, Mesh } from "@babylonjs/core";

/**
 * RemoteGameObject.ts defines classes for representing and synchronizing remote game objects
 * (such as other players) in a multiplayer session.
 * 
 * Responsibilities:
 * - Provides interpolation for smooth movement of remote objects based on network updates.
 * - Disables local physics for remote objects to avoid conflicts with networked positions.
 * - Exposes methods for updating position, state, and synchronizing with the main game loop.
 * - Supports extension for remote-controlled player avatars with additional properties (score, hp, inventory).
 * 
 * Usage:
 * - Instantiate `RemoteGameObject` or `RemotePlayer` with a local GameObject and network IDs.
 * - Call `updatePosition(position, timestamp)` when receiving new network data.
 * - Call `update(dt, input)` in the game loop to interpolate and update the object's position.
 * - Use `addObserver`, `getMesh`, `getMeshes`, and `onContact` as with any GameObject.
 */

/**
 * Interpolator handles position interpolation between network updates for smooth movement.
 */
class Interpolator {
    private previousUpdate: { position: Vector3; timestamp: number } | null = null;
    private lastUpdate: { position: Vector3; timestamp: number } | null = null;

    /**
     * Updates the interpolator with a new position and timestamp from the network.
     * @param newPosition The new position vector.
     * @param timestamp The timestamp of the update.
     */
    public updatePosition(newPosition: Vector3, timestamp: number): void {
        // Déplacer la dernière mise à jour vers "précédente"
        this.previousUpdate = this.lastUpdate;

        // Stocker la nouvelle mise à jour
        this.lastUpdate = { position: newPosition, timestamp };
    }

    /**
     * Returns the interpolated position for the current time.
     * @param currentTime The current timestamp.
     * @returns The interpolated Vector3 position, or the last known position if not enough data.
     */
    public getInterpolatedPosition(currentTime: number): Vector3 | null {
        if (!this.previousUpdate || !this.lastUpdate) {
            // Pas assez de données pour interpoler
            return this.lastUpdate?.position || null;
        }

        const { position: P1, timestamp: T1 } = this.previousUpdate;
        const { position: P2, timestamp: T2 } = this.lastUpdate;

        // Calculer alpha (fraction du temps écoulé)
        const alpha = (currentTime - T1) / (T2 - T1);

        // Limiter alpha entre 0 et 1
        const clampedAlpha = Math.min(Math.max(alpha, 0), 1);

        return new Vector3(
            P1._x + (P2._x - P1._x) * clampedAlpha,
            P1._y + (P2._y - P1._y) * clampedAlpha,
            P1._z + (P2._z - P1._z) * clampedAlpha
        );
    }
}

/**
 * RemoteGameObject wraps a local GameObject and synchronizes its position and state
 * based on remote/network updates. Disables local physics to avoid conflicts.
 */
export class RemoteGameObject implements IRemoteGameObject {
    public static readonly Type: string = "remote_game_object";
    protected object: GameObject;
    protected interpolator: Interpolator;
    protected id: string;
    protected ownerId: string;
    protected timestamp: number = 0;

    /**
     * Constructs a new RemoteGameObject.
     * @param object The local GameObject to wrap.
     * @param id The unique network ID for this object.
     * @param ownerId The ID of the player who owns this object.
     */
    constructor(object: GameObject, id: string, ownerId: string) {
        this.object = object;
        this.interpolator = new Interpolator();
        this.id = id;
        this.ownerId = ownerId;

        // Disable local physics for remote-controlled objects
        const physicsBody = this.object.getMesh().physicsBody;
        if (physicsBody) {
            physicsBody.dispose();
            this.object.getMesh().physicsBody = null;
        }
    }

    /**
     * Adds an observer to the underlying GameObject.
     */
    public addObserver(observer: GameObjectObserver): void {
        this.object.addObserver(observer);
    }

    /**
     * Returns the unique network ID of this object.
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Returns the owner (player) ID of this object.
     */
    public getOwnerId(): string {
        return this.ownerId;
    }

    /**
     * Updates the target position for interpolation, based on a network update.
     * @param position The new position.
     * @param timestamp The timestamp of the update.
     */
    public updatePosition(position: Vector3, timestamp: number): void {
        this.interpolator.updatePosition(position, timestamp);
    }

    /**
     * Updates the object's position using interpolation, called each frame.
     * @param dt Delta time since last update.
     * @param _ Unused CharacterInput parameter.
     */
    public update(dt: number, _: CharacterInput): void {
        const interpolatedPosition = this.interpolator.getInterpolatedPosition(this.timestamp);
        this.object.getMesh().position = interpolatedPosition || this.object.getMesh().position;

        if(this.object.getMesh().physicsBody) {
            this.object.getMesh().physicsBody.setTargetTransform(this.object.getMesh().position, this.object.getMesh().rotationQuaternion);
        }

        this.timestamp += dt;
    }

    /**
     * Returns the type of the object ("remote_game_object").
     */
    public getType(): string {
        return RemoteGameObject.Type;
    }

    /**
     * Returns the main mesh of the object.
     */
    public getMesh(): Mesh {
        return this.object.getMesh();
    }

    /**
     * Returns all meshes associated with the object.
     */
    public getMeshes(): Mesh[] {
        return this.object.getMeshes();
    }

    /**
     * Accepts a visitor (not used for remote objects).
     */
    public accept(_: GameObjectVisitor): void {}

    /**
     * Handles pause events (no-op for remote objects).
     */
    public onPause(): void {}

    /**
     * Handles resume events (no-op for remote objects).
     */
    public onResume(): void {}

    /**
     * Handles contact events by forwarding to the underlying GameObject.
     */
    public onContact(): boolean {
        return this.object.onContact();
    }
}

/**
 * RemotePlayer extends RemoteGameObject to represent a remote-controlled player.
 * Adds properties for score, HP, inventory, and subcube (for multiplayer logic).
 */
export class RemotePlayer extends RemoteGameObject {
    public static readonly Type: string = "remote_player";

    public score: number = 0;
    public hp: number = 100;
    public inventory: string[] = [];
    private subcube: number = 0;

    /**
     * Constructs a new RemotePlayer.
     * @param object The local GameObject to wrap.
     * @param id The unique network ID for this player.
     * @param ownerId The ID of the player who owns this object.
     * @param subcube The subcube index (for multiplayer logic).
     */
    constructor(object: GameObject, id: string, ownerId: string, subcube: number) {
        super(object, id, ownerId);
        this.subcube = subcube;
    }

    /**
     * Returns the subcube index for this player.
     */
    public getSubcube(): number {
        return this.subcube;
    }

    /**
     * Returns the type of the object ("remote_player").
     */
    public getType(): string {
        return RemotePlayer.Type;
    }

    /**
     * Returns true if the player is dead (hp <= 0).
     */
    public isDead(): boolean {
        return this.hp <= 0;
    }

    /**
     * Returns true if the player is alive (hp > 0).
     */
    public isAlive(): boolean {
        return this.hp > 0;
    }
}