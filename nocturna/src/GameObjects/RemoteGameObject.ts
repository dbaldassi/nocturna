
import { GameObject, IRemoteGameObject, CharacterInput, GameObjectVisitor } from "../types";
import { Vector3, Mesh } from "@babylonjs/core";

class Interpolator {
    private previousUpdate: { position: Vector3; timestamp: number } | null = null;
    private lastUpdate: { position: Vector3; timestamp: number } | null = null;

    public updatePosition(newPosition: Vector3, timestamp: number): void {
        // Déplacer la dernière mise à jour vers "précédente"
        this.previousUpdate = this.lastUpdate;

        // Stocker la nouvelle mise à jour
        this.lastUpdate = { position: newPosition, timestamp };
    }

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

        const position = new Vector3(
            P1._x + (P2._x - P1._x) * clampedAlpha,
            P1._y + (P2._y - P1._y) * clampedAlpha,
            P1._z + (P2._z - P1._z) * clampedAlpha
        );

        return position;
    }
}

export class RemoteGameObject implements IRemoteGameObject {
    public static readonly Type: string = "remote_game_object";
    protected object: GameObject;
    protected interpolator: Interpolator;
    protected id: string;
    protected ownerId: string;
    protected timestamp: number = 0;

    constructor(object: GameObject, id: string, ownerId: string) {
        this.object = object;
        this.interpolator = new Interpolator();
        this.id = id;
        this.ownerId = ownerId;

        const physicsBody = this.object.getMesh().physicsBody;
        if (physicsBody) {
            physicsBody.dispose();
            this.object.getMesh().physicsBody = null;
        }
    }

    public getId(): string {
        return this.id;
    }
    public getOwnerId(): string {
        return this.ownerId;
    }

    public updatePosition(position: Vector3, timestamp: number): void {
        this.interpolator.updatePosition(position, timestamp);
    }

    public update(dt: number, _: CharacterInput): void {
        const interpolatedPosition = this.interpolator.getInterpolatedPosition(this.timestamp);

        this.object.getMesh().position = interpolatedPosition || this.object.getMesh().position;
        // this.object.getMesh().computeWorldMatrix(true);

        if(this.object.getMesh().physicsBody) {
            this.object.getMesh().physicsBody.setTargetTransform(this.object.getMesh().position, this.object.getMesh().rotationQuaternion);
        }

        this.timestamp += dt;
    }

    public getType(): string {
        return RemoteGameObject.Type;
    }
    public getMesh(): Mesh {
        return this.object.getMesh();
    }
    public getMeshes(): Mesh[] {
        return this.object.getMeshes();
    }
    public accept(_: GameObjectVisitor): void {
        
    }
    public onPause(): void {
    }
    public onResume(): void {
    }
}

export class RemotePlayer extends RemoteGameObject {
    public static readonly Type: string = "remote_player";

    public score: number = 0;
    public hp: number = 100;
    public inventory: string[] = [];

    constructor(object: GameObject, id: string, ownerId: string) {
        super(object, id, ownerId);
    }

    public getType(): string {
        return RemotePlayer.Type;
    }

    public isDead(): boolean {
        return this.hp <= 0;
    }

    public isAlive(): boolean {
        return this.hp > 0;
    }
}