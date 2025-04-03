import { MeshBuilder, PhysicsAggregate, PhysicsMotionType, PhysicsShapeType, Vector3 } from "@babylonjs/core";
export default class Dude {
    constructor(dudeMesh, a, scene, speed) {
        Object.defineProperty(this, "dudeMesh", {
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
        Object.defineProperty(this, "transform", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "capsuleAggregate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "animation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.dudeMesh = dudeMesh;
        this.animation = a;
        if (speed)
            this.speed = speed;
        else
            this.speed = 10;
        dudeMesh.Dude = this;
        let children = dudeMesh.getChildren();
        let maxHeight = 0;
        let maxWidth = 0;
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            let childBBInfo = child.getBoundingInfo();
            let childHeight = childBBInfo.boundingBox.extendSize.y;
            let childWidth = childBBInfo.boundingBox.extendSize.z;
            if (childHeight > maxHeight) {
                maxHeight = childHeight;
            }
            if (childWidth > maxWidth) {
                maxWidth = childWidth;
            }
        }
        console.log("maxWidth = " + maxWidth);
        this.transform = MeshBuilder.CreateCapsule("dudeCapsule", { height: maxHeight / 2, radius: maxWidth / 2 }, scene);
        this.transform.visibility = 0.2;
        this.transform.position = new Vector3(this.dudeMesh.position.x, this.dudeMesh.position.y + 6, this.dudeMesh.position.z);
        this.capsuleAggregate = new PhysicsAggregate(this.transform, PhysicsShapeType.BOX, { mass: 0.1, restitution: 0 }, scene);
        this.capsuleAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
        this.capsuleAggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0),
        });
        this.dudeMesh.position = new Vector3(0, 0, 0);
        this.dudeMesh.parent = this.transform;
        this.dudeMesh.position.y = -maxHeight / 4;
    }
    move(scene) {
        let tank = scene.getMeshByName("heroTank");
        let direction = tank.position.subtract(this.transform.position);
        let distance = direction.length();
        let dir = direction.normalize();
        let alpha = Math.atan2(-dir.x, -dir.z);
        this.dudeMesh.rotation.y = alpha;
        if (distance > 30) {
            this.animation.restart();
            this.capsuleAggregate.body.setLinearVelocity(dir.scale(this.speed));
        }
        else {
            this.capsuleAggregate.body.setLinearVelocity(new Vector3(0, 0, 0));
            this.animation.pause();
        }
    }
}
