import { ActionManager, Color3, ExecuteCodeAction, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Quaternion, StandardMaterial, Texture, Vector3 } from "@babylonjs/core";
let TANK_SPEED = 30;
let TANK_ROTATION_SPEED = 1;
let JUMP_IMPULSE = 1;
export default class Tank {
    constructor(scene) {
        Object.defineProperty(this, "tankMesh", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "speed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "frontVector", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "boxAggregate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "speedX", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "speedZ", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "canFire", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "fireAfter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0.3
        });
        this.tankMesh = MeshBuilder.CreateBox("heroTank", { height: 1, depth: 6, width: 6 }, scene);
        let tankMaterial = new StandardMaterial("tankMaterial", scene);
        tankMaterial.diffuseColor = new Color3(1, 0, 0);
        tankMaterial.emissiveColor = new Color3(0, 0, 1);
        this.tankMesh.material = tankMaterial;
        this.tankMesh.position.y = 0.6;
        this.speed = 10;
        this.frontVector = new Vector3(0, 0, 1);
        this.tankMesh.Tank = this;
        this.boxAggregate = new PhysicsAggregate(this.tankMesh, PhysicsShapeType.BOX, { mass: 0.75, friction: 0.75, restitution: 0.3 }, scene);
        this.boxAggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0),
            centerOfMass: new Vector3(0, 1 / 2, 0),
            mass: 1,
            inertiaOrientation: new Quaternion(0, 0, 0, 1)
        });
        this.boxAggregate.body.setLinearDamping(0.8);
        this.boxAggregate.body.setAngularDamping(10.0);
    }
    move(inputStates) {
        const body = this.boxAggregate.body;
        if (inputStates.up) {
            const forwardVector = this.tankMesh.forward.scale(TANK_SPEED);
            body.applyForce(forwardVector, this.tankMesh.getAbsolutePosition());
        }
        if (inputStates.down) {
            const backwardVector = this.tankMesh.forward.scale(-TANK_SPEED);
            body.applyForce(backwardVector, this.tankMesh.getAbsolutePosition());
        }
        if (inputStates.left) {
            body.setAngularVelocity(new Vector3(0, -TANK_ROTATION_SPEED, 0));
        }
        if (inputStates.right) {
            body.setAngularVelocity(new Vector3(0, TANK_ROTATION_SPEED, 0));
        }
        if (inputStates.space) {
            this.boxAggregate.body.applyImpulse(new Vector3(0, JUMP_IMPULSE, 0), Vector3.Zero());
        }
        this.frontVector = new Vector3(0, 0, 1);
        let mat = this.tankMesh.getWorldMatrix();
        this.frontVector = Vector3.TransformNormal(this.frontVector, mat);
    }
    fire(inputStates, scene, dudes) {
        if (!inputStates.keyF)
            return;
        if (!this.canFire)
            return;
        this.canFire = false;
        setTimeout(() => {
            this.canFire = true;
        }, 1000 * this.fireAfter);
        let cannonball = MeshBuilder.CreateSphere("cannonball", { diameter: 2, segments: 32 }, scene);
        cannonball.material = new StandardMaterial("Fire", scene);
        cannonball.material.diffuseTexture = new Texture("images/Fire.jpg", scene);
        let pos = this.tankMesh.position;
        cannonball.position = new Vector3(pos.x, pos.y + 1, pos.z);
        cannonball.position.addInPlace(this.frontVector.multiplyByFloats(5, 5, 5));
        let cannonballAggregate = new PhysicsAggregate(cannonball, PhysicsShapeType.SPHERE, { mass: 1, restitution: 0.9 }, scene);
        let powerOfFire = 100;
        let azimuth = 0.1;
        let aimForceVector = new Vector3(this.frontVector.x * powerOfFire, (this.frontVector.y + azimuth) * powerOfFire, this.frontVector.z * powerOfFire);
        cannonballAggregate.body.applyImpulse(aimForceVector, cannonball.getAbsolutePosition());
        cannonball.actionManager = new ActionManager(scene);
        let dudesCopy = [...dudes];
        dudes.forEach((dude, index) => {
            cannonball.actionManager.registerAction(new ExecuteCodeAction({
                trigger: ActionManager.OnIntersectionEnterTrigger,
                parameter: dude.transform
            }, () => {
                console.log("HIT dude number ! " + index + " length = " + dudes.length);
                dude.transform.dispose();
                dude.dudeMesh.dispose();
                dudes.splice(dudes.indexOf(dude), 1);
            }));
        });
        setTimeout(() => {
            cannonball.dispose();
        }, 3000);
    }
}
