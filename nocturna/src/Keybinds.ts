import { InputHandler } from "./InputHandler";

export class KeybindsManager {
    private inputHandler: InputHandler;
    private editingKeybinds: boolean = false;

    constructor(inputHandler: InputHandler) {
        this.inputHandler = inputHandler;
        this.initSettingsButton();
    }

    public isEditingKeybinds(): boolean {
        return this.editingKeybinds;
    }

    private initSettingsButton() {
        const settingsButton = document.getElementById("settings-button");
        if (settingsButton) {
            settingsButton.addEventListener("click", () => this.openKeybindsModal());
        }
    }

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

    private renderKeybindItems(modal: HTMLElement) {
        const keybindingsList = modal.querySelector(".keybindings-list");
        if (!keybindingsList) return;

        keybindingsList.innerHTML = Object.entries(this.inputHandler.getKeyBindings())
            .map(
                ([action, keys]) => `
                <div class="keybind-item">
                    <span class="keybind-action">${action}</span>
                    <button class="keybind-key" data-action="${action}">${keys.join(", ")}</button>
                </div>
            `
            )
            .join("");
    }

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
