import { Scene, TransformNode, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Animation } from "@babylonjs/core";
import { Face } from "./Face";
import { Platform } from "./Platform";

export class Cube {
    private scene: Scene;
    private size: number;
    private faces: Face[] = [];
    private engine: any;
    private bottomFace: string;
    public mesh: any;

    private gravityForce: number = 100; // Default gravity force

    constructor(scene: Scene, size: number, engine: any) {
        this.scene = scene;
        this.size = size;
        this.engine = engine;

        // Initialize the cube mesh
        const mesh = MeshBuilder.CreateBox("cubeMesh", { size: this.size }, this.scene);
        this.mesh = mesh; 
        this.mesh.isVisible = false;

        // Initialize the cube faces
        this.createPlanes();
    }

    private createPlanes() {
        const colors = [
            new Color3(1, 0, 0), // Red
            new Color3(0, 1, 0), // Green
            new Color3(0, 0, 1), // Blue
            new Color3(1, 1, 0), // Yellow
            new Color3(1, 0.5, 0), // Orange
            new Color3(1, 0.5, 1) // White
        ];
        const positions = [
            new Vector3(0, 0, -this.size),
            new Vector3(0, 0, this.size),
            new Vector3(this.size, 0, 0),
            new Vector3(-this.size, 0, 0),
            new Vector3(0, this.size, 0),
            new Vector3(0, -this.size, 0)
        ];
        const rotations = [
            new Vector3(0, Math.PI, 0),
            new Vector3(0, 0, 0),
            new Vector3(0, Math.PI / 2, 0),
            new Vector3(0, -Math.PI / 2, 0),
            new Vector3(-Math.PI / 2, 0, 0),
            new Vector3(Math.PI / 2, 0, 0)
        ];
        const names = [
            "Front",
            "Back",
            "Right",
            "Left",
            "Top",
            "Bottom"
        ];
        for (let i = 0; i < 6; i++) {
            const face = new Face(this.scene, this.size, this.mesh, positions[i], names[i], colors[i], rotations[i]);
            this.faces.push(face);
        }

        this.bottomFace = "Bottom";

        this.initRotationAnimation();
    }

    private initRotationAnimation() {
        let isAnimating = false; // Flag to track if an animation is running

        window.addEventListener("keydown", (event) => {
            if (isAnimating) return; // Ignore key presses while an animation is running
            // if q or d animate rotation
            if (event.key == "Q" || event.key == "q") {
                isAnimating = true; // Set the flag to true
                this.animateRotation(this.mesh, "rotation.x", this.mesh.rotation.x, this.mesh.rotation.x + Math.PI / 2, 1000, () => {
                    isAnimating = false; // Reset the flag when animation completes
                });
            } else if (event.key == "D" || event.key == "d") {
                isAnimating = true; // Set the flag to true
                this.animateRotation(this.mesh, "rotation.x", this.mesh.rotation.x, this.mesh.rotation.x - Math.PI / 2, 1000, () => {
                    isAnimating = false; // Reset the flag when animation completes
                });
            }

            //get all platform meshes
            const platformMeshes = this.scene.meshes.filter(mesh => mesh.name.startsWith("platform")); 
            platformMeshes.forEach(platform => {
                platform.recreatePhysicsBody();
            })
        });
    }

    private animateRotation(target: TransformNode, property: string, from: number, to: number, duration: number, onComplete: () => void) {
        const fps = this.engine.getFps(); // Get the current FPS

        const animation = new Animation(
            "cubeRotationAnimation",
            property,
            fps, // Use the current FPS
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const keys = [
            { frame: 0, value: from },
            { frame: fps, value: to }, // Adjust frame count dynamically
        ];

        animation.setKeys(keys);

        // Attach the animation to the target
        target.animations = [];
        target.animations.push(animation);

        // Start the animation and call `onComplete` when it finishes
        this.scene.beginAnimation(target, 0, fps, false, duration / 1000, onComplete);
    }
}