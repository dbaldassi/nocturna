import { Color3, Matrix, Mesh, StandardMaterial, Vector3 } from "@babylonjs/core";
import { CharacterInput, EditorObject, GameObject } from "../types";


export class ObjectEditorImpl implements EditorObject { 
    private object: GameObject;
    private selected: boolean = false;
    private readonly lateralspeed: number = 0.05;
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
            (input.forward ? 1 : (input.backward ? -1 : 0)) * moveSpeed
        );
    
        this.move(localMovement);
    }

    public updateRotation(dt: number, input: CharacterInput): void {
        const moveSpeed = this.rotationspeed * dt;
        this.object.getMesh().rotation.y += (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed;
        this.object.getMesh().rotation.x += (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed;
        this.object.getMesh().rotation.z += (input.forward ? 1 : (input.backward ? -1 : 0)) * moveSpeed;
    }

    public updateScale(dt: number, input: CharacterInput): void {
        const moveSpeed = this.rotationspeed * dt;

        this.object.getMesh().scaling.x += (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed;
        this.object.getMesh().scaling.y += (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed;
        this.object.getMesh().scaling.z += (input.forward ? 1 : (input.backward ? -1 : 0)) * moveSpeed;
    }

    public setSelected(selected: boolean): void {
        this.selected = selected;

        // const material = this.object.getMesh().material as StandardMaterial;
        // if (!material) return;

        if (selected) {
            // Save the original color
            this.object.getMeshes().forEach((mesh) => {
                mesh.scaling.x *= 1.1;
                mesh.scaling.y *= 1.1;
                
                const material = mesh.material as StandardMaterial;
                if (!material) return;
                
                this.originalEmissiveColor = material.emissiveColor.clone();
                material.emissiveColor = Color3.Yellow(); // Yellow
            });
            
        } else {
            this.object.getMeshes().forEach((mesh) => {
                mesh.scaling.x /= 1.1;
                mesh.scaling.y /= 1.1;

                const material = mesh.material as StandardMaterial;
                if (!material) return;
                material.emissiveColor = this.originalEmissiveColor; // Yellow
            });
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
    public onContact(): boolean {
        return this.object.onContact();
    }
}