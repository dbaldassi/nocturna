// ========================= STATES =========================
// This section contains the implementation of the player's states,
// including JumpingState, MovingState, IdleState, FallingState, KnockbackState,
// PlayerDamageableState, and PlayerInvicibleState. Each state
// manages specific behaviors and transitions based on player input
// and interactions with the environment.
// ==========================================================

import { Color3, Color4, Animation, ParticleSystem, Texture, Vector3 } from "@babylonjs/core";
import { Player } from "../GameObjects/Player";
import { AbstractState, CharacterInput } from "../types";

/**
 * JumpingState handles the player's behavior while jumping or double-jumping.
 * - Allows for a double jump if the input is pressed again mid-air.
 * - Transitions to MovingState or IdleState when the player lands.
 */
class JumpingState implements AbstractState {
    public static readonly Type: string = "jumping";
    private player: Player;
    private doubleJumped: boolean = false;
    private canDoubleJump: boolean = false;

    constructor(player: Player) {
        this.player = player;
    }

    public enter(): void {
        this.player.playSound("jump");
    }
    public exit(): void {
        this.player.playSound("land");
    }
    public name(): string {
        return JumpingState.Type;
    }

    public update(dt: number, input: CharacterInput): AbstractState | null {
        this.player.move(dt, input);

        if(!this.doubleJumped && !this.canDoubleJump) {
            // Player must first release the jump button to allow double jump
            this.canDoubleJump = !input.jump;
        }

        if(input.jump && this.canDoubleJump) {
            this.player.jump();
            this.doubleJumped = true;
            this.canDoubleJump = false;
        }

        const isGrounded = this.player.isGrounded();
        const velocity = this.player.getMesh().physicsBody.getLinearVelocity().y;

        // check if velocity is less than 0, meaning the player is falling
        // This avoid detecting as grounded too soon (when starting the jump)
        if (isGrounded && velocity <= 0) {
            if (input.left || input.right) return new MovingState(this.player);
            else return new IdleState(this.player);
        }

        return null;
    }
}

/**
 * FallingState handles the player's behavior while falling (not jumping).
 * - Transitions to MovingState or IdleState when the player lands.
 */
class FallingState implements AbstractState {
    public static readonly Type: string = "falling";
    private player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    public enter(): void {
    }
    public exit(): void {
        this.player.playSound("land");
    }
    public name(): string {
        return FallingState.Type;
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

/**
 * MovingState handles the player's behavior while moving on the ground.
 * - Plays movement sounds at intervals.
 * - Transitions to JumpingState if jump is pressed, IdleState if no movement, or FallingState if not grounded.
 */
class MovingState implements AbstractState {
    public static readonly Type: string = "moving";
    private player: Player;
    private currentSoundTime: number = 0;
    private soundInterval: number = 150; // Interval in milliseconds to play sound

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
            return new FallingState(this.player);
        }

        this.player.move(dt, input);

        if(this.currentSoundTime >= this.soundInterval) {
            this.currentSoundTime = 0;
        }
        if(this.currentSoundTime === 0) {
            this.player.playSound("move");
        }
        this.currentSoundTime += dt;

        return null;
    }
}

/**
 * IdleState handles the player's behavior when standing still on the ground.
 * - Stops horizontal movement.
 * - Transitions to JumpingState, MovingState, or FallingState based on input and grounded state.
 */
export class IdleState implements AbstractState {
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
        else if (!this.player.isGrounded()) {
            return new FallingState(this.player);
        }

        return null;
    }
}

/**
 * KnockbackState handles the player's behavior when knocked back (e.g., after taking damage).
 * - Disables player control for a short duration.
 * - Transitions to IdleState or MovingState after the knockback timer expires.
 */
export class KnockbackState implements AbstractState {
    private player: Player;
    private timer: number;

    constructor(player: Player, duration: number = 200) {
        this.player = player;
        this.timer = duration;
    }

    public enter(): void {
        // Optionnel : animation de stun/knockback
    }

    public exit(): void {
        // Optionnel : fin de l'animation
    }

    public name(): string {
        return "knockback";
    }

    public update(dt: number, input: CharacterInput): AbstractState | null {
        this.timer -= dt;
        // Pendant le knockback, on ne contrôle pas le joueur
        if (this.timer <= 0) {
            // Retour à Idle ou Moving selon l'input
            if (input.left || input.right) return new MovingState(this.player);
            return new IdleState(this.player);
        }
        return null;
    }
}

/**
 * PlayerDamageState is an interface for player states that can handle taking damage.
 */
export interface PlayerDamageState extends AbstractState {
    takeDamage(damage: number): void;
}

/**
 * PlayerDamageableState allows the player to take damage.
 * - Calls the player's damage logic and transitions to PlayerInvicibleState after being hit.
 */
export class PlayerDamageableState implements PlayerDamageState {
    private player: Player;
    private damaged: boolean = false;

    constructor(player: Player) {
        this.player = player;
        this.damaged = false; // Reset damaged state
    }

    public enter(): void {
        // Set damageable state animation if needed
    }
    public exit(): void {
        // Stop damageable state animation if needed
    }
    public name(): string {
        return "damageable";
    }

    public takeDamage(damage: number): void {
        this.player.doTakeDamage(damage);
        this.damaged = true; // Set damaged state
    }

    public update(_: number, __: CharacterInput): PlayerDamageState | null {
        if(this.damaged) return new PlayerInvicibleState(this.player);
        return null;
    }
}

/**
 * PlayerInvicibleState makes the player temporarily invincible after taking damage.
 * - Flickers the player's mesh for a set duration.
 * - Ignores further damage during this state.
 * - Transitions back to PlayerDamageableState after the invincibility period.
 */
export class PlayerInvicibleState implements PlayerDamageState {
    private player: Player;
    private readonly invincibleDuration: number = 1000; // Duration of invincibility in milliseconds
    private elapsedTime: number = 0;
    private originalEmissiveColors: Color3[] = [];

    constructor(player: Player) {
        this.player = player;
    }

    public enter(): void {
        // Set invincible state animation if needed

        this.originalEmissiveColors = [];
        this.player.getMeshes().forEach(mesh => {
            const mat = mesh.material as any;
            if (mat && mat.emissiveColor) {
                this.originalEmissiveColors.push(mat.emissiveColor.clone());
                mat.emissiveColor = Color3.Red(); // Red
            } else {
                this.originalEmissiveColors.push(null);
            }
        });
    }
    public exit(): void {
        // Stop invincible state animation if needed
        this.player.getMeshes().forEach(mesh => {
            mesh.isVisible = true; // Ensure visibility is restored
        });

        this.player.getMeshes().forEach((mesh, i) => {
            const mat = mesh.material as any;
            if (mat && mat.emissiveColor && this.originalEmissiveColors[i]) {
                mat.emissiveColor = this.originalEmissiveColors[i];
            }
            mesh.isVisible = true;
        });
    }
    public name(): string {
        return "invincible";
    }

    public takeDamage(_: number): void {
        // Do nothing, player is invincible
    }

    public update(dt: number, _: CharacterInput): PlayerDamageState | null {
        this.elapsedTime += dt;

        if (this.elapsedTime >= this.invincibleDuration) {
            return new PlayerDamageableState(this.player);
        }

        this.player.getMeshes().forEach(mesh => {
            // Toggle visibility to create a flickering effect
            mesh.isVisible = !mesh.isVisible;
        });

        return null;
    }
}