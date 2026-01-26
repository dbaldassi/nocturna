import { AxisSelectionObserver } from "../ParentNode";
import { InputHandler } from "../InputHandler";
import { Translation } from "../utils/translation";

/**
 * AxisSelector displays the currently selected rotation axis in the bottom-left corner of the screen.
 * 
 * Responsibilities:
 * - Shows the current axis (X, Y, or Z) that will be rotated.
 * - Displays the key binding for selecting the axis.
 * - Updates when the axis changes through the ParentNode observer pattern.
 * - Manages its own HTML elements and lifecycle.
 * - Supports internationalization through the Translation system.
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
        this.container.style.flexDirection = "row";
        this.container.style.alignItems = "center";
        this.container.style.gap = "12px";
        this.container.style.padding = "12px 16px";
        this.container.style.background = "rgba(34, 34, 34, 0.92)";
        this.container.style.borderRadius = "12px";
        this.container.style.fontFamily = "'Exo 2', sans-serif";
        this.container.style.color = "white";
        this.container.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";

        // Left section: Axis selection with arrows
        const axisSection = document.createElement("div");
        axisSection.style.display = "flex";
        axisSection.style.flexDirection = "column";
        axisSection.style.alignItems = "center";
        axisSection.style.gap = "4px";

        // Up arrow for next axis
        const upArrow = document.createElement("div");
        upArrow.textContent = "▲";
        upArrow.style.fontSize = "12px";
        upArrow.style.color = "rgba(255, 255, 255, 0.5)";
        upArrow.style.lineHeight = "1";
        axisSection.appendChild(upArrow);

        // Axis label
        this.axisLabel = document.createElement("div");
        this.axisLabel.style.fontSize = "18px";
        this.axisLabel.style.fontWeight = "700";
        this.axisLabel.style.letterSpacing = "0.5px";
        axisSection.appendChild(this.axisLabel);

        // Down arrow for previous axis
        const downArrow = document.createElement("div");
        downArrow.textContent = "▼";
        downArrow.style.fontSize = "12px";
        downArrow.style.color = "rgba(255, 255, 255, 0.5)";
        downArrow.style.lineHeight = "1";
        axisSection.appendChild(downArrow);

        this.container.appendChild(axisSection);

        // Divider
        const divider = document.createElement("div");
        divider.style.width = "1px";
        divider.style.height = "40px";
        divider.style.background = "rgba(255, 255, 255, 0.2)";
        this.container.appendChild(divider);

        // Right section: Rotation with arrows
        const rotateSection = document.createElement("div");
        rotateSection.style.display = "flex";
        rotateSection.style.flexDirection = "row";
        rotateSection.style.alignItems = "center";
        rotateSection.style.gap = "8px";

        // Left arrow for rotate left
        const leftArrow = document.createElement("div");
        leftArrow.textContent = "◄";
        leftArrow.style.fontSize = "14px";
        leftArrow.style.color = "rgba(255, 255, 255, 0.5)";
        rotateSection.appendChild(leftArrow);

        // Key label for rotation
        this.keyLabel = document.createElement("div");
        this.keyLabel.style.fontSize = "12px";
        this.keyLabel.style.color = "rgba(255, 255, 255, 0.7)";
        this.keyLabel.style.fontWeight = "400";
        this.keyLabel.style.textAlign = "center";
        rotateSection.appendChild(this.keyLabel);

        // Right arrow for rotate right
        const rightArrow = document.createElement("div");
        rightArrow.textContent = "►";
        rightArrow.style.fontSize = "14px";
        rightArrow.style.color = "rgba(255, 255, 255, 0.5)";
        rotateSection.appendChild(rightArrow);

        this.container.appendChild(rotateSection);

        document.body.appendChild(this.container);
    }

    /**
     * Updates the displayed axis.
     * @param axis The new axis to display.
     */
    private updateAxis(axis: "x" | "y" | "z"): void {
        const axisTranslations = {
            x: Translation.getTranslation("axis.x"),
            y: Translation.getTranslation("axis.y"),
            z: Translation.getTranslation("axis.z")
        };
        
        const axisColors = {
            x: "#ff6b6b",
            y: "#4ecdc4",
            z: "#95e1d3"
        };

        this.axisLabel.textContent = `${axisTranslations[axis]}`;
        this.axisLabel.style.color = axisColors[axis];

        const rotateLabel = Translation.getTranslation("axis.rotate");
        this.keyLabel.textContent = rotateLabel;
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
