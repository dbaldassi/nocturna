import { Scene, Vector3, TransformNode, Animation, Mesh } from "@babylonjs/core";

import { CharacterInput } from "./types";
import { InputHandler } from "./InputHandler";

export interface ParentNodeObserver {
    onRotationChange: () => void;
    onRotationStart: () => void;
}

export class ParentNode {
    public static readonly Type: string = "parent_node";
    private node: TransformNode;
    private isAnimating: boolean = false;
    private scene: Scene;
    private observers: ParentNodeObserver[] = [];

    constructor(position: Vector3, scene: Scene) {
        this.scene = scene;

        this.node = new TransformNode("parent", this.scene);
        this.node.position = position;
    }

    public addChild(child: Mesh) {
        child.parent = this.node;
    }

    public addObserver(observer: ParentNodeObserver) {
        this.observers.push(observer);
    }

    public removeObserver(observer: ParentNodeObserver) {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    private notifyObservers() {
        this.observers.forEach(observer => {
            observer.onRotationChange();
        });
    }

    private animateRotation(axis: "x" | "y" | "z", angle: number, duration: number = 500) {
        console.log(`Animating rotation around ${axis} by ${angle} radians over ${duration} ms`);
        this.observers.forEach(observer => {
            observer.onRotationStart();
        });
        if (this.isAnimating) {
            return; // Prevent starting a new animation while one is already running
        }

        this.isAnimating = true; // Set isAnimating to true when animation starts

        const fps = this.scene.getEngine().getFps(); // Get the current FPS

        const animation = new Animation(
            `rotate_${axis}`,
            `rotation.${axis}`,
            fps, // Frames per second
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
            this.isAnimating = false; // Set isAnimating to false when animation completes

            this.notifyObservers(); // Notify observers after animation completes
        });
    }

    public setupKeyActions(inputHandler: InputHandler) {
        inputHandler.addAction("rotate_left_x", () => this.animateRotation("x", Math.PI / 2));
        inputHandler.addAction("rotate_right_x", () => this.animateRotation("x", -Math.PI / 2));
        inputHandler.addAction("rotate_left_y", () => this.animateRotation("y", Math.PI / 2));
        inputHandler.addAction("rotate_right_y", () => this.animateRotation("y", -Math.PI / 2));
        inputHandler.addAction("rotate_left_z", () => this.animateRotation("z", Math.PI / 2));
        inputHandler.addAction("rotate_right_z", () => this.animateRotation("z", -Math.PI / 2));
    }

    public dispose() {
        this.node.dispose();
        this.observers.forEach(observer => this.removeObserver(observer));
    }

    public serialize(): any {
        const data = {
            position: this.node.position,
        };
        return data;
    }
}