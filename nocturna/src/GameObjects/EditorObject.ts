import { Color3, Matrix, Mesh, StandardMaterial, Vector3 } from "@babylonjs/core";
import { CharacterInput, EditorObject, GameObject } from "../types";


/**
 * ObjectEditorImpl implements the EditorObject interface and provides editing capabilities
 * for any GameObject in the level editor.
 * 
 * Responsibilities:
 * - Allows moving, rotating, and scaling the associated GameObject using editor controls.
 * - Handles selection state, including visual feedback (scaling and emissive color).
 * - Supports serialization for saving/loading object state in the editor.
 * - Forwards contact and type queries to the underlying GameObject.
 * 
 * Usage:
 * - Instantiate with a GameObject to wrap it for editor manipulation.
 * - Use `updatePosition`, `updateRotation`, and `updateScale` to transform the object based on input.
 * - Use `setSelected` to visually indicate selection.
 * - Use `serialize` to export the object's state.
 */
export class ObjectEditorImpl implements EditorObject { 
    private object: GameObject;
    private selected: boolean = false;
    private readonly lateralspeed: number = 0.05;
    private readonly rotationspeed: number = 0.005;
    private originalEmissiveColor: Color3 | null = null; // Stores the original emissive color

    /**
     * Constructs a new ObjectEditorImpl for the given GameObject.
     * @param object The GameObject to wrap for editor manipulation.
     */
    constructor(object: GameObject) {
        this.object = object;
    }

    /**
     * Moves the object by a local movement vector, transforming to global coordinates if parented.
     * @param localMovement The movement vector in local space.
     */
    public move(localMovement: Vector3): void {
        // If a parent exists, transform the local movement to global movement
        const mesh = this.object.getMesh();
        const parentMesh = mesh.parent as Mesh;
        if (parentMesh) {
            const parentRotationMatrix = Matrix.RotationYawPitchRoll(
                mesh.rotation.y,
                mesh.rotation.x,
                mesh.rotation.z
            );

            // Apply the parent's rotation to the local movement
            const globalMovement = Vector3.TransformCoordinates(localMovement, parentRotationMatrix);

            // Add the global movement to the current position
            this.object.getMesh().position.addInPlace(globalMovement);
        } else {
            // If no parent, apply the local movement directly
            this.object.getMesh().position.addInPlace(localMovement);
        }
    }

    /**
     * Updates the object's position based on CharacterInput and delta time.
     * @param dt Delta time.
     * @param input The current input state.
     */
    public updatePosition(dt: number, input: CharacterInput): void {
        const moveSpeed = this.lateralspeed * dt;
    
        // Compute the local movement vector
        const localMovement = new Vector3(
            (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed,
            (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed,
            (input.forward ? 1 : (input.backward ? -1 : 0)) * moveSpeed
        );
    
        this.move(localMovement);
    }

    /**
     * Updates the object's rotation based on CharacterInput and delta time.
     * @param dt Delta time.
     * @param input The current input state.
     */
    public updateRotation(dt: number, input: CharacterInput): void {
        const moveSpeed = this.rotationspeed * dt;
        this.object.getMesh().rotation.y += (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed;
        this.object.getMesh().rotation.x += (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed;
        this.object.getMesh().rotation.z += (input.forward ? 1 : (input.backward ? -1 : 0)) * moveSpeed;
    }

    /**
     * Updates the object's scale based on CharacterInput and delta time.
     * @param dt Delta time.
     * @param input The current input state.
     */
    public updateScale(dt: number, input: CharacterInput): void {
        const moveSpeed = this.rotationspeed * dt;

        this.object.getMesh().scaling.x += (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed;
        this.object.getMesh().scaling.y += (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed;
        this.object.getMesh().scaling.z += (input.forward ? 1 : (input.backward ? -1 : 0)) * moveSpeed;
    }

    /**
     * Sets the selection state of the object, updating its visual appearance.
     * @param selected True if the object is selected.
     */
    public setSelected(selected: boolean): void {
        this.selected = selected;

        if (selected) {
            // Save the original color and visually highlight the object
            this.object.getMeshes().forEach((mesh) => {
                mesh.scaling.x *= 1.1;
                mesh.scaling.y *= 1.1;
                
                const material = mesh.material as StandardMaterial;
                if (!material) return;
                
                this.originalEmissiveColor = material.emissiveColor.clone();
                material.emissiveColor = Color3.Yellow(); // Highlight with yellow
            });
            
        } else {
            // Restore the original color and scale
            this.object.getMeshes().forEach((mesh) => {
                mesh.scaling.x /= 1.1;
                mesh.scaling.y /= 1.1;

                const material = mesh.material as StandardMaterial;
                if (!material) return;
                material.emissiveColor = this.originalEmissiveColor;
            });
        }
    }

    /**
     * Returns whether the object is currently selected.
     */
    public isSelected(): boolean {
        return this.selected;
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
     * Serializes the object's type, position, rotation, and scale for saving.
     */
    public serialize(): any {
        const data = {
            type: this.object.getType(),
            position: this.object.getMesh().position,
            rotation: this.object.getMesh().rotation,
            size: this.object.getMesh().scaling,
        };
        return data;
    }

    /**
     * Returns the type of the object.
     */
    public getType(): string {
        return this.object.getType();
    }

    /**
     * Forwards the contact event to the underlying GameObject.
     */
    public onContact(): boolean {
        return this.object.onContact();
    }
}