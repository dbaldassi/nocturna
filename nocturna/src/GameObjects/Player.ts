import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, AbstractMesh, SceneLoader, Mesh, Ray, AssetsManager, ImportMeshAsync, BoundingBox, NodeMaterial, Sound, StaticSound } from "@babylonjs/core";
import { CharacterInput, EditorObject, Utils, GameObject, GameObjectConfig, GameObjectFactory, AbstractState, Enemy } from "../types";
import { IdleState, KnockbackState, PlayerDamageableState, PlayerDamageState } from "../states/PlayerStates";
import { ObjectEditorImpl } from "./EditorObject";
import { App } from "../app";
import { name } from "@babylonjs/gui";

// ========================= PLAYER =========================
// This section contains the Player class, which represents the
// player character in the game. It includes methods for movement,
// jumping, and handling game states. The Player class implements
// the GameObject interface, allowing it to be used in the game
// context. 
// ==========================================================

export class Player implements GameObject {
    public static readonly Type: string = "player";
    private static nextId: number = 0;

    public mesh: Mesh[] = [];
    private scene: Scene;
    private speed: number = 5.0;
    private jumpForce: Vector3 = undefined;
    private state: AbstractState = null;
    private damageState: PlayerDamageState = null;
    private hp: number = 10;
    private id: string;
    private sounds: Map<string, StaticSound> = new Map();

    private maxHp: number = 10;

    constructor(mesh: Mesh, scene: Scene) {
        this.scene = scene;
        this.jumpForce = new Vector3(0, 100000, 0); // Force de saut initiale
        this.hp = this.maxHp;
        if (mesh) this.mesh.push(mesh);
        this.state = new IdleState(this);
        this.damageState = new PlayerDamageableState(this);

        this.id = `${Player.Type}_${Player.nextId++}`;
    }

    public getId(): string {
        return this.id;
    }

    public setId(id: string): void {
        this.id = id;
    }

    public addSound(name: string, sound: StaticSound): void {
        this.sounds.set(name, sound);
    }

    public playSound(name: string): void {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.play();
        } else {
            console.warn(`Sound ${name} not found for player.`);
        }
    }

    public jump() {
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

        const result = this.scene.pickWithRay(ray, (mesh) => !this.mesh.includes(mesh as Mesh) && mesh.name === "platform");

        return result?.hit;
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
        const damageState = this.damageState.update(dt, input);
        if (damageState) {
            this.damageState.exit();
            this.damageState = damageState as PlayerDamageState;
            this.damageState.enter();
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

    public getMaxHp(): number {
        return this.maxHp;
    }

    public getHp(): number {
        return this.hp;
    }

    public dashBack() {
        const mesh = this.getMesh();
        const physicsBody = mesh.physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the player mesh.");
            return;
        }
        const currentVelocity = physicsBody.getLinearVelocity();
        let backward: Vector3;
        if (currentVelocity.length() > 0.01) {
            backward = currentVelocity.scale(-1).normalize();
        } else {
            backward = mesh.forward.scale(-1); // Utilise l'orientation du mesh si à l'arrêt
        }
        const impulseStrength = 10000;
        const impulse = backward.scale(impulseStrength);

        physicsBody.applyImpulse(impulse, mesh.getAbsolutePosition());
    }

    public doTakeDamage(damage: number): void {
        this.hp -= damage;
        if (this.hp <= 0) {
            this.kill();
            return;
        }

        this.playSound("hit");

        this.state.exit();
        this.state = new KnockbackState(this);
        this.state.enter();
        this.dashBack();
    }

    public takeDamage(damage: number): void {
        this.damageState.takeDamage(damage);
    }

    public isAlive(): boolean {
        return this.hp > 0;
    }

    public kill(): void {
        this.playSound("death");
        this.hp = 0;
    }

    public onPause(): void {
        // this.mesh[0].physicsBody.setMassProperties({ mass: 0 });
    }
    public onResume(): void {
        // this.mesh[0].physicsBody.setMassProperties({ mass: 70 });
        this.state = new IdleState(this);
        this.state.update(0, {
            left: false, right: false, jump: true,
            backward: false,
            forward: false,
            up: false,
            down: false
        });
    }
    public onContact(): boolean {
        return false; // Player does not handle contact events
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
        if (!config.size) {
            config.size = new Vector3(10, 10, 10);
        }

        const path = App.selectedGraphics + "/" + Player.Type + ".glb";

        Utils.createMeshTask(config, "player", path, (task) => {
            const meshes = task.loadedMeshes;

            Utils.configureMesh(meshes, config);

            if (physics) {
                const aggregate = new PhysicsAggregate(meshes[0], PhysicsShapeType.SPHERE, { mass: 70, friction: 10, restitution: 0 }, config.scene);
                aggregate.body.setMassProperties({ mass: 70, inertia: new Vector3(0, 0, 1) });
            }

            meshes[0].name = "player";
            meshes.forEach((mesh) => { player.mesh.push(mesh); });
        });

        const sounds = [
            { name: "jump", path: "/assets/sounds/sfx_jump.flac" },
            { name: "land", path: "/assets/sounds/jumpland.wav" },
            { name: "death", path: "/assets/sounds/death.wav" },
            { name: "move", path: "/assets/sounds/footstep_wood_001.ogg", volume: 0.5 },
            { name: "hit", path: "/assets/sounds/playerhit.mp3" },
        ];

        // load sounds
        sounds.forEach(({ name, path, volume }) => {
            Utils.loadSound(config.assetsManager, name, path, (sound) => {
                if (volume) sound.volume = volume;
                player.addSound(name, sound);
            });
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

