import { CharacterInput } from "./types";

export class InputHandler {
    private keys: { [key: string]: boolean } = {};

    

    constructor() {
        console.log("Create CHARATER INPUT HANDLER");

        window.addEventListener("keydown", (event) => {
            this.keys[event.key] = true;
        });

        window.addEventListener("keyup", (event) => {
            this.keys[event.key] = false;
        });
    }

    getInput(): CharacterInput {
        return {
            left: this.keys["q"] || this.keys["ArrowLeft"],
            right: this.keys["d"] || this.keys["ArrowRight"],
            jump: this.keys[" "] || this.keys["ArrowUp"],
        };
    }
}