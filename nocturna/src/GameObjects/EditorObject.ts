import { Color3, Matrix, Mesh, StandardMaterial, Vector3 } from "@babylonjs/core";
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

    public move(localMovement: Vector3): void {
        // Si un parent existe, transformer le mouvement local en mouvement global
        const mesh = this.object.getMesh();
        const parentMesh = mesh.parent as Mesh;
        if (parentMesh) {
            const parentRotationMatrix = Matrix.RotationYawPitchRoll(
                mesh.rotation.y,
                mesh.rotation.x,
                mesh.rotation.z
            );
            
            // invert sign if object rotation is PI/2 or -PI/2 for X Y and Z
            /*if (Math.abs(parentMesh.rotation.y) === Math.PI / 2 || Math.abs(parentMesh.rotation.y) === -Math.PI / 2) {
                localMovement.x *= -1;
                localMovement.z *= -1;
            }
            if (Math.abs(parentMesh.rotation.x) === Math.PI / 2 || Math.abs(parentMesh.rotation.x) === -Math.PI / 2) {
                localMovement.y *= -1;
                localMovement.z *= -1;
            }
            if (Math.abs(parentMesh.rotation.z) === Math.PI / 2 || Math.abs(parentMesh.rotation.z) === -Math.PI / 2) {
                localMovement.x *= -1;
                localMovement.y *= -1;
            }*/

            // Appliquer la rotation du parent au mouvement local
            const globalMovement = Vector3.TransformCoordinates(localMovement, parentRotationMatrix);

            // Ajouter le mouvement global à la position actuelle
            this.object.getMesh().position.addInPlace(globalMovement);
        } else {
            // Si aucun parent, appliquer le mouvement local directement
            this.object.getMesh().position.addInPlace(localMovement);
        }
    }

    public updatePosition(dt: number, input: CharacterInput): void {
        const moveSpeed = this.lateralspeed * dt;
    
        // Calculer le mouvement local
        const localMovement = new Vector3(
            (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed,
            (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed,
            0 // Pas de mouvement en profondeur
        );
    
        this.move(localMovement);
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
            type: this.object.getType(),
            position: this.object.getMesh().position,
            rotation: this.object.getMesh().rotation,
            size: this.object.getMesh().scaling,
        };
        return data;
    }

    public getType(): string {
        return this.object.getType();
    }
}