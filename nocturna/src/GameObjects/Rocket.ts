import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Mesh, ParticleSystem, Texture, Color4 } from "@babylonjs/core";
import { GameObject, GameObjectConfig, GameObjectFactory, EditorObject, Utils, CharacterInput } from "../types";

export class RocketObject implements GameObject {
    protected mesh: Mesh;
    protected scene: Scene;

    constructor(mesh: Mesh, scene: Scene) {
        this.mesh = mesh;
        this.scene = scene;
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    public accept(_: any): void {}

    public update(_: number): void {}

    public enableCollision(): void {
        const physicsBody = this.mesh.physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the rocket mesh.");
            return;
        }

        physicsBody.setCollisionCallbackEnabled(true);
        const collisionObservable = physicsBody.getCollisionObservable();
        collisionObservable.add(() => {
            this.explode(); 
        });
    }

    private explode(): void {
        // Create a particle system for the explosion
        const particleSystem = new ParticleSystem("explosion", 2000, this.scene);

        // Set the texture for the particles
        particleSystem.particleTexture = new Texture("textures/flare.png", this.scene);

        // Set the emitter to the rocket's position
        particleSystem.emitter = this.mesh.position.clone();

        // Configure particle system properties
        particleSystem.minEmitBox = new Vector3(-1, -1, -1); // Minimum box size
        particleSystem.maxEmitBox = new Vector3(1, 1, 1); // Maximum box size
        particleSystem.color1 = new Color4(1, 0.5, 0, 1); // Orange
        particleSystem.color2 = new Color4(1, 0, 0, 1); // Red
        particleSystem.minSize = 5; // Increased from 2
        particleSystem.maxSize = 10; // Increased from 5
        particleSystem.minLifeTime = 0.2;
        particleSystem.maxLifeTime = 1;
        particleSystem.emitRate = 1000;
        particleSystem.direction1 = new Vector3(-1, 1, -1);
        particleSystem.direction2 = new Vector3(1, 1, 1);
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 3;

        // Start the particle system
        particleSystem.start();

        // Stop the particle system after a short duration
        setTimeout(() => {
            particleSystem.stop();
            particleSystem.dispose();
        }, 1000);

        // Dispose of the rocket mesh
        this.mesh.dispose();
    }
}

export class FixedRocket extends RocketObject {
    public static readonly Type: string = "fixed_rocket";

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }
}

export class RocketEditorDelegate implements EditorObject {
    private rocket: RocketObject;
    private selected: boolean = false;
    private originalEmissiveColor: Color3 | null = null;

    constructor(rocket: RocketObject) {
        this.rocket = rocket;
    }
    updateScale(dt: number, input: CharacterInput): void {
        throw new Error("Method not implemented.");
    }

    public updatePosition(dt: number, input: any): void {
        const moveSpeed = 0.5 * dt;
        this.rocket.getMesh().position.x += (input.right ? 1 : input.left ? -1 : 0) * moveSpeed;
        this.rocket.getMesh().position.y += (input.up ? 1 : input.down ? -1 : 0) * moveSpeed;
    }

    public updateRotation(dt: number, input: any): void {
        const moveSpeed = 0.005 * dt;
        this.rocket.getMesh().rotation.y += (input.right ? 1 : input.left ? -1 : 0) * moveSpeed;
        this.rocket.getMesh().rotation.x += (input.up ? 1 : input.down ? -1 : 0) * moveSpeed;
    }

    public setSelected(selected: boolean): void {
        this.selected = selected;

        const material = this.rocket.getMesh().material as StandardMaterial;
        if (!material) return;

        if (selected) {
            this.originalEmissiveColor = material.emissiveColor.clone();
            material.emissiveColor = Color3.Yellow();
        } else {
            if (this.originalEmissiveColor) {
                material.emissiveColor = this.originalEmissiveColor;
            }
        }
    }

    public isSelected(): boolean {
        return this.selected;
    }

    public getMesh(): Mesh {
        return this.rocket.getMesh();
    }

    public serialize(): any {
        const data = {
            position: this.rocket.getMesh().position,
            rotation: this.rocket.getMesh().rotation,
            size: Utils.getMeshBoxSize(this.rocket.getMesh()),
        };
        return data;
    }
}

export class FixedRocketFactory implements GameObjectFactory {
    public createMesh(config: GameObjectConfig): Mesh {
        const mesh = MeshBuilder.CreateCylinder("rocket", { diameter: config.size.x, height: config.size.y }, config.scene);
        mesh.position = config.position;
        mesh.rotation = config.rotation;

        const material = new StandardMaterial("rocketMaterial", config.scene);
        material.diffuseColor = Color3.Red();
        mesh.material = material;

        return mesh;
    }

    public create(config: GameObjectConfig): RocketObject {
        const mesh = this.createMesh(config);
        new PhysicsAggregate(mesh, PhysicsShapeType.CYLINDER, { mass: 5, friction: 0.5, restitution: 0.2 }, config.scene);
        const rocket = new FixedRocket(mesh, config.scene);
        rocket.enableCollision(); // Enable collision detection
        return rocket;
    }

    public createForEditor(config: GameObjectConfig): EditorObject {
        const rocket = new FixedRocket(this.createMesh(config), config.scene);
        return new RocketEditorDelegate(rocket);
    }
}
