import { Mesh, MeshBuilder, StandardMaterial, Color3, Scene, Vector3, Animation, NodeGeometryConnectionPointDirection, PhysicsAggregate, PhysicsShapeType, PBRMaterial } from "@babylonjs/core";
import { CharacterInput, EditorObject, GameObject, GameObjectConfig, GameObjectFactory, GameObjectVisitor, Utils } from "../types";
import { ObjectEditorImpl } from "./EditorObject";
import { App } from "../app";

export class Coin implements GameObject {
    public mesh: Mesh[] = [];
    private score: number;
    private scene: Scene;

    public static readonly Type: string = "coin";
    private static nextId: number = 0;

    private id: string;

    constructor(scene: Scene, mesh: Mesh, score: number = 10) {
        this.score = score;
        this.scene = scene;
        
        this.id = `${Coin.Type}_${Coin.nextId++}`;

        if(mesh) {
            this.mesh.push(mesh);
        }
    }

    public getId(): string {
        return this.id;
    }

    public startAnimation(): void {
        this.addRotationAnimation(this.scene);
    }

    private addRotationAnimation(scene: Scene): void {
        const animation = new Animation(
            "coinRotation",
            "rotation.y",
            30, // Framerate
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const keyFrames = [
            { frame: 0, value: 0 },
            { frame: 30, value: Math.PI },
            { frame: 60, value: 2 * Math.PI },
        ];

        animation.setKeys(keyFrames);
        this.getMesh().animations.push(animation);

        scene.beginAnimation(this.mesh, 0, 60, true); // Boucle infinie
    }

    public getMesh(): Mesh {
        return this.mesh[0];
    }

    public getMeshes(): Mesh[] {
        return this.mesh;
    }

    public getType(): string {
        return Coin.Type;
    }

    public accept(visitor: GameObjectVisitor): void {
        visitor.visitCoin(this); // Appelle la méthode `onCoin` du visiteur
    }

    public onContact(): boolean {
        return false;
    }

    public getScore(): number {
        return this.score;
    }

    public update(_: number, __: CharacterInput): void {
        
    }

    public onPause(): void {
    }
    public onResume(): void {
    }

    public addObserver(_: any): void {
        // Pas d'observateurs pour les pièces
    }
}

export class SuperCoin extends Coin {
    public static readonly Type: string = "super_coin";

    constructor(scene: Scene, mesh: Mesh, score: number = 100) {
        super(scene, mesh, score);
    }

    public getType(): string {
        return SuperCoin.Type;
    }
}

export class CoinFactory implements GameObjectFactory {

    /*protected createImpl(config: GameObjectConfig, physics: boolean): Coin {
        const diameter = 15;

        const mesh = MeshBuilder.CreateSphere("coin", { diameter: diameter, segments: 16 }, config.scene);
        // mesh.scaling.y = 0.2; // Rendre la sphère plate
        mesh.position = config.position;
        if(config.translation) {
            mesh.position.addInPlace(config.translation.scale(diameter));
        }

        const material = new PBRMaterial("coinPBRMaterial", config.scene);;
        material.albedoColor = Color3.Yellow();
        material.emissiveColor = Color3.Yellow(); // Jaune
        material.metallic = 1; // Rend la pièce métallique
        material.roughness = 0.2;
        mesh.material = material;

        if(physics) {
            new PhysicsAggregate(mesh, PhysicsShapeType.SPHERE, {
                mass: 0,
                friction: 0,
                restitution: 0,
            });
            mesh.physicsBody.setCollisionCallbackEnabled(true);
        }

        return new Coin(config.scene, mesh, 10);
    }*/
    
    protected createCoinObject(config: GameObjectConfig) {
        return new Coin(config.scene, null, 10);
    }

    protected createCoin(config: GameObjectConfig, physics: boolean, path: string): Coin {
        // const mesh = this.createMesh(config);
        // const player = new Player(mesh, config.scene);
        const coin = this.createCoinObject(config);
        if(!config.size) {
            config.size = new Vector3(15, 15, 5);
        }
    
        Utils.createMeshTask(config, Coin.Type, path, (task) => {
            const meshes = task.loadedMeshes;

            if(config.translation) {
               config.position.addInPlace(config.translation.scale(config.size.x / 2));
            }

            Utils.configureMesh(meshes, config);
            meshes.forEach((m) => coin.mesh.push(m as Mesh));

            if(physics) {
                const aggregate = new PhysicsAggregate(meshes[0], PhysicsShapeType.SPHERE, { mass: 0, friction: 0, restitution: 0 }, config.scene);
                aggregate.body.setCollisionCallbackEnabled(true);
                coin.startAnimation();
            }
        });
        return coin;
    }

    protected createImpl(config: GameObjectConfig, physics: boolean) {
        const path = App.selectedGraphics + "/" + Coin.Type + ".glb";
        return this.createCoin(config, physics, path);
    }

    public create(config: GameObjectConfig): Coin {
        const coin = this.createImpl(config, true);
        return coin;
    }

    public createForEditor(config: GameObjectConfig): EditorObject {
        const coin = this.createImpl(config, false);
        return new ObjectEditorImpl(coin);
    }
}

export class SuperCoinFactory extends CoinFactory {

    /*protected createImpl(config: GameObjectConfig, physics: boolean): SuperCoin {
        const diameter = 15;
        const mesh = MeshBuilder.CreateSphere("superCoin", { diameter: diameter, segments: 16 }, config.scene);
        mesh.position = config.position;
        if(config.translation) {
            mesh.position.addInPlace(config.translation.scale(diameter));
        }

        const material = new PBRMaterial("coinPBRMaterial", config.scene);;
        material.albedoColor = Color3.Red();
        material.emissiveColor = Color3.Red(); // Red
        material.metallic = 1; // Rend la pièce métallique
        material.roughness = 0.2;
        mesh.material = material;

        if(physics) {
            new PhysicsAggregate(mesh, PhysicsShapeType.SPHERE, {
                mass: 0,
                friction: 0.5,
                restitution: 0.5,
            });
            mesh.physicsBody.setCollisionCallbackEnabled(true);
        }

        return new SuperCoin(config.scene, mesh, 100);
    }*/

    protected createCoinObject(config: GameObjectConfig) {
        return new SuperCoin(config.scene, null, 100);
    }

    protected createImpl(config: GameObjectConfig, physics: boolean) : SuperCoin {
        const path = App.selectedGraphics + "/" + SuperCoin.Type + ".glb";
        return this.createCoin(config, physics, path);
    }

}