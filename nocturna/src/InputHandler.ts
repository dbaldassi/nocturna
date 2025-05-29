import { CharacterInput } from "./types";
import { KeybindsManager } from "./Keybinds";
import { QWERTY } from "./utils/en";
import { AZERTY } from "./utils/fr";
import { CookieManager } from "./utils/CookieManager";

/**
 * InputHandler manages keyboard input and key bindings for the game.
 * 
 * Responsibilities:
 * - Tracks the state of all relevant keys and maps them to game actions.
 * - Supports customizable key bindings and keyboard presets (QWERTY/AZERTY).
 * - Handles action callbacks for specific keys (e.g., camera switch, save, delete).
 * - Integrates with a KeybindsManager for UI and editing key bindings.
 * - Persists key bindings and presets using cookies.
 * - Provides methods to pause/resume input handling (e.g., during menus or overlays).
 * - Implements the singleton pattern to ensure a single input handler instance.
 * 
 * Usage:
 * - Use `InputHandler.getInstance()` to access the handler.
 * - Register actions with `addAction`.
 * - Query input state with `getInput`.
 */
export class InputHandler {
    private isPaused: boolean = false;
    private keys: { [key: string]: boolean } = {};
    private keyBindings: { [action: string]: string[] } = {
        left: ["a"],
        right: ["d"],
        up: ["w"],
        down: ["s"],
        rotate_left_x: ["x"],
        rotate_right_x: ["c"],
        rotate_left_y: ["y"],
        rotate_right_y: ["u"],
        rotate_left_z: ["h"],
        rotate_right_z: ["j"],
        pov: ["p"],
        jump: [" "],
        action_1: ["1"],
        action_2: ["2"],
        action_3: ["3"],
        action_4: ["4"],
        action_5: ["5"],
        action_6: ["6"],
        action_7: ["7"],
        action_8: ["8"],
        action_9: ["9"],
        action_0: ["0"],
        action_minus: ["-"],
        action_plus: ["+"],
        action_multi: ["m"],
        save: ["Enter"],
        delete: ["Backspace"],
        clone: ["f"],
        forward: ["q"],
        backward: ["e"],
    };
    private keybindManager: KeybindsManager;
    // Stores actions, which call a function when the key is pressed
    private actions: { [key: string]: () => void } = {};

    // Singleton instance
    private static instance: InputHandler;
    /**
     * Returns the singleton instance of InputHandler.
     */
    public static getInstance(): InputHandler {
        if (!InputHandler.instance) {
            InputHandler.instance = new InputHandler();
        }
        return InputHandler.instance;
    }

    /**
     * Private constructor. Initializes key bindings, loads presets from cookies, and sets up event listeners.
     */
    private constructor() {
        this.keybindManager = new KeybindsManager(this);

        window.addEventListener("keydown", (event) => {
            if (this.isPaused) return;
            if (!this.keybindManager.isEditingKeybinds()) {
                // Iterate through actions and call the function if the key is pressed
                if (!this.keys[event.key]) {
                    this.keys[event.key] = true;
                    this.run_actions();
                }
                else this.keys[event.key] = true;
            }
        });

        window.addEventListener("keyup", (event) => {
            if (this.isPaused) return;
            if (!this.keybindManager.isEditingKeybinds()) {
                this.keys[event.key] = false;
            }
        });

        // Load preset from cookies if available
        const savedPreset = CookieManager.get("keypreset");
        if (savedPreset) {
            this.setPreset(savedPreset);

            // Visually check the correct radio button for the preset
            const radios = document.querySelectorAll('input[name="keybind-preset"]');
            radios.forEach((radio) => {
                if ((radio as HTMLInputElement).value.toUpperCase() === savedPreset.toUpperCase()) {
                    (radio as HTMLInputElement).checked = true;
                }
            });
        }
        
        // Listen for preset changes via radio buttons
        const radios = document.querySelectorAll('input[name="keybind-preset"]');
        radios.forEach((radio) => {
            radio.addEventListener("click", (event) => {
                if (this.isPaused) return;
                const target = event.target as HTMLInputElement;
                if (target.checked) {
                    this.setPreset(target.value);
                    CookieManager.set("keybindings", "", -1);
                    CookieManager.set("keypreset", target.value); // Save the selected preset in cookies
                }
            });
        });

        // Load custom key bindings from cookies if available
        const savedKeybinds = CookieManager.get("keybindings");
        if (savedKeybinds) {
            try {
                this.keyBindings = JSON.parse(savedKeybinds);
            } catch (e) {
                console.warn("Failed to parse saved keybindings:", e);
            }
        }
    }

    /**
     * Registers an action callback for a given key action.
     * @param key The action name (e.g., "pov", "save").
     * @param action The callback function to execute.
     */
    public addAction(key: string, action: () => void) {
        if (this.keyBindings[key] === undefined) {
            console.warn(`Key "${key}" is not bound to any action.`);
            return;
        }
        this.actions[key] = action;
    }

    /**
     * Removes a registered action callback.
     * @param key The action name.
     */
    public removeAction(key: string) {
        if (this.actions[key]) {
            delete this.actions[key];
        } else {
            console.warn(`Action "${key}" does not exist.`);
        }
    }

    /**
     * Removes all registered action callbacks.
     */
    public removeAllActions() {
        for (const key in this.actions) {
            delete this.actions[key];
        }
        this.actions = {};
    }

    /**
     * Executes all registered actions whose keys are currently pressed.
     */
    public run_actions() {
        for (const key in this.actions) {
            if (this.isKeyPressed(key)) {
                this.actions[key]();
            }
        }
    }

    /**
     * Returns the current input state for character movement and actions.
     */
    getInput(): CharacterInput {
        const input = {
            left: this.isKeyPressed("left"),
            right: this.isKeyPressed("right"),
            up: this.isKeyPressed("up"),
            down: this.isKeyPressed("down"),
            jump: this.isKeyPressed("jump"),
            forward: this.isKeyPressed("forward"),
            backward: this.isKeyPressed("backward"),
        };
        return input;
    }

    /**
     * Checks if a given action's key is currently pressed.
     * @param action The action name.
     * @returns True if any key bound to the action is pressed.
     */
    private isKeyPressed(action: string): boolean {
        return this.keyBindings[action]?.some((key) => this.keys[key]) || false;
    }

    /**
     * Updates the key bindings for a specific action and saves to cookies.
     * @param action The action name.
     * @param newKeys The new key(s) to bind.
     */
    updateKeyBindings(action: string, newKeys: string[]) {
        if (this.keyBindings[action]) {
            this.keyBindings[action] = newKeys;
            CookieManager.set("keybindings", JSON.stringify(this.keyBindings));
        } else {
            console.warn(`Action "${action}" does not exist in key bindings.`);
        }
    }

    /**
     * Returns the current key bindings.
     */
    getKeyBindings(): { [action: string]: string[] } {
        return this.keyBindings;
    }

    /**
     * Sets the keyboard preset (QWERTY or AZERTY).
     * @param presetName The preset name.
     */
    public setPreset(presetName: string): void {
        presetName = presetName.toUpperCase();
        if (presetName === "QWERTY") {
            this.applyPreset(QWERTY);
        } else if (presetName === "AZERTY") {
            this.applyPreset(AZERTY);
        } else {
            console.warn(`Preset "${presetName}" is not recognized.`);
        }
    }

    /**
     * Applies a given preset to the key bindings and updates the UI.
     * @param preset The preset object.
     */
    private applyPreset(preset: typeof QWERTY | typeof AZERTY): void {
        for (const action in preset) {
            if (this.keyBindings[action]) {
                this.keyBindings[action] = preset[action];
            } else {
                console.warn(`Action "${action}" does not exist in key bindings.`);
            }
        }
        // Update the keybinds manager to reflect the new bindings
        this.keybindManager.renderKeybindItems(document.getElementById("keybinds-modal") as HTMLElement);
    }

    /**
     * Pauses input handling (e.g., when a menu is open).
     */
    public onPause(): void {
        this.isPaused = true;
    }

    /**
     * Resumes input handling.
     */
    public onResume(): void {
        this.isPaused = false;
    }

    /**
     * Returns the display name for the first key bound to an action.
     * @param key The action name.
     * @returns The key name or the action name if not found.
     */
    public getKeyName(key: string): string {
        return this.keyBindings[key]?.[0] || key;
    }
}