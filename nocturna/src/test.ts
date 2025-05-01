// DOM Elements
const menuScreen = document.getElementById("menu-screen") as HTMLElement;
const winScreen = document.getElementById("win-screen") as HTMLElement;
const gameOverScreen = document.getElementById("game-over-screen") as HTMLElement;
const winButton = document.getElementById("win-button") as HTMLButtonElement;
const gameOverButton = document.getElementById("game-over-button") as HTMLButtonElement;
const continueButton = document.getElementById("continue-button") as HTMLButtonElement;
const winMenuButton = document.getElementById("win-menu-button") as HTMLButtonElement;
const retryButton = document.getElementById("retry-button") as HTMLButtonElement;
const gameOverMenuButton = document.getElementById("game-over-menu-button") as HTMLButtonElement;
const finalScoreElement = document.getElementById("final-score") as HTMLElement;
const deathMessageElement = document.getElementById("death-message") as HTMLElement;
const starsContainer = document.getElementById("stars-container") as HTMLElement;

// Death messages for game over screen
const deathMessages: string[] = [
  "The darkness has consumed you...",
  "Your light has been extinguished...",
  "The night claims another soul...",
  "The shadows have overwhelmed you...",
  "Your journey ends here... for now...",
];


function showGameOverScreen(): void {
  hideAllScreens();
  gameOverScreen.classList.remove("hidden");
  setRandomDeathMessage();
}

function hideAllScreens(): void {
  menuScreen.classList.add("hidden");
  winScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
}

function setRandomDeathMessage(): void {
  const randomIndex = Math.floor(Math.random() * deathMessages.length);
  deathMessageElement.textContent = deathMessages[randomIndex];
}

// Initialize the game
document.addEventListener("DOMContentLoaded", () => {
  showMenuScreen();
});
