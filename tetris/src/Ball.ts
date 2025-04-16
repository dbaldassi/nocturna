import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh } from "@babylonjs/core";

export class Ball {
    public mesh: Mesh;
    public player_id: number;
    private velocity: Vector3;
    private hitbox: number = 2; // Hitbox size
    private readonly speed = 10; // Speed of the ball

    constructor(scene: Scene, position: Vector3, diameter: number) {
        // Create the sphere mesh
        this.mesh = MeshBuilder.CreateSphere("ball", { diameter: diameter }, scene);

        // Set the position of the ball
        this.mesh.position = position;

        // Create and apply a material to the ball
        const ballMaterial = new StandardMaterial("ballMaterial", scene);
        ballMaterial.diffuseColor = new Color3(0,1,0); // Set the color of the ball
        this.mesh.material = ballMaterial;

        this.velocity = new Vector3(0, 0, 0); // Initialize velocity to zero

        console.log("Ball created at position:", this.mesh.position);
    }

    public start() {
        // Initialize the ball's velocity
        this.velocity.y = 1;
    }

    public onPlatformEnter(other: Mesh) {
        const ballBoundingBox = this.mesh.getBoundingInfo().boundingBox;
        const otherBoundingBox = other.getBoundingInfo().boundingBox;
            
        let ballBottom = this.mesh.position.y + ballBoundingBox.minimum.y - this.hitbox; // Bottom of the ball
        let ballTop = this.mesh.position.y + ballBoundingBox.maximum.y + this.hitbox; // Top of the ball
        let ballLeft = this.mesh.position.x + ballBoundingBox.maximum.x + this.hitbox; // Left of the ball
        let ballRight = this.mesh.position.x + ballBoundingBox.minimum.x - this.hitbox; // Right of the ball

        let otherBottom = other.position._y + otherBoundingBox.minimum.y - this.hitbox; // Bottom of the other object
        let otherTop = other.position._y + otherBoundingBox.maximum.y + this.hitbox; // Top of the other object
        let otherLeft = other.position._x + otherBoundingBox.maximum.x + this.hitbox; // Left of the other object
        let otherRight = other.position._x + otherBoundingBox.minimum.x - this.hitbox; // Right of the other object        

        let isAbove = ballBottom <= otherTop && ballBottom > otherBottom;
        let isBelow = ballTop >= otherBottom && ballTop < otherTop;
        let isLeft = ballRight <= otherLeft && ballRight > otherRight;
        let isRight = ballLeft >= otherRight && ballLeft < otherLeft;

        // console.log({ballBottom, ballTop, ballLeft, ballRight});
        // console.log({otherBottom, otherTop, otherLeft, otherRight});
        // console.log({isAbove, isBelow, isLeft, isRight});

        if(isAbove && !isBelow || isBelow && !isAbove) {
            this.velocity.y = -this.velocity.y;
            if(isAbove) {
                let ballLeft = this.mesh.position.x + ballBoundingBox.maximum.x; // Left of the ball
                let ballRight = this.mesh.position.x + ballBoundingBox.minimum.x; // Right of the ball
                let otherLeft = other.position._x + otherBoundingBox.maximum.x; // Left of the other object
                let otherRight = other.position._x + otherBoundingBox.minimum.x; // Right of the other object     

                const width = otherLeft - otherRight;
                console.log({width});
                if(ballRight > (otherLeft - width / 3)) {
                    this.velocity.x = 0.5;
                }
                else if(ballLeft < (otherRight + width / 3)) {
                    this.velocity.x = -0.5;
                }
                else {
                    this.velocity.x = 0;
                }
            }

            else {
                console.log(other.metadata);
                if(other.name === "ceiling" || other.name === "leftWall" || other.name === "rightWall") return;

                if (other.metadata && other.metadata.actions) {
                    other.metadata.actions.forEach(({ dst, enterAction, exitAction }: any) => {
                        if (dst.mesh.actionManager) {
                            dst.mesh.actionManager.unregisterAction(enterAction);
                            dst.mesh.actionManager.unregisterAction(exitAction);
                        }
                    });
                    other.metadata.actions = []; // Nettoyer les actions associées
                }

                other.dispose();
            }
        }

        else if(isLeft && !isRight || isRight && !isLeft) {
            this.velocity.x = -this.velocity.x;
        }
    }

    public onPlatformExit(other: Mesh) {

    }

    public update(dt: number) {
        this.mesh.position.addInPlace(this.velocity.scale(this.speed * dt / 1000)); // Update the position based on velocity and deltaTime
    }
}