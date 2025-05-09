import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, AbstractMesh, SceneLoader, Mesh, Ray, AssetsManager, ImportMeshAsync, BoundingBox } from "@babylonjs/core";
import { CharacterInput, EditorObject, Utils, GameObject, GameObjectConfig, GameObjectFactory, AbstractState } from "../types";
import { RayHelper } from "@babylonjs/core";
import { ObjectEditorImpl } from "./EditorObject";

// ========================= PLAYER =========================
// This section contains the Player class, which represents the
// player character in the game. It includes methods for movement,
// jumping, and handling game states. The Player class implements
// the GameObject interface, allowing it to be used in the game
// context. 
// ==========================================================

export class Player implements GameObject {
    public static readonly Type: string = "player";

    private mesh: Mesh[] = [];
    private scene: Scene;
    private speed: number = 5.0;
    private jumpForce: Vector3 = undefined;
    private state: AbstractState = null;
    private hp: number = 10;
x
    constructor(mesh: Mesh, scene: Scene) {
        this.scene = scene;
        this.jumpForce = new Vector3(0, 100000, 0); // Force de saut initiale

        if(mesh) this.mesh.push(mesh);
        this.state = new IdleState(this);
    }

    public jump() {
        console.log("Jumping", this.jumpForce);
        const physicsBody = this.getMesh().physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the player mesh.");
            return;
        }
        physicsBody.applyImpulse(this.jumpForce, this.getMesh().getAbsolutePosition());
    }

    public isGrounded(): boolean {
        const bounding = Utils.getTotalBoundingSphere(this.mesh);
        const rayLength = bounding.radius; // Add a small offset
        // use player position + diameter / 2 
        const rayOrigin = new Vector3(bounding.center.x, bounding.center.y, bounding.center.z); // Start from the bottom of the sphere

        const rayDirection = Vector3.Down(); // Downward ray
        const ray = new Ray(rayOrigin, rayDirection, rayLength);
        // const rayHelper = new RayHelper(ray);
        // rayHelper.show(this.scene);

        const result = this.scene.pickWithRay(ray, (mesh) => !this.mesh.includes(mesh));
    
        return !!(result?.hit && result.pickedMesh);;
    }

    public move(dt: number, input: CharacterInput) {
        // Récupérer le corps physique du joueur
        const physicsBody = this.getMesh().physicsBody;
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

    public getType(): string {
        return Player.Type;
    }

    public getScene(): Scene {
        return this.scene;
    }

    public getMesh(): Mesh {
        return this.mesh[0];
    }

    public getMeshes(): Mesh[] {
        return this.mesh;
    }

    public removePhysics() {
        this.getMesh().physicsBody.dispose();
        this.getMesh().physicsBody = null;
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

// ========================= FACTORY =========================
// This section contains the PlayerFactory class, which is responsible
// for creating player objects in the game. It includes methods to
// create the player mesh and apply physics properties. The factory
// also provides a method to create player objects for the editor.
// ==========================================================

export class PlayerFactory implements GameObjectFactory {
    private createImpl(config: GameObjectConfig, physics: boolean): Player {
        const player = new Player(null, config.scene);
        if(!config.size) {
            config.size = new Vector3(10, 10, 10);
        }

        Utils.createMeshTask(config, "player", "sphere.glb", (task) => {
            const meshes = task.loadedMeshes;
            
            Utils.configureMesh(meshes, config);

            if(physics) {
                new PhysicsAggregate(meshes[0], PhysicsShapeType.SPHERE, { mass: 70, friction: 10, restitution: 0 }, config.scene);
            }

            meshes[0].name = "player";
            meshes.forEach((mesh) => {
                console.log("Mesh", mesh.name);
                player.mesh.push(mesh);
            });
            // player.mesh = meshes[0];
        });
        
        return player;
    }

    public create(config: GameObjectConfig): Player {
        const player = this.createImpl(config, true);
        return player;
    }

    public createForEditor(config: GameObjectConfig): EditorObject {
        const player = this.createImpl(config, false);
        const editor = new ObjectEditorImpl(player);
        return editor;
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
        this.player.move(dt, input);

        const isGrounded = this.player.isGrounded();

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
        else if (!this.player.isGrounded()) {
            return new JumpingState(this.player);
        }

        this.player.move(dt, input);

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
        const velocity = this.player.getMesh().physicsBody.getLinearVelocity();
        velocity.x = 0;
        this.player.getMesh().physicsBody.setLinearVelocity(velocity);

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
