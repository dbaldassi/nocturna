import { Mesh, Vector3, Scene, AssetsManager } from "@babylonjs/core";
import { VictoryCondition } from "../GameObjects/Victory";
import { ParentNode } from "../ParentNode";

export interface CharacterInput {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jump: boolean;
}

export interface GameObject {
    getMesh(): Mesh;
    accept(visitor: GameObjectVisitor): void;
    update(dt: number, input: CharacterInput): void;
}

export interface GameObjectVisitor {
    // visitCoin(coin: Coin): void;
    // visitEnemy(enemy: Enemy): void;
    visitVictory(portal: VictoryCondition): void;
}

export interface GameObjectConfig {
    size: Vector3;
    position: Vector3;
    rotation: Vector3;
    parent?: ParentNode;
    scene: Scene;
    assetsManager: AssetsManager;
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
    updatePosition(dt: number, input: CharacterInput): void;
    updateRotation(dt: number, input: CharacterInput): void;
    updateScale(dt: number, input: CharacterInput): void;
    setSelected(selected: boolean): void;
    isSelected(): boolean;
    getMesh(): Mesh;
    serialize(): any;
}

export function getMeshBoxSize(mesh: Mesh): Vector3 {
    const boundingInfo = mesh.getBoundingInfo();
    const boundingBox = boundingInfo.boundingBox;
    return boundingBox.maximum.subtract(boundingBox.minimum);
}

export function getMeshSphereSize(mesh: Mesh): number {
    const boundingInfo = mesh.getBoundingInfo();
    const boundingSphere = boundingInfo.boundingSphere;
    return boundingSphere.radius;
}

export interface EndConditionObserver {
    
}