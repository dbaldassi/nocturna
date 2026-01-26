import { AxisSelectionObserver } from "../ParentNode";
import { InputHandler } from "../InputHandler";

/**
 * AxisSelector displays the currently selected rotation axis in the bottom-left corner of the screen.
 * 
 * Responsibilities:
 * - Shows the current axis (X, Y, or Z) that will be rotated.
 * - Displays the key binding for selecting the axis.
 * - Updates when the axis changes through the ParentNode observer pattern.
 * - Manages its own HTML elements and lifecycle.
 */
export class AxisSelector implements AxisSelectionObserver {
    private container: HTMLElement;
    private axisLabel: HTMLElement;
    private keyLabel: HTMLElement;
    private inputHandler: InputHandler;

    /**
     * Constructs a new AxisSelector.
     * @param initialAxis The initial axis to display.
     * @param inputHandler The InputHandler instance to get key bindings.
     */
    constructor(initialAxis: "x" | "y" | "z", inputHandler: InputHandler) {
        this.inputHandler = inputHandler;
        this.createElements();
        this.updateAxis(initialAxis);
    }

    /**
     * Creates the HTML elements for the axis selector.
     */
    private createElements(): void {
        // Main container
        this.container = document.createElement("div");
        this.container.id = "axis-selector";
        this.container.style.position = "fixed";
        this.container.style.bottom = "30px";
        this.container.style.left = "30px";
        this.container.style.zIndex = "1000";
        this.container.style.display = "flex";
        this.container.style.flexDirection = "column";
        this.container.style.alignItems = "flex-start";
        this.container.style.gap = "4px";
        this.container.style.padding = "12px 16px";
        this.container.style.background = "rgba(34, 34, 34, 0.92)";
        this.container.style.borderRadius = "12px";
        this.container.style.fontFamily = "'Exo 2', sans-serif";
        this.container.style.color = "white";
        this.container.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";

        // Axis label
        this.axisLabel = document.createElement("div");
        this.axisLabel.style.fontSize = "18px";
        this.axisLabel.style.fontWeight = "700";
        this.axisLabel.style.letterSpacing = "0.5px";
        this.container.appendChild(this.axisLabel);

        // Key binding info
        this.keyLabel = document.createElement("div");
        this.keyLabel.style.fontSize = "12px";
        this.keyLabel.style.color = "rgba(255, 255, 255, 0.7)";
        this.keyLabel.style.fontWeight = "400";
        this.container.appendChild(this.keyLabel);

        document.body.appendChild(this.container);
    }

    /**
     * Updates the displayed axis.
     * @param axis The new axis to display.
     */
    private updateAxis(axis: "x" | "y" | "z"): void {
        const axisNames = {
            x: "Axe X",
            y: "Axe Y",
            z: "Axe Z"
        };
        
        const axisColors = {
            x: "#ff6b6b",
            y: "#4ecdc4",
            z: "#95e1d3"
        };

        this.axisLabel.textContent = `Axe: ${axisNames[axis]}`;
        this.axisLabel.style.color = axisColors[axis];

        const selectKey = this.inputHandler.getKeyName("select_axis").toUpperCase();
        this.keyLabel.textContent = `Changer: ${selectKey}`;
    }

    /**
     * Callback for when the axis changes in the ParentNode.
     * @param axis The new selected axis.
     */
    public onAxisChange(axis: "x" | "y" | "z"): void {
        this.updateAxis(axis);
    }

    /**
     * Shows the axis selector.
     */
    public show(): void {
        this.container.style.display = "flex";
    }

    /**
     * Hides the axis selector.
     */
    public hide(): void {
        this.container.style.display = "none";
    }

    /**
     * Disposes the axis selector and removes it from the DOM.
     */
    public dispose(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
