import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, AbstractMesh, Mesh, Ray } from "@babylonjs/core";
import { CharacterInput, EditorObject, getMeshSize } from "../types";
import { GameObject, GameObjectConfig, GameObjectFactory } from "../types";
import { FixedPlatform, ParentedPlatform } from "./Platform";

export class Player implements GameObject {
    public static readonly Type: string = "player";

    private scene: Scene;
    public mesh: Mesh;
    private diameter: number = 10;
    private speed: number = 2000.0;
    private haswin: boolean = false;
    private hasLoose: boolean = false;
    private score: number = 0;
    private jumpForce: Vector3 = undefined;

    constructor(mesh: Mesh, scene: Scene) {
        this.scene = scene;
        this.jumpForce = new Vector3(0, 100000, 0); // Force de saut initiale

        this.mesh = mesh;
    }

    private isPlatform(mesh: AbstractMesh): boolean {
        // console.log("isPlatform", mesh.name);
        return mesh.name === "platform";
    }

    public move(dt: number, input: CharacterInput) {
        // Récupérer le corps physique du joueur
        const physicsBody = this.mesh.physicsBody;
        if (!physicsBody) {
            console.warn("Physics body not found for the player mesh.");
            return;
        }

        // console.log(input);

        // Calculer les directions locales
        const right = Vector3.Right().scale(input.right ? -5 : 0);
        const left = Vector3.Left().scale(input.left ? -5 : 0);

        // Combiner les mouvements horizontaux
        const horizontalMovement = right.add(left);
        // Appliquer la vitesse en fonction de l'entrée utilisateur
        const velocity = horizontalMovement.scale(this.speed * dt / 1000);


        // Récupérer la vitesse actuelle pour conserver l'effet de gravité
        const currentVelocity = physicsBody.getLinearVelocity();
        velocity.y = currentVelocity.y; // Conserver la composante verticale (gravité)

        physicsBody.setLinearVelocity(velocity);

        const ray = Vector3.Down(); // Downward ray
        const diameter = getMeshSize(this.mesh).x;
        const rayLength = diameter / 2; // Slightly below the player
        const rayOrigin = this.mesh.getAbsolutePosition().add(new Vector3(0, -diameter / 2, 0)); // Adjust ray origin to the bottom of the player
        const hit = this.scene.pickWithRay(new Ray(rayOrigin, ray, rayLength));

        const isGrounded = hit && hit.pickedMesh && this.isPlatform(hit.pickedMesh);

        // console.log("isGrounded", isGrounded, hit);
        if (input.jump && isGrounded) {
            console.log("Jumping", this.jumpForce);
            physicsBody.applyImpulse(this.jumpForce, this.mesh.getAbsolutePosition());
        }
    }

    public update(dt: number, input: CharacterInput) {
        this.move(dt, input);
    }

    public hasWon(): boolean {
        return this.haswin;
    }

    public setWin() {
        this.haswin = true;
    }

    public getScore(): number {
        return this.score;
    }

    public setScore(score: number) {
        this.score = score;
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    public setLose(lose: boolean) {
        this.hasLoose = lose;
    }

    public hasLost(): boolean {
        return this.hasLoose;
    }

    public removePhysics() {
        this.mesh.physicsBody.dispose();
        this.mesh.physicsBody = null;
    }

    public accept(visitor: any): void {}

}

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

    public updateScale(dt: number, input: CharacterInput): void {}

    public setSelected(selected: boolean): void {
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
            size: getMeshSize(this.player.mesh),
        };
        return data;
    }    
}

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

    public create(config: GameObjectConfig): Player {
        const mesh = this.createMesh(config);
        new PhysicsAggregate(mesh, PhysicsShapeType.SPHERE, { mass: 70, friction: 10, restitution: 0 }, config.scene);
        const player = new Player(mesh, config.scene);

        return player;
    }

    public createForEditor(config: GameObjectConfig): PlayerEditor {
        const mesh = this.createMesh(config);
        const player = new Player(mesh, config.scene);
        return new PlayerEditor(player);
    }
}