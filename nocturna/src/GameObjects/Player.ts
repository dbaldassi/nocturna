import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, AbstractMesh, SceneLoader, Mesh, Ray, AssetsManager, ImportMeshAsync, BoundingBox } from "@babylonjs/core";
import { CharacterInput, EditorObject, getMeshSphereSize, GameObject, GameObjectConfig, GameObjectFactory, AbstractState } from "../types";
import { RayHelper } from "@babylonjs/core";

// ========================= PLAYER =========================
// This section contains the Player class, which represents the
// player character in the game. It includes methods for movement,
// jumping, and handling game states. The Player class implements
// the GameObject interface, allowing it to be used in the game
// context. 
// ==========================================================

export class Player implements GameObject {
    public static readonly Type: string = "player";

    public mesh: Mesh;
    private scene: Scene;
    private speed: number = 5.0;
    private jumpForce: Vector3 = undefined;
    private state: AbstractState = null;
    private hp: number = 10;

    constructor(mesh: Mesh, scene: Scene) {
        this.scene = scene;
        this.jumpForce = new Vector3(0, 100000, 0); // Force de saut initiale

        this.mesh = mesh;
        this.state = new IdleState(this);
    }

    public jump() {
        // console.log("Jumping", this.jumpForce);
        const physicsBody = this.mesh.physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the player mesh.");
            return;
        }
        physicsBody.applyImpulse(this.jumpForce, this.mesh.getAbsolutePosition());
    }

    public isGrounded(): boolean {
        const boundingInfo = this.mesh.getBoundingInfo();
        const rayLength = 5; // Add a small offset
        // use player position + diameter / 2 
        const boundingBox = boundingInfo.boundingBox;
        const center = boundingBox.centerWorld;
        const rayOrigin = new Vector3(center.x, center.y - 8, center.z); // Start from the bottom of the sphere

        const rayDirection = Vector3.Down(); // Downward ray
        const ray = new Ray(rayOrigin, rayDirection, rayLength);

        const isGrounded = this.scene.pickWithRay(ray);

        // const rayHelper = new RayHelper(ray);
        // rayHelper.show(this.scene);

        // Check if the ray hit something
        if (isGrounded?.hit && isGrounded.pickedMesh) {
            return true; 
        }

        return false;
    }

    public move(dt: number, input: CharacterInput) {
        // Récupérer le corps physique du joueur
        const physicsBody = this.mesh.physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the player mesh.");
            return;
        }

        // Calculer les directions locales
        const right = Vector3.Right().scale(input.right ? 1 : 0);
        const left = Vector3.Left().scale(input.left ? 1 : 0);

        // Combiner les mouvements horizontaux
        const horizontalMovement = right.add(left);
        // Appliquer la vitesse en fonction de l'entrée utilisateur
        const velocity = horizontalMovement.scale(this.speed * dt);

        // Récupérer la vitesse actuelle pour conserver l'effet de gravité
        const currentVelocity = physicsBody.getLinearVelocity();
        velocity.y = currentVelocity.y; // Conserver la composante verticale (gravité)

        physicsBody.setLinearVelocity(velocity);
    }

    public update(dt: number, input: CharacterInput) {
        const newState = this.state.update(dt, input);
        if (newState) {
            this.state.exit();
            this.state = newState;
            this.state.enter();
        }
    }

    public getScene(): Scene {
        return this.scene;
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    public removePhysics() {
        this.mesh.physicsBody.dispose();
        this.mesh.physicsBody = null;
    }

    public accept(_: any): void { }

    public getHp(): number {
        return this.hp;
    }

    public takeDamage(damage: number): boolean {
        this.hp -= damage;
        if (this.hp <= 0) {
            this.hp = 0;
            return true;
        }
        return false;
    }

}

// ========================= EDITOR =========================
// This section contains the PlayerEditor class, which is responsible
// for managing the player's appearance and behavior in the editor.
// It includes methods for updating the player's position, rotation,
// and scale, as well as handling selection and serialization.
// The PlayerEditor class implements the EditorObject interface,
// allowing it to be used in the editor context.
// ==========================================================

export class PlayerEditor implements EditorObject {
    private player: Player;
    private selected: boolean = false;
    private originalEmissiveColor: Color3 | null = null; // Store the original color

    constructor(player: Player) {
        this.player = player;
    }

    public updatePosition(dt: number, input: CharacterInput): void {
        this.player.mesh.position.x += (input.right ? 1 : input.left ? -1 : 0) * dt;
        this.player.mesh.position.y += (input.up ? 1 : input.down ? -1 : 0) * dt;
    }

    public updateRotation(dt: number, input: CharacterInput): void {
        this.player.mesh.rotation.x += (input.right ? 1 : input.left ? -1 : 0) * dt / 1000;
        this.player.mesh.rotation.y += (input.up ? 1 : input.down ? -1 : 0) * dt / 1000;
    }

    public updateScale(_: number, __: CharacterInput): void { }

    public setSelected(selected: boolean): void {
        this.selected = selected;

        const material = this.player.mesh.material as StandardMaterial;
        if (!material) return;

        if (selected) {
            // Save the original color
            this.originalEmissiveColor = material.emissiveColor.clone();
            this.player.mesh.scaling.x *= 1.1;
            this.player.mesh.scaling.y *= 1.1;
            material.emissiveColor = Color3.Yellow(); // Yellow
        } else {
            this.player.mesh.scaling.x /= 1.1;
            this.player.mesh.scaling.y /= 1.1;
            material.emissiveColor = this.originalEmissiveColor; // White
        }
    }

    public isSelected(): boolean {
        return this.selected;
    }

    public getMesh(): Mesh {
        return this.player.mesh;
    }

    public serialize(): any {
        const data = {
            type: Player.Type,
            position: this.player.mesh.position,
            rotation: this.player.mesh.rotation,
            size: this.player.mesh.scaling,
        };
        return data;
    }
}

// ========================= FACTORY =========================
// This section contains the PlayerFactory class, which is responsible
// for creating player objects in the game. It includes methods to
// create the player mesh and apply physics properties. The factory
// also provides a method to create player objects for the editor.
// ==========================================================

export class PlayerFactory implements GameObjectFactory {
    private createMesh(config: GameObjectConfig): Mesh {
        const sphere = MeshBuilder.CreateSphere("player", { diameter: config.size.x }, config.scene);
        sphere.position = config.position;
        sphere.rotation = config.rotation;

        const material = new StandardMaterial("playerMaterial", config.scene);
        material.diffuseColor = Color3.Red();
        sphere.material = material;

        return sphere;
    }

    configureMesh(meshes: Mesh[], config: GameObjectConfig): void {
        const mesh = meshes[0];
        mesh.name = "player";
        mesh.position = config.position;
        mesh.rotation = config.rotation;
        mesh.scaling = config.size ?? new Vector3(10, 10, 10);
        mesh.setBoundingInfo(meshes[1].getBoundingInfo());
        mesh.refreshBoundingInfo();
    }

    createTask(config: GameObjectConfig, callback: (task: any) => void): void {
        const task = config.assetsManager.addMeshTask("player", "", "models/", "sphere.glb");
        task.onSuccess = (task) => {
            console.log("Player loaded successfully");
            callback(task);
        }
        task.onError = (task, message) => {
            console.error("Error loading player:", message);
        };
    }

    public create(config: GameObjectConfig): Player {
        // const mesh = this.createMesh(config);
        // const player = new Player(mesh, config.scene);
        const player = new Player(null, config.scene);

        this.createTask(config, (task) => {
            const meshes = task.loadedMeshes;

            this.configureMesh(meshes, config);

            new PhysicsAggregate(meshes[0], PhysicsShapeType.SPHERE, { mass: 70, friction: 10, restitution: 0 }, config.scene);

            player.mesh = meshes[0];
        });
        
        return player;
    }

    public createForEditor(config: GameObjectConfig): PlayerEditor {
        const player = new Player(null, config.scene);

        this.createTask(config, (task) => {
            const meshes = task.loadedMeshes;

            this.configureMesh(meshes, config);

            player.mesh = meshes[0];
        });
        
        return new PlayerEditor(player);
    }
}

// ========================= STATES =========================
// This section contains the implementation of the player's states,
// including JumpingState, MovingState, and IdleState. Each state
// manages specific behaviors and transitions based on player input
// and interactions with the environment.
// ==========================================================

class JumpingState implements AbstractState {
    public static readonly Type: string = "jumping";
    private player: Player;
    constructor(player: Player) {
        this.player = player;
    }

    public enter(): void {
        // Set jumping animation
    }
    public exit(): void {
        // Stop jumping animation
    }
    public name(): string {
        return JumpingState.Type;
    }

    public update(dt: number, input: CharacterInput): AbstractState | null {

        const isGrounded = this.player.isGrounded();

        this.player.move(dt, input);

        if (isGrounded) {
            if (input.left || input.right) return new MovingState(this.player);
            else return new IdleState(this.player);
        }

        return null;
    }
}

class MovingState implements AbstractState {
    public static readonly Type: string = "moving";
    private player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    public enter(): void {
        // Set moving animation
    }
    public exit(): void {
        // Stop moving animation
    }
    public name(): string {
        return MovingState.Type;
    }
    public update(dt: number, input: CharacterInput): AbstractState | null {
        // console.log("MovingState", dt, input);
        if (input.jump) {
            this.player.jump();
            return new JumpingState(this.player);
        }
        else if (!input.left && !input.right) {
            return new IdleState(this.player);
        }

        this.player.move(dt, input);

        if (!this.player.isGrounded()) {
            return new JumpingState(this.player);
        }

        return null;
    }
}

class IdleState implements AbstractState {
    public static readonly Type: string = "idle";
    private player: Player;
    constructor(player: Player) {
        this.player = player;
    }
    public enter(): void {
    }
    public exit(): void {
        // Stop idle animation
    }
    public name(): string {
        return IdleState.Type;
    }
    public update(dt: number, input: CharacterInput): AbstractState | null {
        // must update the velocity to 0, becuase of moving state inertia
        this.player.mesh.physicsBody.setLinearVelocity(Vector3.Zero());

        // console.log("IdleState", dt, input);
        if (input.jump) {
            this.player.jump();
            return new JumpingState(this.player);
        }
        else if (input.left || input.right) {
            this.player.move(dt, input);
            return new MovingState(this.player);
        }
        return null;
    }
}
