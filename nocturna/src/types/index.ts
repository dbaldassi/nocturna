import { Mesh, Vector3, Scene, AssetsManager, MeshAssetTask, Matrix, TransformNode, Quaternion, Sound, CreateSoundAsync, StaticSound } from "@babylonjs/core";
import { VictoryCondition } from "../GameObjects/Victory";
import { ParentNode } from "../ParentNode";
import { Coin } from "../GameObjects/Coin";

/**
 * CharacterInput represents the current input state for character movement and actions.
 */
export interface CharacterInput {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jump: boolean;
    forward: boolean;
    backward: boolean;
}

/**
 * CollisionGroup defines bitmasks for collision filtering.
 */
export enum CollisionGroup {
    FACES = 0x0002,
    ROCKET = 0x0004,
}

/**
 * GameObject is the base interface for all interactive objects in the game.
 * Provides methods for type, mesh access, visitor pattern, updates, and event handling.
 */
export interface GameObject {
    getType(): string;
    getMesh(): Mesh;
    getMeshes(): Mesh[];
    accept(visitor: GameObjectVisitor): void;
    update(dt: number, input: CharacterInput): void;
    getId(): string;
    onContact(): boolean;
    onPause(): void;
    onResume(): void;
    addObserver(observer: GameObjectObserver): void;
}

/**
 * GameObjectObserver is notified when a new GameObject is spawned.
 */
export interface GameObjectObserver {
    onSpawnObject(gameObject: GameObject): void;
}

/**
 * Enemy extends GameObject with a method to get its damage value.
 */
export interface Enemy extends GameObject {
    getDamage(): number;
}

/**
 * GameObjectVisitor implements the visitor pattern for game objects.
 * Provides visit methods for each object type.
 */
export interface GameObjectVisitor {
    visitCoin(coin: Coin): void;
    visitEnemy(enemy: Enemy): void;
    visitVictory(portal: VictoryCondition): void;
}

/**
 * GameObjectConfig defines the configuration for creating a GameObject.
 */
export interface GameObjectConfig {
    size?: Vector3;
    position: Vector3;
    translation?: Vector3;
    rotation: Vector3;
    parent?: ParentNode;
    scene: Scene;
    assetsManager?: AssetsManager;
}

/**
 * GameObjectFactory is the interface for factories that create game objects.
 */
export interface GameObjectFactory {
    /**
     * Abstract method to create a game object.
     * Concrete subclasses must implement this method.
     */
    create(GameObjectConfig): GameObject;
    createForEditor(GameObjectConfig): EditorObject;
}

/**
 * AbstractState defines the interface for state machine states.
 */
export interface AbstractState {
    enter(): void;
    exit(): void;
    name(): string;
    update(dt: number, input : CharacterInput): AbstractState | null;
}

/**
 * EditorObject is the interface for objects that can be manipulated in the level editor.
 */
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

/**
 * IRemoteGameObject extends GameObject for networked multiplayer, adding owner and position sync.
 */
export interface IRemoteGameObject extends GameObject {
    getOwnerId(): string;
    updatePosition(position: Vector3, timestamp: number): void;
}

/**
 * Utils provides static utility functions for mesh, vector, and asset operations.
 */
export class Utils {
    /**
     * Returns the size of a mesh's bounding box.
     */
    static getMeshBoxSize(mesh: Mesh): Vector3 {
        const boundingInfo = mesh.getBoundingInfo();
        const boundingBox = boundingInfo.boundingBox;
        return boundingBox.maximum.subtract(boundingBox.minimum);
    }
    
    /**
     * Returns the center and radius of a mesh's bounding sphere.
     */
    static getMeshSphereSize(mesh: Mesh): { center: Vector3; radius: number } {
        const boundingInfo = mesh.getBoundingInfo();
        const boundingSphere = boundingInfo.boundingSphere;
        return {
            center: boundingSphere.centerWorld.clone(),
            radius: boundingSphere.radiusWorld
        };
    }

    /**
     * Calculates the total bounding box for an array of meshes.
     */
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

    /**
     * Calculates the total bounding sphere for an array of meshes.
     */
    static getTotalBoundingSphere(meshes: Mesh[]): { center: Vector3; radius: number } {
        if (meshes.length === 0) {
            throw new Error("No meshes provided to calculate bounding sphere.");
        }

        const { minimum, maximum } = this.getTotalBoundingBox(meshes);
        const center = minimum.add(maximum).scale(0.5);
        let maxRadius = 0;

        meshes.forEach((mesh) => {
            const boundingSphere = mesh.getBoundingInfo().boundingSphere;
            const distanceToCenter = Vector3.Distance(center, boundingSphere.centerWorld);
            const radius = distanceToCenter + boundingSphere.radiusWorld;
            maxRadius = Math.max(maxRadius, radius);
        });

        return { center, radius: maxRadius };
    }

    /**
     * Creates a mesh loading task for the assets manager.
     * @param config The game object configuration.
     * @param name The mesh name.
     * @param file The mesh file.
     * @param callback Callback when the mesh is loaded.
     */
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

    /**
     * Loads a sound file using the assets manager.
     * @param assetsManager The assets manager.
     * @param name The sound name.
     * @param file The sound file path.
     * @param callback Callback when the sound is loaded.
     * @param spatial Whether the sound is spatialized.
     */
    static loadSound(assetsManager: AssetsManager, name: string, file: string, callback: (sound: StaticSound) => void, spatial?: boolean): void {
        const soundTask = assetsManager.addBinaryFileTask(name, file);
        soundTask.onSuccess = async (task) => {
            console.log(`Loaded sound ${name} successfully`);
            const sound = await CreateSoundAsync(name, task.data, {spatialEnabled: spatial || false, loop: false, autoplay: false});
            sound.volume = 1; // Set volume to 100%
            callback(sound);
        };
        soundTask.onError = (_, message) => {
            console.error(`Failed to load sound ${name}: ${message}`);
        };
    }

    /**
     * Configures the mesh's position, rotation, scale, and bounding info based on the config.
     * @param meshes The array of meshes to configure.
     * @param config The configuration object.
     */
    static configureMesh(meshes: Mesh[], config: GameObjectConfig): void {
        const mesh = meshes[0];
        mesh.position = config.position;
        // mesh.setAbsolutePosition(config.position);
        mesh.rotation = config.rotation;
        mesh.scaling = config.size;
        mesh.setBoundingInfo(meshes[1].getBoundingInfo());
        mesh.refreshBoundingInfo();
    }

    /**
     * Calculates the position of a child relative to its parent node's rotation.
     * @param parent The parent node.
     * @param position The local position.
     * @returns The transformed global position.
     */
    static calculatePositionRelativeToParent(parent: ParentNode, position: Vector3): Vector3 {
        // Create a rotation matrix from the parent's rotation
        const parentRotation = parent.getRotation();
        const parentRotationMatrix = Matrix.RotationYawPitchRoll(
            parentRotation.y,
            parentRotation.x,
            parentRotation.z
        );
    
        // Invert the parent's rotation matrix
        const inverseParentRotationMatrix = Matrix.Invert(parentRotationMatrix);
    
        // Apply the inverse rotation to the local position
        const transformedPosition = Vector3.TransformCoordinates(position, inverseParentRotationMatrix);
    
        // Add the parent's position to get the global position
        return transformedPosition;
    }

    /**
     * Calculates the rotation of a child relative to its parent node's rotation.
     * @param parent The parent node.
     * @param rotation The child's rotation.
     * @returns The relative rotation as Euler angles.
     */
    static calculateRotationRelativeToParent(parent: ParentNode, rotation: Vector3): Vector3 {
        // Parent rotation matrix
        const parentRot = parent.getRotation();
        const parentMatrix = Matrix.RotationYawPitchRoll(parentRot.y, parentRot.x, parentRot.z);

        // Child rotation matrix
        const childMatrix = Matrix.RotationYawPitchRoll(rotation.y, rotation.x, rotation.z);

        // Relative rotation = inverse(parent) * child
        const relativeMatrix = parentMatrix.invert().multiply(childMatrix);

        // Extract Euler angles from the resulting matrix
        const quat = Quaternion.FromRotationMatrix(relativeMatrix);
        const relativeRotation = quat.toEulerAngles();

        return relativeRotation;
    }

    /**
     * Creates a Vector3 from a plain object with _x, _y, _z properties.
     * @param data The data object.
     * @returns The created Vector3 or undefined if data is invalid.
     */
    static createVec3FromData(data: any): Vector3 {
        if(data === undefined || data === null) {
            return undefined;
        }

        return new Vector3(data._x, data._y, data._z);
    }
}