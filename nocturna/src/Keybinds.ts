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
        const modal = document.createElement("div");
        modal.className = "keybinds-modal";
        modal.innerHTML = `
            <div class="keybinds-content">
                <div class="keybinds-header">
                    <h2>Keybinds</h2>
                    <button class="close-button">&times;</button>
                </div>
                <div class="keybindings-list">
                    ${Object.entries(this.inputHandler.getKeyBindings())
                .map(
                    ([action, keys]) => `
                        <div class="keybind-item">
                            <span class="keybind-action">${action}</span>
                            <button class="keybind-key" data-action="${action}">${keys.join(", ")}</button>
                        </div>
                    `
                )
                .join("")}
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector(".close-button")?.addEventListener("click", () => {
            modal.remove();
            this.editingKeybinds = false;
        });
        modal.querySelectorAll(".keybind-key").forEach((button) =>
            button.addEventListener("click", (event) => this.listenForKey(event))
        );
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
