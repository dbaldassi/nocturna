import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Texture, Mesh } from "@babylonjs/core";
import { ParentNodeObserver } from "./ParentNode";
import { CharacterInput, EditorObject, GameObject, GameObjectConfig, GameObjectFactory } from "./types";

export class Platform implements GameObject {

    protected mesh: Mesh;
    protected scene: Scene;

    constructor(mesh: Mesh, scene: Scene) {
        this.mesh = mesh;
        this.scene = scene;
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    public accept(_: any): void {
    }

    public update(_: number, __: CharacterInput): void {
    }
}

export class ParentedPlatform extends Platform implements ParentNodeObserver {

    public static readonly Type: string = "parented_platform";

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }

    public onRotationChange() {
        this.recreatePhysicsBody();
    }

    public recreatePhysicsBody() {
        // Supprimez l'ancien corps physique
        if (this.mesh.physicsBody) {
            this.mesh.physicsBody.dispose();
        }
    
        // Créez un nouveau corps physique avec les nouvelles transformations
        new PhysicsAggregate(this.mesh, PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, this.scene);
    }

}

export class FixedPlatform extends Platform  {
    public static readonly Type: string = "fixed_platform";

    constructor(mesh: Mesh, scene: Scene) {
        super(mesh, scene);
    }
}

export class PlatformEditorDelegate implements EditorObject { 
    private platform: Platform;
    private selected: boolean = false;
    private readonly lateralspeed: number = 0.5;
    private readonly rotationspeed: number = 0.005;
    private originalEmissiveColor: Color3 | null = null; // Stocker la couleur d'origine

    constructor(platform: Platform) {
        this.platform = platform;
    }

    public updatePosition(dt: number, input: CharacterInput): void {
        const moveSpeed = this.lateralspeed * dt;
        this.platform.getMesh().position.x += (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed;
        this.platform.getMesh().position.y += (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed;
    }

    public updateRotation(dt: number, input: CharacterInput): void {
        const moveSpeed = this.rotationspeed * dt;
        this.platform.getMesh().rotation.y += (input.right ? 1 : (input.left ? -1 : 0)) * moveSpeed;
        this.platform.getMesh().rotation.x += (input.up ? 1 : (input.down ? -1 : 0)) * moveSpeed;
    }

    public updateScale(_: number, input: CharacterInput): void {
        this.platform.getMesh().scaling.x += (input.right ? 1 : (input.left ? -1 : 0));
        this.platform.getMesh().scaling.y += (input.up ? 1 : (input.down ? -1 : 0));
    }

    public setSelected(selected: boolean): void {
        this.selected = selected;

        const material = this.platform.getMesh().material as StandardMaterial;
        if (!material) return;

        if (selected) {
            this.originalEmissiveColor = material.emissiveColor.clone();
            material.emissiveColor = Color3.Yellow(); // Jaune
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
        return this.platform.getMesh();
    }

    public serialize(): any {
        const data = {
            position: this.platform.getMesh().position,
            rotation: this.platform.getMesh().rotation,
            size: this.platform.getMesh().scaling,
        };
        return data;
    }
}

export class FixedPlatformEditor extends FixedPlatform  implements EditorObject {
    private platform:  FixedPlatform;
    private delegate: PlatformEditorDelegate;

    constructor(scene: Scene, platform: Platform) {
        super(null, scene);
        this.platform = platform as FixedPlatform;
        this.delegate = new PlatformEditorDelegate(this.platform);
    }

    public update(dt: number) {

    }

    public updatePosition(dt: number, input: CharacterInput): void {
        this.delegate.updatePosition(dt, input);
    }
    public updateRotation(dt: number, input: CharacterInput): void {
        this.delegate.updateRotation(dt, input);
    }
    public updateScale(dt: number, input: CharacterInput): void {
        this.delegate.updateScale(dt, input);
    }
    public setSelected(selected: boolean): void {
        this.delegate.setSelected(selected);
    }
    public isSelected(): boolean {
        return this.delegate.isSelected();
    }
    public getMesh(): Mesh {
        return this.delegate.getMesh();
    }
    public serialize(): any {
        const data = this.delegate.serialize();
        data.type = FixedPlatform.Type;
        return data;
    }
}

export class ParentedPlatformEditor extends ParentedPlatform implements EditorObject {
    private platform:  ParentedPlatform;
    private delegate: PlatformEditorDelegate;

    constructor(scene: Scene, platform: Platform) {
        super(null, scene);
        this.platform = platform as ParentedPlatform;
        this.delegate = new PlatformEditorDelegate(this.platform);
    }

    public update(dt: number) {

    }

    public updatePosition(dt: number, input: CharacterInput): void {
        this.delegate.updatePosition(dt, input);
    }
    public updateRotation(dt: number, input: CharacterInput): void {
        this.delegate.updateRotation(dt, input);
    }
    public updateScale(dt: number, input: CharacterInput): void {
        this.delegate.updateScale(dt, input);
    }
    public setSelected(selected: boolean): void {
        this.delegate.setSelected(selected);
    }
    public isSelected(): boolean {
        return this.delegate.isSelected();
    }
    public getMesh(): Mesh {
        return this.delegate.getMesh();
    }
    public serialize(): any {
        const data = this.delegate.serialize();
        data.type = ParentedPlatform.Type;
        return data;
    }
}

export class ParentedPlatformFactory implements GameObjectFactory {

    private createWithoutPhysics(config: GameObjectConfig): ParentedPlatform {
        const mesh = MeshBuilder.CreateBox("platform", { width: config.size.x, height: config.size.y, depth: config.size.z }, config.scene);
        mesh.position = config.position;
        mesh.rotation = config.rotation;

        // Apply material
        const material = new StandardMaterial("platformMaterial", config.scene);
        material.diffuseTexture = new Texture("images/wood.jpg", config.scene); // Replace with the path to your wood texture
        material.backFaceCulling = false; // Ensure the texture is visible from all sides
        mesh.material = material;

        const platform = new ParentedPlatform(mesh, config.scene);
        config.parent.addChild(mesh);

        return platform;
    }

    public create(config: GameObjectConfig): Platform {
        const platform = this.createWithoutPhysics(config);

        // Add physics to the platform
        new PhysicsAggregate(platform.getMesh(), PhysicsShapeType.BOX, { mass: 0, friction: 10, restitution: 0 }, config.scene);
        config.parent.addObserver(platform);

        return platform;
    }

    public createForEditor(config: GameObjectConfig): EditorObject {
        const actual_platform = this.createWithoutPhysics(config);

        const platform = new FixedPlatformEditor(config.scene, actual_platform);        
        return platform;
    }
}

export class FixedPlatformFactory implements GameObjectFactory {
    public create(config: GameObjectConfig): Platform {
        const mesh = MeshBuilder.CreateBox("platform", { width: config.size.x, height: config.size.y, depth: config.size.z }, config.scene);
        mesh.position = config.position;
        mesh.rotation = config.rotation;

        // Apply material
        const material = new StandardMaterial("platformMaterial", config.scene);
        // material.diffuseTexture = new Texture("images/wood.jpg", scene); // Replace with the path to your wood texture
        // material.backFaceCulling = false; // Ensure the texture is visible from all sides
        material.diffuseColor = Color3.Blue(); // Set the color to red
        mesh.material = material;

        const platform = new FixedPlatform(mesh, config.scene);

        return platform;
    }s

    public createForEditor(config: GameObjectConfig): EditorObject {
        const actual_platform = this.create(config);
        const platform = new ParentedPlatformEditor(config.scene, actual_platform);        
        return platform;
    }
}
