import { Scene, Vector3, TransformNode, Animation, Mesh, CreateSoundAsync, StaticSound } from "@babylonjs/core";

import { CharacterInput } from "./types";
import { InputHandler } from "./InputHandler";

/**
 * ParentNode represents a transform node that acts as a parent for other meshes in the scene.
 * 
 * Responsibilities:
 * - Manages a Babylon.js TransformNode to which other meshes can be parented.
 * - Handles animated rotations around the X, Y, or Z axes, with smooth transitions.
 * - Notifies registered observers when a rotation is completed.
 * - Integrates with the InputHandler to allow keyboard-based rotation controls.
 * - Plays a sound effect when a rotation occurs.
 * - Supports serialization for saving/loading its state.
 * - Manages observer registration and removal.
 * 
 * Usage:
 * - Instantiate with a position and scene.
 * - Use `addChild` to parent meshes to this node.
 * - Use `rotate` to animate rotation around an axis.
 * - Register observers to react to rotation changes.
 * - Integrate with InputHandler using `setupKeyActions`.
 * - Call `dispose` to clean up resources.
 */

/**
 * ParentNodeObserver defines the interface for objects that want to be notified
 * when the ParentNode completes a rotation.
 */
export interface ParentNodeObserver {
    onRotationChange: () => void;
}

export class ParentNode {
    public static readonly Type: string = "parent_node";
    private node: TransformNode;
    private isAnimating: boolean = false;
    private scene: Scene;
    private observers: ParentNodeObserver[] = [];
    private readonly rotationConstants: { [key: string]: number } = {
        x: Math.PI / 2,
        y: Math.PI / 2,
        z: Math.PI / 2,
    };
    private sound: StaticSound;

    /**
     * Constructs a new ParentNode.
     * @param position The initial position of the node.
     * @param scene The Babylon.js scene.
     */
    constructor(position: Vector3, scene: Scene) {
        this.scene = scene;
        this.node = new TransformNode("parent", this.scene);
        this.node.position = position;
        this.createSound();
    }

    /**
     * Asynchronously loads the rotation sound effect.
     */
    async createSound() {
        this.sound = await CreateSoundAsync("rotate_sound", "/assets/sounds/rotation.ogg");
    }

    /**
     * Parents a mesh to this node.
     * @param child The mesh to parent.
     */
    public addChild(child: Mesh) {
        child.parent = this.node;
    }

    /**
     * Registers an observer to be notified on rotation changes.
     * @param observer The observer to add.
     */
    public addObserver(observer: ParentNodeObserver) {
        this.observers.push(observer);
    }

    /**
     * Removes a previously registered observer.
     * @param observer The observer to remove.
     */
    public removeObserver(observer: ParentNodeObserver) {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    /**
     * Returns the current rotation of the node as a Vector3.
     */
    public getRotation(): Vector3 {
        return this.node.rotation;
    }

    /**
     * Notifies all registered observers that a rotation has occurred.
     */
    private notifyObservers() {
        this.observers.forEach(observer => {
            observer.onRotationChange();
        });
    }

    /**
     * Animates the rotation of the node around a given axis.
     * @param axis The axis to rotate around ("x", "y", or "z").
     * @param angle The angle in radians to rotate.
     * @param duration The duration of the animation in milliseconds (default: 500).
     */
    private animateRotation(axis: "x" | "y" | "z", angle: number, duration: number = 500) {
        console.log(`Animating rotation around ${axis} by ${angle} radians over ${duration} ms`);
        if (this.isAnimating) {
            return; // Prevent starting a new animation while one is already running
        }

        this.isAnimating = true;

        const fps = this.scene.getEngine().getFps();

        const animation = new Animation(
            `rotate_${axis}`,
            `rotation.${axis}`,
            fps,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const currentRotation = this.node.rotation[axis];
        const keys = [
            { frame: 0, value: currentRotation },
            { frame: duration / 16.67, value: currentRotation + angle }, // Convert duration to frames
        ];

        animation.setKeys(keys);
        this.node.animations = [animation];

        this.scene.beginAnimation(this.node, 0, duration / 16.67, false, 1, () => {
            this.isAnimating = false;
            this.notifyObservers();
        });
    }

    /**
     * Rotates the node around the specified axis, optionally in the inverted direction.
     * Plays a sound effect on rotation.
     * @param axis The axis to rotate ("x", "y", or "z").
     * @param inverted If true, rotates in the negative direction.
     */
    public rotate(axis: "x" | "y" | "z", inverted: boolean = false) {
        this.animateRotation(axis, inverted ? -this.rotationConstants[axis] : this.rotationConstants[axis]);
        this.sound.play();
    }

    /**
     * Sets up keyboard actions for rotating the node using the InputHandler.
     * @param inputHandler The InputHandler instance.
     */
    public setupKeyActions(inputHandler: InputHandler) {
        inputHandler.addAction("rotate_left_x", () => this.rotate("x"));
        inputHandler.addAction("rotate_right_x", () => this.rotate("x", true));
        inputHandler.addAction("rotate_left_y", () => this.rotate("y"));
        inputHandler.addAction("rotate_right_y", () => this.rotate("y", true));
        inputHandler.addAction("rotate_left_z", () => this.rotate("z"));
        inputHandler.addAction("rotate_right_z", () => this.rotate("z", true));
    }

    /**
     * Disposes the node and removes all observers.
     */
    public dispose() {
        this.node.dispose();
        this.observers.forEach(observer => this.removeObserver(observer));
    }

    /**
     * Serializes the node's position for saving or exporting.
     * @returns An object containing the node's position.
     */
    public serialize(): any {
        const data = {
            position: this.node.position,
        };
        return data;
    }
}