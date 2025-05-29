

export class HpBar {
    private hpBar: HTMLElement = null;
    private hpBarContainer: HTMLElement = null;
    private maxHp: number = 0;

    constructor(maxHp: number) {
        this.maxHp = maxHp;

        this.hpBar = document.getElementById("hp-bar") as HTMLElement;
        this.hpBarContainer = document.getElementById("hp-bar-container") as HTMLElement;
        this.hpBar.classList.remove("hidden");
        this.hpBarContainer.classList.remove("hidden");
    }

    update(hp: number) {
        const percent = Math.max(0, Math.min(1, hp / this.maxHp));
        this.hpBar.style.width = `${percent * 100}%`;
    }

    dispose() {
        this.hpBar.classList.add("hidden");
        this.hpBarContainer.classList.add("hidden");
    }
}