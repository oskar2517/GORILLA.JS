import "./style.css";
import img_gorilla_arms_down from "./assets/gorilla.png";

const spr_gorilla_arms_down = await loadImage(img_gorilla_arms_down);

const SCREEN_WIDTH = 640;
const SCREEN_HEIGHT = 350;

const COLOR_SKY = "#0000AA";
const COLOR_WINDOW_LIT = "#FFFF55";
const COLOR_WINDOW_DARK = "#555555";
const COLOR_BUILDINGS = [
    "#AA0000",
    "#AAAAAA",
    "#00AAAA"
];
const SCREEN_WIND_ARROW = "#FF0055";

interface Point {
    x: number;
    y: number;
}

interface Gorilla {
    x: number;
    y: number;
}

let wind: number;
let players = [] as Gorilla[];

async function loadImage(url: string): Promise<HTMLImageElement> {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
}


function randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function drawBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    /**
     * NOTE: The original game draws an outline of the building in the background color first.
     * This outline is exactly one pixel taller and wider than the original building.
     * This might have been done to ensure a gap between building, however, it was unncessary
     * given the fact that the x counter is incremented with width + 2 anyway.
     */
    ctx.fillStyle = COLOR_BUILDINGS[randomNumber(0, COLOR_BUILDINGS.length - 1)];
    ctx.fillRect(x, y, width, height);

    for (let windowX = x + 3; windowX < x + width - 3; windowX += 10) {
        for (let windowY = 3; windowY < height - 7; windowY += 15) {
            const color = randomNumber(1, 4) === 1 ? COLOR_WINDOW_DARK : COLOR_WINDOW_LIT;

            ctx.fillStyle = color;
            ctx.fillRect(windowX, y + windowY, 3, 6);
        }
    }
}

function drawWind(ctx: CanvasRenderingContext2D): void {
    if (wind === 0) return;

    const arrowLength = wind * 3 * Math.floor((SCREEN_WIDTH / 320));

    const lineX = Math.floor(SCREEN_WIDTH / 2);
    const lineY = SCREEN_HEIGHT - 5;

    ctx.strokeStyle = SCREEN_WIND_ARROW;
    ctx.lineWidth = 1;
    ctx.moveTo(lineX, lineY);
    ctx.lineTo(lineX + arrowLength, lineY);

    const arrowDirection = wind > 0 ? -2 : 2;
    ctx.moveTo(lineX + arrowLength, lineY);
    ctx.lineTo(lineX + arrowLength + arrowDirection, lineY - 2);
    ctx.moveTo(lineX + arrowLength, lineY);
    ctx.lineTo(lineX + arrowLength + arrowDirection, lineY + 2);

    ctx.stroke();
}

function generateLevel(ctx: CanvasRenderingContext2D): Point[] {
    ctx.fillStyle = COLOR_SKY;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    let slope = randomNumber(1, 6);
    let newHeight: number;

    if (slope === 1) {
        newHeight = 15;
    } else if (slope === 2) {
        newHeight = 130;
    } else if (slope >= 3 && slope <= 5) {
        newHeight = 15;
    } else {
        newHeight = 130;
    }

    const bottom = SCREEN_HEIGHT - 15;
    const heightStep = 10;

    const buildings = new Array<Point>();

    let x = 2;
    /**
     * NOTE: The original loop is LOOP UNTIL x > ScrWidth - HtInc. This is
     * confusing and likely an implementation mistake. The vertical heightStep
     * is reused as the minimum horizontal space required for another building.
     * This can result in a relatively wide gap after the last building. 
     */
    while (x <= SCREEN_WIDTH - heightStep) {
        /**
         * NOTE: In the original source code, this if-statement contained an
         * additional case for slope == 4. This was intended to create an
         * inverted V slope. However, this code was unreachable as slope == 4
         * was already handled by the previous condition slope >= 3 && slope <= 5.
         */
        if (slope === 1) {
            newHeight += heightStep;
        } else if (slope === 2) {
            newHeight -= heightStep;
        } else if (slope >= 3 && slope <= 5) {
            if (x > SCREEN_WIDTH / 2) {
                newHeight -= 2 * heightStep;
            } else {
                newHeight += 2 * heightStep;
            }
        }

        let width = randomNumber(1, 37) + 37;
        if (x + width > SCREEN_WIDTH) {
            width = SCREEN_WIDTH - x - 2;
        }

        let height = randomNumber(heightStep, 120) + newHeight;

        /**
         * NOTE: In the original source code, there was the following if statement:
         * IF BottomLine - BHeight <= MaxHeight + GHeight THEN BHeight = MaxHeight + GHeight - 5
         * The idea was to ensure there is always enough space above a building for a gorilla.
         * However, this did not work correctly for three reasons:
         * 1. MaxHeight was undefined and defaulted to 0.
         * 2. The logic is off. Instead of ensuring just enough space, a tiny building of height 
         *    20 would be created (gorilla_height - 5)
         * 3. The condition can never be met anyway necause height is capped low enough to
         *    prevent this edge case.
         */

        buildings.push({
            x,
            y: bottom - height
        });

        drawBuilding(ctx, x, bottom - height, width, height);

        x += width + 2;
    }

    wind = randomNumber(1, 10) - 5;
    if (randomNumber(1, 3) === 1) {
        if (wind > 0) {
            wind += randomNumber(1, 10);
        } else {
            wind -= randomNumber(1, 10);
        }
    }

    drawWind(ctx);

    return buildings;
}

function drawSprite(ctx: CanvasRenderingContext2D, sprite: HTMLImageElement, x: number, y: number): void {

    ctx.drawImage(sprite, x, y);

}

function placeGorillas(ctx: CanvasRenderingContext2D, buildings: Point[]): void {
    const xAdjust = 14;
    const yAdjust = 30;

    for (let player = 0; player < 2; player++) {
        const offset = randomNumber(1, 2);
        const buildingIndex = player == 0 ? offset : buildings.length - 1 - offset;

        /**
         * NOTE: The building gap is included in the width calculation.
         */
        const width =
            buildings[buildingIndex + 1].x -
            buildings[buildingIndex].x;

        const x = buildings[buildingIndex].x + Math.floor(width / 2) - xAdjust;
        const y = buildings[buildingIndex].y - yAdjust;

        players[player] = { x, y };

        drawSprite(ctx, spr_gorilla_arms_down, x, y);
    }
}

const canvas = document.querySelector("#game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

if (!ctx) {
    throw new Error("Could not get Canvas context");
}

ctx.imageSmoothingEnabled = false;

const buildings = generateLevel(ctx);
placeGorillas(ctx, buildings);
