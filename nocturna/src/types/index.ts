import { Mesh, Vector3, Scene, AssetsManager, MeshAssetTask, Matrix, TransformNode, Quaternion } from "@babylonjs/core";
import { VictoryCondition } from "../GameObjects/Victory";
import { ParentNode } from "../ParentNode";
import { Coin } from "../GameObjects/Coin";

export interface CharacterInput {
    backward: boolean;
    forward: boolean;
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jump: boolean;

}

export enum CollisionGroup {
    FACES = 0x0002,
    ROCKET = 0x0004,
}

export interface GameObject {
    getType(): string;
    getMesh(): Mesh;
    getMeshes(): Mesh[];
    accept(visitor: GameObjectVisitor): void;
    update(dt: number, input: CharacterInput): void;
    getId(): string;
    onPause(): void;
    onResume(): void;
    onContact(): boolean;
}

export interface Enemy extends GameObject {
    getDamage(): number;
}

export interface GameObjectVisitor {
    visitCoin(coin: Coin): void;
    visitEnemy(enemy: Enemy): void;
    visitVictory(portal: VictoryCondition): void;
}

export interface GameObjectConfig {
    size?: Vector3;
    position: Vector3;
    translation?: Vector3;
    rotation: Vector3;
    parent?: ParentNode;
    scene: Scene;
    assetsManager?: AssetsManager;
}

export interface GameObjectFactory {
    /**
     * Méthode abstraite pour créer une plateforme.
     * Les sous-classes concrètes implémenteront cette méthode.
     */
    create(GameObjectConfig): GameObject;
    createForEditor(GameObjectConfig): EditorObject;
}

export interface AbstractState {
    enter(): void;
    exit(): void;
    name(): string;
    update(dt: number, input : CharacterInput): AbstractState | null;
}

export interface EditorObject {
    move(movement: Vector3): void;
    updatePosition(dt: number, input: CharacterInput): void;
    updateRotation(dt: number, input: CharacterInput): void;
    updateScale(dt: number, input: CharacterInput): void;
    setSelected(selected: boolean): void;
    isSelected(): boolean;
    getMesh(): Mesh;
    getType(): string;
    getMeshes(): Mesh[];
    serialize(): any;
}

export interface IRemoteGameObject extends GameObject {
    getOwnerId(): string;
    updatePosition(position: Vector3, timestamp: number): void;
}

export class Utils {
    static getMeshBoxSize(mesh: Mesh): Vector3 {
        const boundingInfo = mesh.getBoundingInfo();
        const boundingBox = boundingInfo.boundingBox;
        return boundingBox.maximum.subtract(boundingBox.minimum);
    }
    
    static getMeshSphereSize(mesh: Mesh): { center: Vector3; radius: number } {
        const boundingInfo = mesh.getBoundingInfo();
        const boundingSphere = boundingInfo.boundingSphere;
        return {
            center: boundingSphere.centerWorld.clone(), // Centre de la bounding sphere
            radius: boundingSphere.radiusWorld          // Rayon de la bounding sphere
        };
    }

    static getTotalBoundingBox(meshes: Mesh[]): { minimum: Vector3; maximum: Vector3 } {
        if (meshes.length === 0) {
            throw new Error("No meshes provided to calculate bounding box.");
        }

        let totalMin = meshes[0].getBoundingInfo().boundingBox.minimumWorld.clone();
        let totalMax = meshes[0].getBoundingInfo().boundingBox.maximumWorld.clone();

        meshes.forEach((mesh) => {
            const boundingBox = mesh.getBoundingInfo().boundingBox;
            totalMin = Vector3.Minimize(totalMin, boundingBox.minimumWorld);
            totalMax = Vector3.Maximize(totalMax, boundingBox.maximumWorld);
        });

        return { minimum: totalMin, maximum: totalMax };
    }

    static getTotalBoundingSphere(meshes: Mesh[]): { center: Vector3; radius: number } {
        if (meshes.length === 0) {
            throw new Error("No meshes provided to calculate bounding sphere.");
        }

        const { minimum, maximum } = this.getTotalBoundingBox(meshes);
        const center = minimum.add(maximum).scale(0.5); // Centre de la bounding box
        let maxRadius = 0;

        meshes.forEach((mesh) => {
            const boundingSphere = mesh.getBoundingInfo().boundingSphere;
            const distanceToCenter = Vector3.Distance(center, boundingSphere.centerWorld);
            const radius = distanceToCenter + boundingSphere.radiusWorld;
            maxRadius = Math.max(maxRadius, radius);
        });

        return { center, radius: maxRadius };
    }

    static createMeshTask(config: GameObjectConfig, name: string, file: string, callback: (task: any) => void): MeshAssetTask {
        const task = config.assetsManager.addMeshTask(name, "", "models/", file);
        task.onSuccess = (task) => {
            console.log(`Loaded ${name} successfully`);
            callback(task);
        }
        task.onError = (_, message) => {
            console.error(`Failed to load ${name}: ${message}`);
        };

        return task;
    }

    static configureMesh(meshes: Mesh[], config: GameObjectConfig): void {
        const mesh = meshes[0];
        mesh.position = config.position;
        // mesh.setAbsolutePosition(config.position);
        mesh.rotation = config.rotation;
        mesh.scaling = config.size;
        mesh.setBoundingInfo(meshes[1].getBoundingInfo());
        mesh.refreshBoundingInfo();
    }

    static calculatePositionRelativeToParent(parent: ParentNode, position: Vector3): Vector3 {
        // Créer une matrice de rotation à partir de la rotation du parent
        const parentRotation = parent.getRotation();
        const parentRotationMatrix = Matrix.RotationYawPitchRoll(
            parentRotation.y,
            parentRotation.x,
            parentRotation.z
        );
    
        // Inverser la matrice de rotation du parent
        const inverseParentRotationMatrix = Matrix.Invert(parentRotationMatrix);
    
        // Appliquer la rotation inversée à la position locale
        const transformedPosition = Vector3.TransformCoordinates(position, inverseParentRotationMatrix);
    
        // Ajouter la position du parent pour obtenir la position globale
        return transformedPosition;
    }

    static calculateRotationRelativeToParent(parent: ParentNode, rotation: Vector3): Vector3 {
        // Matrice de rotation du parent
        const parentRot = parent.getRotation();
        const parentMatrix = Matrix.RotationYawPitchRoll(parentRot.y, parentRot.x, parentRot.z);

        // Matrice de rotation de l'enfant
        const childMatrix = Matrix.RotationYawPitchRoll(rotation.y, rotation.x, rotation.z);

        // Rotation relative = inverse(parent) * child
        const relativeMatrix = parentMatrix.invert().multiply(childMatrix);

        // Extraire les angles Euler de la matrice résultante
        const quat = Quaternion.FromRotationMatrix(relativeMatrix);
        const relativeRotation = quat.toEulerAngles();

        return relativeRotation;
    }

    static createVec3FromData(data: any): Vector3 {
        if(data === undefined || data === null) {
            return undefined;
        }

        return new Vector3(data._x, data._y, data._z);
    }
}

export interface EndConditionObserver {
    onRetry();
    onQuit();
}