import { Mesh, MeshBuilder, Scene, StandardMaterial, Color3, Vector3, Vector2 } from "@babylonjs/core";
import { CharacterInput } from "./types";

class PlatformSide {
    public side: string;
    public mesh: Mesh;
}

export class Character {
    // position: Vector3;
    velocity: Vector3;
    speed: number;
    jumpForce: number;
    isJumping: boolean;
    jumpDuration: number;
    jumpTime: number = 0;
    isOnGround: boolean = true;
    leftBlock: boolean = false;
    rightBlock: boolean = false;
    collidingPlatform: PlatformSide[] = [];
    border: Vector3;
    public mesh: Mesh;

    constructor(initialPosition: Vector3, scene: Scene, name: string, border: Vector3) {

        this.mesh = MeshBuilder.CreateBox(name, { width: 5, height: 0.5, depth: 2 }, scene);
        this.mesh.position = initialPosition;

        const material = new StandardMaterial("characterMaterial", scene);
        material.diffuseColor = new Color3(1, 0, 0); // Rouge
        this.mesh.material = material;

        // this.position = initialPosition;
        this.velocity = new Vector3(0, 0, 0);
        this.speed = 20;
        this.jumpForce = 10;
        this.jumpDuration = 1; // Durée du saut
        this.isJumping = false;
        this.border = border;
    }

    move(dt: number, input: CharacterInput) {
        // Handle input
        const direction = new Vector3(0, 0, 0);
        direction.x -= input.right && !this.rightBlock ? 1 : 0;
        direction.x += input.left && !this.leftBlock ? 1 : 0;
        direction.x *= this.speed * (dt/1000); 

        this.mesh.position.addInPlace(direction)
    }

    onPlatformEnter(platform: Mesh) {
        console.log("On platform enter !!!");

        const boundingInfo = this.mesh.getBoundingInfo();
        const platformBoundingInfo = platform.getBoundingInfo();

        // console.log(platform.getBoundingInfo(), platform.position._x);

        const characterRight = this.mesh.position.x + (boundingInfo.boundingBox.minimum.x - 0.5); // Gauche du personnage
        const characterLeft = this.mesh.position.x + boundingInfo.boundingBox.maximum.x + 0.5; // Droite du personnage

        const platformRight = platform.position._x + platformBoundingInfo.boundingBox.minimum._x; // Gauche de la plateforme
        const platformLeft = platform.position._x + platformBoundingInfo.boundingBox.maximum._x; // Droite de la plateforme

        // const isAbovePlatform = characterMinY >= platformMaxY; // Le personnage est au-dessus de la plateforme
        // const isBelowPlatform = characterMaxY <= platformMinY; // Le personnage est en dessous de la plateforme

        const isOnLeftSide = characterLeft >= platformRight; // Le personnage est à gauche de la plateforme
        const isOnRightSide = characterRight <= platformLeft; // Le personnage est à droite de la plateforme

        console.log({characterLeft, characterRight, platformLeft, platformRight, isOnLeftSide});

        const p_side = new PlatformSide();
        p_side.mesh = platform;

        if(isOnLeftSide) {
            this.leftBlock = true;
            p_side.side = "left";
        }
        else if(isOnRightSide) {
            this.rightBlock = true;
            p_side.side = "right";
        }
                 
         this.collidingPlatform.push(p_side);
    }

    onPlatformExit(platform: Mesh) {
        console.log("On platform exit !!!");

        const side = this.collidingPlatform.find(p => p.mesh === platform);
        this.collidingPlatform.splice(this.collidingPlatform.indexOf(side), 1);
       
        console.log(side.side);

        if(side.side === "right") this.rightBlock = false;
        if(side.side === "left") this.leftBlock = false;
        

        
    }

    checkBorder() {
        const boundingInfo = this.mesh.getBoundingInfo();

        const characterRight = this.mesh.position.x + boundingInfo.boundingBox.minimum.x; // Gauche du personnage
        const characterLeft = this.mesh.position.x + boundingInfo.boundingBox.maximum.x; // Droite du personnage

        const borderRight = this.border.x / -2;
        const borderLeft = this.border.x / 2;

        if(characterRight <= borderRight) {
            this.mesh.position.x = borderRight - boundingInfo.boundingBox.minimum.x;
            this.rightBlock = true;
        }
        else if(characterLeft >= borderLeft) {
            this.mesh.position.x = borderLeft - boundingInfo.boundingBox.maximum.x;
            this.leftBlock = true;
        }
    }

    update(dt: number, input: CharacterInput) {
        this.checkBorder();
        this.move(dt, input);
    }
}