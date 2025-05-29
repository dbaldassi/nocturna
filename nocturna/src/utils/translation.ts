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
}