
import { GameObject, IRemoteGameObject, CharacterInput, GameObjectVisitor } from "../types";
import { Vector3, Mesh, PhysicsMassProperties, PhysicsBody, PhysicsAggregate } from "@babylonjs/core";

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
            P1.x + (P2.x - P1.x) * clampedAlpha,
            P1.y + (P2.y - P1.y) * clampedAlpha,
            P1.z + (P2.z - P1.z) * clampedAlpha
        );

        console.log("Interpolated position:", position, this.lastUpdate.position);

        return this.lastUpdate.position;
    }
}

export class RemoteGameObject implements IRemoteGameObject {
    public static readonly Type: string = "remote_game_object";
    private object: GameObject;
    private interpolator: Interpolator;
    private id: string;
    private ownerId: string;
    private timestamp: number = 0;

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
        console.log("Updated position:", this.object.getMesh().position);
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
    public accept(visitor: GameObjectVisitor): void {
        
    }
}