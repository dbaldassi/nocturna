import { InputHandler } from "./InputHandler";
import { Translation } from "./utils/translation";

/**
 * KeybindsManager manages the user interface for editing and displaying key bindings in the game.
 * 
 * Responsibilities:
 * - Opens and closes the keybinds modal dialog.
 * - Dynamically renders the list of key bindings and their current keys.
 * - Allows the user to change key bindings by listening for key presses.
 * - Integrates with the InputHandler to update and persist key bindings.
 * - Supports translation of action names for localization.
 * 
 * Usage:
 * - Instantiate with an InputHandler instance.
 * - The settings button (with id "settings-button") opens the keybinds modal.
 * - The modal (with id "keybinds-modal") displays all key bindings and allows editing.
 */
export class KeybindsManager {
    private inputHandler: InputHandler;
    private editingKeybinds: boolean = false;

    /**
     * Constructs a new KeybindsManager.
     * @param inputHandler The InputHandler instance to manage.
     */
    constructor(inputHandler: InputHandler) {
        this.inputHandler = inputHandler;
        this.initSettingsButton();
    }

    /**
     * Returns true if the user is currently editing key bindings.
     */
    public isEditingKeybinds(): boolean {
        return this.editingKeybinds;
    }

    /**
     * Initializes the settings button to open the keybinds modal when clicked.
     */
    private initSettingsButton() {
        const settingsButton = document.getElementById("settings-button");
        if (settingsButton) {
            settingsButton.addEventListener("click", () => this.openKeybindsModal());
        }
    }

    /**
     * Opens the keybinds modal, renders the keybind items, and sets up event listeners for editing.
     */
    private openKeybindsModal() {
        this.editingKeybinds = true;
        const modal = document.getElementById("keybinds-modal");
        if (!modal) return;

        // Render keybind items dynamically
        this.renderKeybindItems(modal);

        modal.classList.remove("hidden");

        modal.querySelector(".close-button")?.addEventListener("click", () => {
            modal.classList.add("hidden");
            this.editingKeybinds = false;
        });
        modal.querySelectorAll(".keybind-key").forEach((button) =>
            button.addEventListener("click", (event) => this.listenForKey(event))
        );
    }

    /**
     * Renders the list of key bindings in the modal.
     * @param modal The modal HTMLElement where key bindings are displayed.
     */
    public renderKeybindItems(modal: HTMLElement) {
        const keybindingsList = modal.querySelector(".keybindings-list");
        if (!keybindingsList) return;

        keybindingsList.innerHTML = Object.entries(this.inputHandler.getKeyBindings())
            .map(
                ([action, keys]) => `
                <div class="keybind-item">
                    <span class="keybind-action" data-translate="${action}">${Translation.getTranslation(action)}</span>
                    <button class="keybind-key" data-action="${action}">${keys.join(", ")}</button>
                </div>
            `
            )
            .join("");
    }

    /**
     * Listens for a key press to update the key binding for a specific action.
     * @param event The click event from the keybind button.
     */
    private listenForKey(event: Event) {
        const button = event.target as HTMLElement;
        const action = button.dataset.action;
        if (!action) return;

        event.stopPropagation(); // Prevent event bubbling
        button.textContent = "Press a key...";
        const keyListener = (e: KeyboardEvent) => {
            e.key.toLowerCase();
            this.inputHandler.updateKeyBindings(action, [e.key]);
            button.textContent = e.key;
            document.removeEventListener("keydown", keyListener);
        };
        document.addEventListener("keydown", keyListener);
    }
}
