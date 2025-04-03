import { GameEngine } from './game/GameEngine';

const gameEngine = new GameEngine();

function startGame() {
    gameEngine.start();
}

startGame();