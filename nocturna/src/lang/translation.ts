import { en } from "./en";
import { fr } from "./fr";

export class Translation {
    private language: typeof en | typeof fr = en;

    public setLanguage(language: string): void {
        if (language !== "fr" && language !== "en") {
            throw new Error("Unsupported language");
        }
        this.language = language === "fr" ? fr : en;
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