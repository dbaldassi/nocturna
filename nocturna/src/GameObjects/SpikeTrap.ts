import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Mesh, Animation } from "@babylonjs/core";
import { GameObject, GameObjectConfig, GameObjectFactory, EditorObject, Utils, CharacterInput, GameObjectVisitor, Enemy } from "../types";
import { ObjectEditorImpl } from "./EditorObject";

export class SpikeTrapObject implements Enemy {
    public static readonly Type: string = "spike_trap";
    private static nextId: number = 0;
    private id: string;
    protected mesh: Mesh;
    protected scene: Scene;
    private damage: number = 1;
    private isDelayed: boolean = false;
    private delay: number = 1; // Delay before the trap can be triggered again

    constructor(mesh: Mesh, scene: Scene) {
        this.mesh = mesh;
        this.scene = scene;
        this.id = `${SpikeTrapObject.Type}_${SpikeTrapObject.nextId++}`;
    }

    public getId(): string {
        return this.id;
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    public getMeshes(): Mesh[] {
        return [this.mesh];
    }

    public getType(): string {
        return SpikeTrapObject.Type;
    }

    public getDamage(): number {
        return this.damage;
    }

    public accept(visitor: GameObjectVisitor): void {
        if (this.isDelayed) return; 
        visitor.visitEnemy(this);
        this.isDelayed = true;
        setTimeout(() => {
            this.isDelayed = false;
        }, this.delay * 1000); 
    }

    public update(_: number): void { }

    public enableCollision(): void {
        const physicsBody = this.mesh.physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the spike trap mesh.");
            return;
        }

        physicsBody.setCollisionCallbackEnabled(true);
    }

}

export class SpikeTrapFactory implements GameObjectFactory {
    public createMesh(config: GameObjectConfig): Mesh {
        const mesh = MeshBuilder.CreateBox("spikeTrap", { width: config.size.x, height: 0.1, depth: config.size.z }, config.scene);
        mesh.position = config.position;
        mesh.rotation = config.rotation;

        console.log("Creating SpikeTrap mesh with position:", config.position, "and size:", config.size);

        const material = new StandardMaterial("spikeTrapMaterial", config.scene);
        material.diffuseColor = Color3.Gray();
        mesh.material = material;

        return mesh;
    }

    public create(config: GameObjectConfig): SpikeTrapObject {
        const mesh = this.createMesh(config);
        new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 0.5, restitution: 0.2 }, config.scene);
        const spikeTrap = new SpikeTrapObject(mesh, config.scene);
        spikeTrap.enableCollision(); // Enable collision detection
        return spikeTrap;
    }

    public createForEditor(config: GameObjectConfig): EditorObject {
        const spikeTrap = new SpikeTrapObject(this.createMesh(config), config.scene);
        return new ObjectEditorImpl(spikeTrap);
    }
}