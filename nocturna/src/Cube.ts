import { Scene, Vector3, MeshBuilder, Color3, PhysicsAggregate, PhysicsShapeType, PhysicsBody } from "@babylonjs/core";
import { Face } from "./Face";
import { createEvilPortalMaterial, createLavaMaterial } from "./Shaders/NocturnaShaders";
import { CollisionGroup } from "./types";

/**
 * Cube represents the main cubic structure in Nocturna, serving as the central environment for gameplay.
 * 
 * Responsibilities:
 * - Creates and manages the six faces of the cube, each as a Face object.
 * - Handles physics setup for each face, including collision detection (especially for the bottom/lava face).
 * - Supports observer pattern for collision events (CubeCollisionObserver).
 * - Provides serialization for saving/loading cube state.
 * - Supports multiplayer setup by adding separators and portal effects for multi-mode.
 * - Manages cleanup and disposal of all cube resources.
 */
export class Cube {
    private scene: Scene;
    private size: number;
    private faces: Face[] = [];
    private mesh: any;
    private collisionObserver: CubeCollisionObserver | null = null;
    private lavaObserver: any;

    public static readonly Type: string = "Cube";

    /**
     * Constructs a new Cube.
     * @param scene - The Babylon.js scene.
     * @param size - The size of the cube.
     */
    constructor(scene: Scene, size: number) {
        this.scene = scene;
        this.size = size;
    }

    /**
     * Sets the collision observer for the cube.
     * @param observer - The observer to notify on bottom face collisions.
     */
    public setCollisionObserver(observer: CubeCollisionObserver): void {
        this.collisionObserver = observer;
    }

    /**
     * Returns the size of the cube.
     */
    public getSize(): number {
        return this.size;
    }

    /**
     * Static factory to create and initialize a Cube in the scene.
     * @param scene - The Babylon.js scene.
     * @param position - The position of the cube.
     * @param size - The size of the cube.
     * @returns The created Cube instance.
     */
    public static create(scene: Scene, position: Vector3 = Vector3.Zero(), size: number): Cube {
        const cube = new Cube(scene, size);

        const mesh = MeshBuilder.CreateBox("cubeMesh", { size: size }, scene);
        mesh.position = position;
        mesh.isVisible = false;
        cube.mesh = mesh; 

        cube.createPlanes();

        return cube;
    }

    /**
     * Creates the six faces of the cube, sets up their colors, physics, and special materials.
     * The bottom face uses a lava shader and notifies the collision observer on contact.
     */
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
            // Add physics to the face if the physics engine is enabled
            if (this.scene.getPhysicsEngine()) {
                const aggregate = new PhysicsAggregate(face.getMesh(), PhysicsShapeType.BOX, { mass: 0 });

                if(names[i] === "Bottom") {
                    aggregate.body.setCollisionCallbackEnabled(true);
                    // Add collision detection for the bottom face
                    aggregate.shape.filterMembershipMask = CollisionGroup.FACES;
                    aggregate.shape.filterCollideMask = 0xFFFFFFFF; // Allow all collisions
                    
                    aggregate.body.getCollisionObservable().add((collider) => {
                        if (this.collisionObserver) {
                            this.collisionObserver.onBottomCollision(collider.collidedAgainst);
                        }
                    });
                }
            }

            if(names[i] === "Bottom") {
                // Set lava shader for the bottom face
                const lavaMaterial = createLavaMaterial(this.scene);
                face.getMesh().material = lavaMaterial;
                const lavaObserver = this.scene.registerBeforeRender(() => {
                    lavaMaterial.setFloat("time", performance.now() / 1000);
                });
            }
        }
    }

    /**
     * Disposes all resources associated with the cube, including faces, meshes, materials, and observers.
     */
    public dispose() {
        this.removePhysics();

        this.faces.forEach(face => {
            if (face.getMesh().physicsBody) {
                face.getMesh().physicsBody.dispose();
                face.getMesh().physicsBody = null;
            }
            // Dispose material
            if (face.getMesh().material) {
                face.getMesh().material.dispose();
                face.getMesh().material = null;
            }
            // Dispose mesh
            face.getMesh().dispose();
        });

        if (this.mesh) {
            this.mesh.dispose();
        }

        this.scene.onBeforeRenderObservable.remove(this.lavaObserver);
        this.lavaObserver = null;

        this.faces = [];
        this.mesh = null;
        this.collisionObserver = null;
    }

    /**
     * Removes physics bodies from all cube faces.
     */
    public removePhysics() {
        this.faces.forEach(face => {
            if (face.getMesh().physicsBody) {
                face.getMesh().physicsBody.dispose();
                face.getMesh().physicsBody = null;
            }
        });
    }

    /**
     * Sets up the cube for multiplayer mode by adding separator platforms and portal effects.
     * Adds physics and materials to the separators.
     */
    public setupMulti() {
        // Find the "Front" face (actually named "Back" in this context)
        const frontFace = this.faces.find(face => face.getMesh().name === "Back");
        if (!frontFace) {
            console.error("Front face not found!");
            return;
        }

        const mesh = frontFace.getMesh();

        // Position of the "Front" face
        const frontPosition = mesh.position;

        const depth = 100;
        const sep = 10;
        // Create the horizontal separator platform
        const horizontalPlatform = MeshBuilder.CreateBox("horizontalSeparator", {
            width: this.size * 2,
            depth: depth + depth / 2,
            height: sep,
        }, this.scene);

        // Position the horizontal platform at mid-height of the face
        horizontalPlatform.position = new Vector3(
            frontPosition.x,
            frontPosition.y,
            frontPosition.z
        );

        // Create the vertical separator platform
        const verticalPlatform = MeshBuilder.CreateBox("verticalSeparator", {
            width: sep,
            depth: depth,
            height: this.size * 2,
        }, this.scene);

        // Position the vertical platform at mid-width of the face
        verticalPlatform.position = new Vector3(
            frontPosition.x,
            frontPosition.y,
            frontPosition.z - depth / 2
        );

        // Add physics to the platforms if engine is enabled
        if (this.scene.getPhysicsEngine()) {
            console.log("Adding physics to separators");
            const aggregate = new PhysicsAggregate(horizontalPlatform, PhysicsShapeType.BOX, { mass: 0 });
            new PhysicsAggregate(verticalPlatform, PhysicsShapeType.BOX, { mass: 0 });

            aggregate.body.setCollisionCallbackEnabled(true);
            aggregate.body.getCollisionObservable().add((collider) => {
                if (this.collisionObserver) {
                    this.collisionObserver.onBottomCollision(collider.collidedAgainst);
                }
            });
        }
        else {
            console.warn("Physics engine is not enabled, skipping physics setup for separators.");
        }

        const portalMat = createEvilPortalMaterial(this.scene);
        horizontalPlatform.material = portalMat;
        verticalPlatform.material = portalMat;

        this.scene.registerBeforeRender(() => {
            portalMat.setFloat("time", performance.now() / 1000);
        });

        // Optionally, these platforms could be parented to the face mesh
        // horizontalPlatform.parent = mesh;
        // verticalPlatform.parent = mesh;
    }

    /**
     * Returns the main mesh of the cube.
     */
    public getMesh(): any {
        return this.mesh;
    }

    /**
     * Returns all faces of the cube.
     */
    public getFaces(): Face[] {
        return this.faces;
    }

    /**
     * Serializes the cube's position and size for saving or exporting.
     * @returns An object containing the cube's position and size.
     */
    public serialize(): any {
        const data = {
            position: this.mesh.position,
            size: this.size,
        };
        return data;
    }
}

/**
 * CubeCollisionObserver is an interface for objects that want to be notified
 * when a collision occurs with the bottom face of the cube (e.g., for player death).
 */
export interface CubeCollisionObserver {
    onBottomCollision: (collider: PhysicsBody) => void;
}