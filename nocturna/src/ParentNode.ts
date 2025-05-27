import { Scene, Vector3, TransformNode, Animation, Mesh, CreateSoundAsync, StaticSound } from "@babylonjs/core";

import { CharacterInput } from "./types";
import { InputHandler } from "./InputHandler";

export interface ParentNodeObserver {
    onRotationChange: () => void;
    // onRotationStart: () => void;
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
ß
    constructor(position: Vector3, scene: Scene) {
        this.scene = scene;

        this.node = new TransformNode("parent", this.scene);
        this.node.position = position;

        this.createSound();
    }

    async createSound() {
        this.sound = await CreateSoundAsync("rotate_sound", "/assets/sounds/rotation.ogg");
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

    public getRotation(): Vector3 {
        return this.node.rotation;
    }

    private notifyObservers() {
        this.observers.forEach(observer => {
            observer.onRotationChange();
        });
    }

    private animateRotation(axis: "x" | "y" | "z", angle: number, duration: number = 500) {
        console.log(`Animating rotation around ${axis} by ${angle} radians over ${duration} ms`);
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

    public rotate(axis: "x" | "y" | "z", inverted: boolean = false) {
        this.animateRotation(axis, inverted ? -this.rotationConstants[axis] : this.rotationConstants[axis]);
        this.sound.play(); // Play sound on rotation
    }

    public setupKeyActions(inputHandler: InputHandler) {
        inputHandler.addAction("rotate_left_x", () => this.rotate("x"));
        inputHandler.addAction("rotate_right_x", () => this.rotate("x", true));
        inputHandler.addAction("rotate_left_y", () => this.rotate("y"));
        inputHandler.addAction("rotate_right_y", () => this.rotate("y", true));
        inputHandler.addAction("rotate_left_z", () => this.rotate("z"));
        inputHandler.addAction("rotate_right_z", () => this.rotate("z", true));
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