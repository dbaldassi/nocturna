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
            left: this.keys["a"] || this.keys["ArrowLeft"] || false,
            right: this.keys["d"] || this.keys["ArrowRight"] || false,
            forward: this.keys["w"] || this.keys["ArrowUp"] || false,
            backward: this.keys["s"] || this.keys["ArrowDown"] || false,
            dash: this.keys["Shift"] || false,
        };
    }
}