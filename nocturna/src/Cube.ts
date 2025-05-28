import { Scene, Vector3, MeshBuilder, Color3, PhysicsAggregate, PhysicsShapeType, PhysicsBody } from "@babylonjs/core";
import { Face } from "./Face";
import { createEvilPortalMaterial, createLavaMaterial } from "./Shaders/NocturnaShaders";
import { CollisionGroup } from "./types";

export interface CubeCollisionObserver {
    onBottomCollision: (collider: PhysicsBody) => void;
}

export class Cube {
    private scene: Scene;
    private size: number;
    private faces: Face[] = [];
    private mesh: any;
    private collisionObserver: CubeCollisionObserver | null = null;
    private lavaObserver: any;

    public static readonly Type: string = "Cube";

    constructor(scene: Scene, size: number) {
        this.scene = scene;
        this.size = size;
    }

    public setCollisionObserver(observer: CubeCollisionObserver): void {
        this.collisionObserver = observer;
    }

    public getSize(): number {
        return this.size;
    }

    public static create(scene: Scene, position: Vector3 = Vector3.Zero(), size: number): Cube {
        const cube = new Cube(scene, size);

        const mesh = MeshBuilder.CreateBox("cubeMesh", { size: size }, scene);
        mesh.position = position;
        mesh.isVisible = false;
        cube.mesh = mesh; 

        cube.createPlanes();

        return cube;
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
            // add physics to the face if the physics engine is enabled
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

    public removePhysics() {
        this.faces.forEach(face => {
            if (face.getMesh().physicsBody) {
                face.getMesh().physicsBody.dispose();
                face.getMesh().physicsBody = null;
            }
        });
    }

    public setupMulti() {
        // Trouver la face "Front"
        const frontFace = this.faces.find(face => face.getMesh().name === "Back");
        if (!frontFace) {
            console.error("Front face not found!");
            return;
        }

        const mesh = frontFace.getMesh();

        // Position de la face "Front"
        const frontPosition = mesh.position;

        const depth = 100;
        const sep = 10;
        // Créer la plateforme horizontale
        const horizontalPlatform = MeshBuilder.CreateBox("horizontalSeparator", {
            width: this.size * 2,
            depth: depth + depth / 2,
            height: sep,
        }, this.scene);

        // Positionner la plateforme horizontale à mi-hauteur de la face "Front"
        horizontalPlatform.position = new Vector3(
            frontPosition.x,
            frontPosition.y, // Mi-hauteur
            frontPosition.z // Légèrement en avant de la face
        );

        // Créer la plateforme verticale
        const verticalPlatform = MeshBuilder.CreateBox("verticalSeparator", {
            width: sep,
            depth: depth,
            height: this.size * 2,
        }, this.scene);

        // Positionner la plateforme verticale à mi-largeur de la face "Front"
        verticalPlatform.position = new Vector3(
            frontPosition.x, // Mi-largeur
            frontPosition.y, // Même hauteur que la face
            frontPosition.z - depth / 2 // Légèrement en avant de la face
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

        // Ajouter les plateformes comme enfants de la face "Front"
        // horizontalPlatform.parent = mesh;
        // verticalPlatform.parent = mesh;
    }

    public getMesh(): any {
        return this.mesh;
    }

    public getFaces(): Face[] {
        return this.faces;
    }

    public serialize(): any {
        const data = {
            position: this.mesh.position,
            size: this.size,
        };
        return data;
    }
}