import { Mesh, MeshBuilder, Scene, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";
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
    public mesh: Mesh;

    constructor(initialPosition: Vector3, scene: Scene) {

        this.mesh = MeshBuilder.CreateBox("character", { size: 2 }, scene);
        this.mesh.position = initialPosition;

        const material = new StandardMaterial("characterMaterial", scene);
        material.diffuseColor = new Color3(1, 0, 0); // Rouge
        this.mesh.material = material;

        // this.position = initialPosition;
        this.velocity = new Vector3(0, 0, 0);
        this.speed = 10;
        this.jumpForce = 10;
        this.jumpDuration = 1; // Durée du saut
        this.isJumping = false;
    }

    /*jump(dt: number) {
        this.jumpTime += dt / 1000; // Increment jump time

        if (!this.isJumping) {
            this.isJumping = true;
            this.jumpTime = 0;
        } else if(this.mesh.position.y <= 1) {
            this.isJumping = false;
            this.jumpTime = 0;
            this.mesh.position.y = 1; // Reset position to ground level
        }
  
        const g = (-1/2 * 9.8 * this.jumpTime * this.jumpTime) + (1/2 * 9.8 * this.jumpForce * this.jumpTime) + 1;
        this.mesh.position.y = g; // Apply gravity
        // console.log(this.mesh.position.y);
    }*/

    move(dt: number, input: CharacterInput) {
        // Handle input
        const direction = new Vector3(0, 0, 0);
        direction.x -= input.right && !this.rightBlock ? 1 : 0;
        direction.x += input.left && !this.leftBlock ? 1 : 0;
        direction.x *= this.speed * (dt/1000); 

        // Normalize direction vector
        /*if (direction.length() > 0) {
            direction.normalize();
        }*/
        // Move character
        // this.move(direction);
        this.mesh.position.addInPlace(direction)
    }

    onPlatformEnter(platform: Mesh) {
        const characterMinY = this.mesh.position.y - 0.8; // Bas du personnage
        const characterMaxY = this.mesh.position.y + 0.8; // Haut du personnage

        const platformMinY = platform.position.y - 0.2; // Bas de la plateforme
        const platformMaxY = platform.position.y + 0.2; // Haut de la plateforme

        const characterMinX = this.mesh.position.x - 0.8; // Gauche du personnage
        const characterMaxX = this.mesh.position.x + 0.8; // Droite du personnage
        const platformMinX = platform.position.x - 2.2; // Gauche de la plateforme
        const platformMaxX = platform.position.x + 2.2; // Droite de la plateforme

        const isAbovePlatform = characterMinY >= platformMaxY; // Le personnage est au-dessus de la plateforme
        const isBelowPlatform = characterMaxY <= platformMinY; // Le personnage est en dessous de la plateforme

        const isOnLeftSide = characterMaxX <= platformMinX; // Le personnage est à gauche de la plateforme
        const isOnRightSide = characterMinX >= platformMaxX; // Le personnage est à droite de la plateforme

        const p_side = new PlatformSide();
        p_side.mesh = platform;

        if(isAbovePlatform) {
            console.log("Above platform");
            this.isOnGround = true;
            this.velocity.y = 0; // Arrêter la gravité
            this.mesh.position.y = platformMaxY + 1; // Rester sur la plateforme
            p_side.side = "top";
        }
        else if(isOnLeftSide) {
            this.leftBlock = true;
            p_side.side = "left";
        }
        else if(isOnRightSide) {
            this.rightBlock = true;
            p_side.side = "right";
            }
        else if(isBelowPlatform) {
            this.velocity.y = 0; // Arrêter la gravité
            p_side.side = "bottom";
        }  
        

         
         this.collidingPlatform.push(p_side);
    }

    onPlatformExit(platform: Mesh) {
        const side = this.collidingPlatform.find(p => p.mesh === platform);
        this.collidingPlatform.splice(this.collidingPlatform.indexOf(side), 1);
       
        console.log(side.side);

        if(side.side === "top") this.isOnGround = false;
            // this.isOnGround = false;
        if(side.side === "right") this.rightBlock = false;
        if(side.side === "left") this.leftBlock = false;
        

        
    }

    jump(dt: number) {
        this.velocity.y = this.jumpForce; // Appliquer une force initiale vers le haut
        this.isOnGround = false;
        this.mesh.position.y += this.velocity.y * (dt / 1000);
    }

    simulateGravity(dt: number) {
        const gravity = -9.8; // Accélération due à la gravité

        if (!this.isOnGround) {
            this.velocity.y += 2* gravity * (dt / 1000); // Augmenter la vitesse verticale avec la gravité
        }

        if (this.mesh.position.y <= 1) { // Si le personnage touche le sol
            this.isOnGround = true;
            this.velocity.y = 0; // Arrêter la gravité
            this.mesh.position.y = 1; // Rester sur le sol
        } 

        this.mesh.position.y += this.velocity.y * (dt / 1000);
    }

    update(dt: number, input: CharacterInput) {
        this.move(dt, input);
        this.simulateGravity(dt);
        
        if (input.jump && this.isOnGround) this.jump(dt);
    }
}