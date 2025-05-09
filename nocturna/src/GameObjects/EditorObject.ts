import { Color3, Mesh, StandardMaterial } from "@babylonjs/core";
import { CharacterInput, EditorObject, GameObject } from "../types";


export class ObjectEditorImpl implements EditorObject { 
    private object: GameObject;
    private selected: boolean = false;
    private readonly lateralspeed: number = 0.5;
    private readonly rotationspeed: number = 0.005;
    private originalEmissiveColor: Color3 | null = null; // Stocker la couleur d'origine

    constructor(object: GameObject) {
        this.object = object;
    }

    public updatePosition(dt: number, input: CharacterInput): void {
        const moveSpeed = this.lateralspeed * dt;
        this.object.getMesh().position.x += (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed;
        this.object.getMesh().position.y += (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed;
    }

    public updateRotation(dt: number, input: CharacterInput): void {
        const moveSpeed = this.rotationspeed * dt;
        this.object.getMesh().rotation.y += (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed;
        this.object.getMesh().rotation.x += (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed;
    }

    public updateScale(_: number, input: CharacterInput): void {
        this.object.getMesh().scaling.x += (input.right ? 1 : (input.left ? -1 : 0));
        this.object.getMesh().scaling.y += (input.up ? 1 : (input.down ? -1 : 0));
    }

    public setSelected(selected: boolean): void {
        this.selected = selected;

        const material = this.object.getMesh().material as StandardMaterial;
        if (!material) return;

        if (selected) {
            // Save the original color
            this.originalEmissiveColor = material.emissiveColor.clone();
            this.object.getMesh().scaling.x *= 1.1;
            this.object.getMesh().scaling.y *= 1.1;
            material.emissiveColor = Color3.Yellow(); // Yellow
        } else {
            this.object.getMesh().scaling.x /= 1.1;
            this.object.getMesh().scaling.y /= 1.1;
            material.emissiveColor = this.originalEmissiveColor; // White
        }
    }

    public isSelected(): boolean {
        return this.selected;
    }

    public getMesh(): Mesh {
        return this.object.getMesh();
    }

    public getMeshes(): Mesh[] {
        return this.object.getMeshes();
    }

    public serialize(): any {
        const data = {
            position: this.object.getMesh().position,
            rotation: this.object.getMesh().rotation,
            size: this.object.getMesh().scaling,
        };
        return data;
    }
}