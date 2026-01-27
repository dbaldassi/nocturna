import { CookieManager } from "./CookieManager";
import { en } from "./en";
import { fr } from "./fr";

export class Translation {
    private language: typeof en | typeof fr = en;
    private static instance: Translation;

    public static initialize(): void {
        if (!Translation.instance) {
            Translation.instance = new Translation();
            Translation.instance.setLanguage(CookieManager.get("lang") || "en"); // Default language
        }
    }

    public static getTranslation(key: string): string {
        if (!Translation.instance) {
            Translation.initialize();
        }
        return Translation.instance.getTranslation(key);
    }

    public static getTranslationAny(key: string): any {
        if (!Translation.instance) {
            Translation.initialize();
        }
        return Translation.instance.getTranslationAny(key);
    }

    constructor() {
        const radios = document.querySelectorAll('input[name="language"]');
        radios.forEach((radio) => {
            // Set the initial checked state based on the current language
            const currentLanguage = CookieManager.get("lang") || "en";
            if (radio instanceof HTMLInputElement) {
                radio.checked = radio.value === currentLanguage;
            }
            radio.addEventListener("click", (event) => {
                console.log("Language change event triggered");
                const target = event.target as HTMLInputElement;
                if (target.checked) {
                    this.setLanguage(target.value);
                }
            });
        });
    }

    public setLanguage(language: string): void {
        if (language !== "fr" && language !== "en") {
            throw new Error("Unsupported language");
        }
        this.language = language === "fr" ? fr : en;
        CookieManager.set("lang", language);  
        this.updateLanguage();
    }

    public getTranslation(key: string): string {
        return this.language[key] || key;
    }

    public getTranslationAny(key: string): any {
        return this.language[key] || key;
    }

    public getLanguage(): string {
        return this.language === fr ? "fr" : "en";
    }

    public updateLanguage(): void {
        const elements: NodeListOf<HTMLElement> = document.querySelectorAll("[data-translate]");
        elements.forEach((element: HTMLElement) => {
            const key: string = element.getAttribute("data-translate") || "";
            if (key) {
                element.innerText = this.getTranslation(key);
            }
        });
    }

    /**
     * Formats a translation string by replacing {action} placeholders with actual key bindings.
     * Wraps each key in a <kbd> tag for styling.
     * @param key The translation key
     * @param keyBindings The key bindings object from InputHandler
     * @returns Formatted HTML string with key bindings
     */
    public static formatWithKeyBindings(key: string, keyBindings: { [action: string]: string[] }): string {
        if (!Translation.instance) {
            Translation.initialize();
        }
        let text = Translation.instance.getTranslation(key);
        
        // Replace {action} placeholders with actual key bindings
        const actionPattern = /\{(\w+)\}/g;
        text = text.replace(actionPattern, (match, action) => {
            const keys = keyBindings[action];
            if (keys && keys.length > 0) {
                // Format each key as a <kbd> element
                return keys.map(k => {
                    // Handle special keys for better display
                    let displayKey = k;
                    if (k === ' ') displayKey = 'Space';
                    else if (k === 'ArrowUp') displayKey = '↑';
                    else if (k === 'ArrowDown') displayKey = '↓';
                    else if (k === 'ArrowLeft') displayKey = '←';
                    else if (k === 'ArrowRight') displayKey = '→';
                    else displayKey = k.toUpperCase();
                    
                    return `<kbd>${displayKey}</kbd>`;
                }).join(' ');
            }
            return match; // Return original if action not found
        });
        
        return text;
    }
}