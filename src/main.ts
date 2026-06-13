import "./style.css";
import { startGame } from "./game";
import { loadSprites } from "./sprites";

const canvas = document.querySelector("#game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

if (!ctx) {
    throw new Error("Could not get canvas context");
}

const sprites = await loadSprites();
await document.fonts.load('14px "IBM EGA 8x14"');

ctx.imageSmoothingEnabled = false;
ctx.scale(2, 2);
ctx.font = '14px "IBM EGA 8x14"';
ctx.textBaseline = "top";

await startGame(ctx, sprites, "Player 1", "Player 2", 3);
