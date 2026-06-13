import "./style.css";
import img_gorilla_arms_down from "./assets/gorilla.png";
import img_gorilla_left_arm_up from "./assets/gorilla_left_arm_up.png";
import img_gorilla_right_arm_up from "./assets/gorilla_right_arm_up.png";
import img_banana_left from "./assets/banana_left.png";
import img_banana_right from "./assets/banana_right.png";
import img_banana_up from "./assets/banana_up.png";
import img_banana_down from "./assets/banana_down.png";

const spr_gorilla_arms_down = await loadImage(img_gorilla_arms_down);
const spr_gorilla_left_arm_up = await loadImage(img_gorilla_left_arm_up);
const spr_gorilla_right_arm_up = await loadImage(img_gorilla_right_arm_up);
const spr_banana_left = await loadImage(img_banana_left);
const spr_banana_right = await loadImage(img_banana_right);
const spr_banana_up = await loadImage(img_banana_up);
const spr_banana_down = await loadImage(img_banana_down);

const banana_sprites = [
    spr_banana_left,
    spr_banana_up,
    spr_banana_down,
    spr_banana_right
];

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
const COLOR_WIND_ARROW = "#FF0055";
const COLOR_WHITE = "#FFFFFF";
const COLOR_GORILLA = "#FFAA55";
const COLOR_BANANA = "#FFFF55";
const COLOR_EXPLOSION = "#FF0055";
const COLOR_EXPLOSION_CYCLE = [
    "#FFAA55",
    "#FF0055"
];

const TEXT_COLUMN_SIZE = 80;
const TEXT_ROW_SIZE = 25;

interface Point {
    x: number;
    y: number;
}

interface Gorilla {
    x: number;
    y: number;
}

const gravity = 9.8; // TODO: read from user
let wind: number;
let players = [] as Gorilla[];

async function loadImage(url: string): Promise<HTMLImageElement> {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
}

function readBrowserKey(): Promise<string> {
    return new Promise((resolve) => {
        window.addEventListener("keydown", (e: KeyboardEvent) => {
            resolve(e.key);
        }, { once: true });
    });
}

function getPixelAt(ctx: CanvasRenderingContext2D, x: number, y: number): string {
    const transform = ctx.getTransform();
    const logicalX = qbasicRound(x);
    const logicalY = qbasicRound(y);
    const canvasX = Math.round(
        transform.a * logicalX + transform.c * logicalY + transform.e,
    );
    const canvasY = Math.round(
        transform.b * logicalX + transform.d * logicalY + transform.f,
    );
    const [r, g, b] = ctx.getImageData(canvasX, canvasY, 1, 1).data;

    /**
     * NOTE: For whatever reason, the exact color pixel values do not
     * necessarily match what was drawn. I have no idea why this is happening
     * but I am normalizing them the nearest EGA pallette...
     */
    return `#${[r, g, b]
        .map(value => Math.round(value / 0x55) * 0x55)
        .map(value => value.toString(16).padStart(2, "0"))
        .join("")}`.toUpperCase();
}

/**
 * NOTE: The original game uses column based text rendering. In EGA mode,
 * there are 80 columns.
 */
function col2px(col: number): number {
    if (col < 1) {
        throw new Error("col must be greater than 1");
    }

    return (col - 1) * (Math.floor(SCREEN_WIDTH / TEXT_COLUMN_SIZE));
}

function row2px(row: number): number {
    if (row < 1) {
        throw new Error("row must be greater than 1");
    }

    return (row - 1) * (Math.floor(SCREEN_HEIGHT / TEXT_ROW_SIZE));
}

/**
 * NOTE: The original game measures CPU speed and then waits in a
 * busy loop.
 */
function rest(seconds: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, Math.max(seconds * 1000, 16));
    });
}

function animateSteps(stepCount: number, durationSeconds: number, drawStep: (step: number) => void): Promise<void> {
    const totalSteps = Math.max(0, Math.floor(stepCount));
    const durationMs = durationSeconds * 1000;

    return new Promise(resolve => {
        if (totalSteps === 0) {
            resolve();
            return;
        }

        let firstFrameTime: number | undefined;
        let nextStep = 0;

        const drawFrame = (frameTime: number): void => {
            firstFrameTime ??= frameTime;

            const elapsed = frameTime - firstFrameTime;
            const targetStep = Math.min(
                totalSteps,
                Math.floor(elapsed / durationMs * totalSteps) + 1,
            );

            while (nextStep < targetStep) {
                drawStep(nextStep);
                nextStep++;
            }

            if (nextStep < totalSteps) {
                requestAnimationFrame(drawFrame);
            } else {
                resolve();
            }
        };

        requestAnimationFrame(drawFrame);
    });
}

/**
 * NOTE: Text wrap behavior is currently missing.
 */
function drawText(ctx: CanvasRenderingContext2D, col: number, row: number, text: string, foregroundColor = COLOR_WHITE, backgroundColor = COLOR_SKY): void {
    const x = col2px(col);
    const y = row2px(row);

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(x, y, text.length * 8, 14);

    ctx.fillStyle = foregroundColor;
    ctx.fillText(text, x, y);
}

function drawCenteredText(ctx: CanvasRenderingContext2D, row: number, text: string, foregroundColor = COLOR_WHITE, backgroundColor = COLOR_SKY): void {
    const col = (Math.floor(TEXT_COLUMN_SIZE / 2)) - Math.round(text.length / 2);

    drawText(ctx, col, row, text, foregroundColor, backgroundColor);
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

    ctx.beginPath();
    ctx.strokeStyle = COLOR_WIND_ARROW;
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

function clearScreen(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLOR_SKY;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
}

function generateLevel(ctx: CanvasRenderingContext2D): Point[] {
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

function drawSprite(
    ctx: CanvasRenderingContext2D,
    sprite: HTMLImageElement,
    x: number,
    y: number,
    color: string,
): void {
    const width = sprite.naturalWidth;
    const height = sprite.naturalHeight;

    // Reproduce PUT ... PSET background behavior.
    ctx.fillStyle = COLOR_SKY;
    ctx.fillRect(x, y, width, height);

    const buffer = document.createElement("canvas");
    buffer.width = width;
    buffer.height = height;

    const bufferCtx = buffer.getContext("2d")!;
    bufferCtx.drawImage(sprite, 0, 0);

    bufferCtx.globalCompositeOperation = "source-in";
    bufferCtx.fillStyle = color;
    bufferCtx.fillRect(0, 0, width, height);

    ctx.drawImage(buffer, Math.round(x), Math.round(y));
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

        drawSprite(ctx, spr_gorilla_arms_down, x, y, COLOR_GORILLA);
    }
}

async function readShotNumber(ctx: CanvasRenderingContext2D, col: number, row: number): Promise<number> {
    let result = "";

    while (true) {
        drawText(ctx, col, row, result + "_    ");
        const key = await readBrowserKey();

        if (/^[0-9]$/.test(key)) {
            result += key;
        } else if (key === "." && !result.includes(".")) {
            result += key;
        } else if (key === "Backspace" && result.length > 0) {
            result = result.substring(0, result.length - 1);
        } else if (key === "Enter") {
            const n = parseFloat(result);
            if (result === "" || n <= 360) {
                break;
            }
            result = "";
        }
        /**
         * NOTE: Currently missing beep sound for unsupported keys.
         */
    }

    drawText(ctx, col, row, result + " ");

    if (result === "") {
        return 0;
    }

    return parseFloat(result);
}

function eraseShotInputFields(ctx: CanvasRenderingContext2D): void {
    const t = Math.floor(80 / TEXT_COLUMN_SIZE);

    for (let i = 1; i <= 4; i++) {
        drawText(ctx, 1, i, " ".repeat(Math.floor(30 / t)));
        drawText(ctx, Math.floor(50 / t), i, " ".repeat(Math.floor(30 / t)));
    }
}

async function doVictoryDance(ctx: CanvasRenderingContext2D, playerNumber: number): Promise<void> {
    const player = players[playerNumber];

    for (let i = 0; i < 4; i++) {
        drawSprite(ctx, spr_gorilla_left_arm_up, player.x, player.y, COLOR_GORILLA);
        // TODO: play sound
        await rest(0.4);

        drawSprite(ctx, spr_gorilla_right_arm_up, player.x, player.y, COLOR_GORILLA);
        // TODO: play sound
        await rest(0.4);
    }
}

async function doShot(ctx: CanvasRenderingContext2D, activePlayer: number): Promise<number> {
    const inputColumn = activePlayer == 0 ? 1 : 66;

    drawText(ctx, inputColumn, 2, "Angle:");
    let angle = await readShotNumber(ctx, inputColumn + 7, 2);

    drawText(ctx, inputColumn, 3, "Velocity:");
    const velocity = await readShotNumber(ctx, inputColumn + 10, 3);

    /*
    * Players enter an angle as if facing toward the center. Convert player
    * 2's angle to the global coordinate system, where 0 degrees points
    * right and 180 degrees points left.
    */
    if (activePlayer === 1) {
        angle = 180 - angle;
    }

    eraseShotInputFields(ctx);

    const playerHit = await plotShot(ctx, activePlayer, angle, velocity);
    if (playerHit == -1) { // No player hit
        return -1;
    }

    let winningPlayer = activePlayer;
    if (playerHit === activePlayer) {
        winningPlayer = 1 - activePlayer;
    }

    await doVictoryDance(ctx, winningPlayer);

    return winningPlayer;
}

function drawBanana(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, erase: boolean): void {
    const sprite = banana_sprites[rotation];

    drawSprite(ctx, sprite, x, y, erase ? COLOR_SKY : COLOR_BANANA);
}

function qbasicRound(value: number): number {
    const lower = Math.floor(value);
    const fraction = value - lower;

    if (fraction === 0.5) {
        return lower % 2 === 0 ? lower : lower + 1;
    }

    return Math.round(value);
}

/**
 * NOTE: This should be a very close approximation of the function used by QBASIC from drawing circles.
 * See https://github.com/robhagemans/pcbasic/blob/13d358df17475c42e36961d459ebba4efd82026e/pcbasic/basic/display/graphics.py#L558-L753
 */
function drawCircle(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    color: string,
    aspect?: number,
): void {
    const cx = qbasicRound(centerX);
    const cy = qbasicRound(centerY);
    const pixelAspect = (SCREEN_HEIGHT * 4) / (SCREEN_WIDTH * 3);
    let circleAspect = aspect ?? pixelAspect;

    // QuickBASIC uses the reciprocal magnitude for a negative aspect.
    if (circleAspect < 0) {
        circleAspect = -1 / circleAspect;
    }

    let radiusX: number;
    let radiusY: number;

    if (circleAspect === 1) {
        radiusX = qbasicRound(radius);
        radiusY = radiusX;
    } else if (circleAspect > 1) {
        radiusY = qbasicRound(radius);
        radiusX = qbasicRound(radiusY / circleAspect);
    } else {
        radiusX = qbasicRound(radius);
        radiusY = qbasicRound(radiusX * circleAspect);
    }

    let x = radiusX;
    let y = 0;
    let dx = 16 * (1 - 2 * radiusX) * radiusY * radiusY;
    let dy = 16 * radiusX * radiusX;
    const deltaDx = 32 * radiusY * radiusY;
    const deltaDy = 32 * radiusX * radiusX;
    let error = dx + dy;

    ctx.fillStyle = color;

    while (true) {
        ctx.fillRect(cx + x, cy + y, 1, 1);
        ctx.fillRect(cx + x, cy - y, 1, 1);
        ctx.fillRect(cx - x, cy + y, 1, 1);
        ctx.fillRect(cx - x, cy - y, 1, 1);

        const doubledError = 2 * error;
        if (doubledError <= dy) {
            y++;
            dy += deltaDy;
            error += dy;
        }
        if (doubledError >= dx || doubledError > dy) {
            x--;
            dx += deltaDx;
            error += dx;
        }
        if (x < 0) {
            break;
        }
    }

    while (y < radiusY) {
        ctx.fillRect(cx, cy + y, 1, 1);
        ctx.fillRect(cx, cy - y, 1, 1);
        y++;
    }
}

async function animateSmallExplosion(ctx: CanvasRenderingContext2D, x: number, y: number): Promise<void> {
    // TODO: play explosion sound

    const radius = SCREEN_HEIGHT / 50;

    for (let r = 0; r <= radius; r += 0.5) {
        drawCircle(ctx, x, y, r, COLOR_EXPLOSION);
    }

    for (let r = radius; r >= 0; r -= 0.5) {
        drawCircle(ctx, x, y, r, COLOR_SKY);
        // Note: The original game uses 0.005 here. On modern hardware, this is too short.
        await rest(0.05);
    }
}

async function explodeGorilla(ctx: CanvasRenderingContext2D, x: number): Promise<number> {
    const playerHit = x < Math.floor(SCREEN_WIDTH / 2) ? 0 : 1;
    const xScale = SCREEN_WIDTH / 320.0;
    const yScale = SCREEN_HEIGHT / 200.0;
    const xAdjust = 5;
    const yAdjust = 12;

    // TODO: Play gorilla explosion sound

    await animateSteps(8 * xScale, 0.1, step => {
        const i = step + 1;
        const circleX = players[playerHit].x + 3.5 * xScale + xAdjust;
        const circleY = players[playerHit].y + 7.0 * yScale + yAdjust;

        drawCircle(ctx, circleX, circleY, i, COLOR_EXPLOSION, -1.57);

        // NOTE: NO IDEA what this is supposed to be... but it's there in the original.
        const lineY = players[playerHit].y + (9 * yScale) - i;
        const lineStartX = players[playerHit].x + (7 * xScale);
        const lineEndX = players[playerHit].x;

        ctx.beginPath();
        ctx.strokeStyle = COLOR_EXPLOSION;
        ctx.moveTo(lineStartX, lineY);
        ctx.lineTo(lineEndX, lineY);
        ctx.stroke();
    });

    await animateSteps(16 * xScale, 0.3, step => {
        const i = step + 1;
        const circleX = players[playerHit].x + 3.5 * xScale + xAdjust;

        if (i < 8 * xScale) {
            const circleY = players[playerHit].y + 7.0 * yScale + yAdjust;
            const radius = 8 * xScale + 1 - i;

            drawCircle(ctx, circleX, circleY, radius, COLOR_SKY, -1.57);
        }

        const circleY = players[playerHit].y + yAdjust;
        const color = COLOR_EXPLOSION_CYCLE[i % 2];
        drawCircle(ctx, circleX, circleY, i, color, -1.57);
    });

    const finalPhaseSteps = 24 * xScale;
    await animateSteps(finalPhaseSteps, 0.4, step => {
        const i = finalPhaseSteps - step;
        const circleX = players[playerHit].x + 3.5 * xScale + xAdjust;
        const circleY = players[playerHit].y + yAdjust;

        drawCircle(ctx, circleX, circleY, i, COLOR_SKY, -1.57);

        /**
         * NOTE: The original game busy waits for 200 loop iterations here.
         * Oirignal code:
         * FOR Count = 1 TO 200
         * NEXT
         */
    });

    return playerHit;
}

async function plotShot(ctx: CanvasRenderingContext2D, activePlayer: number, angle_deg: number, velocity: number): Promise<number> {
    const player = players[activePlayer];

    const angle = angle_deg / 180 * Math.PI;
    const initialXVelocity = Math.cos(angle) * velocity;
    const initialYVelocity = Math.sin(angle) * velocity;

    let oldX = player.x;
    let oldY = player.y;
    let oldRotation = 0;

    if (activePlayer === 0) {
        drawSprite(ctx, spr_gorilla_left_arm_up, player.x, player.y, COLOR_GORILLA);
    } else {
        drawSprite(ctx, spr_gorilla_right_arm_up, player.x, player.y, COLOR_GORILLA);
    }

    // TODO: Play throw sound
    await rest(0.1);
    drawSprite(ctx, spr_gorilla_arms_down, player.x, player.y, COLOR_GORILLA);

    const adjustment = 4;
    let impact = false;
    let onScreen = true;
    let bananaNeedsErasing = false;
    let playerHit = -1;
    let pixelColor = COLOR_SKY;

    let startXPosition = player.x;
    const startYPosition = player.y - adjustment - 3;

    let collisionSampleDirection;
    if (activePlayer === 1) {
        startXPosition += 25;
        collisionSampleDirection = 4;
    } else {
        collisionSampleDirection = -4;
    }

    /*
    * With very low velocity, the first collision samples remain on the
    * throwing gorilla, producing a self-hit.
    */
    if (velocity < 2) {
        pixelColor = COLOR_GORILLA;
    }

    let time = 0;
    let x = player.x;
    let y = player.y;

    while (!impact && onScreen) {
        /**
         * NOTE: The original game rests for 0.02 seconds. However,
         * on modern hardware, this extra delay is too small.
         */
        await rest(0.05);

        if (bananaNeedsErasing) {
            drawBanana(ctx, oldX, oldY, oldRotation, true);
            bananaNeedsErasing = false;
        }

        /**
         * NOTE: This additional delay simulates flickering of the banana.
         * On original hardware this was simply caused by the budy time between
         * undrawing the previous banana and redrawing the new one.
         */
        await rest(0.004);

        x = startXPosition
            + initialXVelocity * time
            + 0.5 * (wind / 5.0) * time * time;

        y = startYPosition
            + (-initialYVelocity * time
                + 0.5 * gravity * time * time)
            * (SCREEN_HEIGHT / 350.0);

        if (x >= SCREEN_WIDTH - 10 || x <= 3 || y >= SCREEN_HEIGHT - 3) {
            onScreen = false;
        }

        if (onScreen && y > 0) {
            let sampleY = 0;
            let sampleX = 8 * (1 - activePlayer);

            do {
                pixelColor = getPixelAt(ctx, x + sampleX, y + sampleY);

                // TODO: handle sun
                if (pixelColor === COLOR_SKY) {
                    impact = false;
                } else {
                    impact = true;
                }

                sampleX += collisionSampleDirection;
                sampleY += 6;
            } while (!impact && sampleX === 4);

            if (!impact) {
                const rotation = Math.floor(time * 10) % 4;

                drawBanana(ctx, x, y, rotation, false);
                bananaNeedsErasing = true;
                oldRotation = rotation;
            }

            oldX = x;
            oldY = y;
        }

        time += 0.1;
    }

    if (impact && pixelColor !== COLOR_GORILLA) {
        await animateSmallExplosion(ctx, x + adjustment, y + adjustment);
    } else if (pixelColor === COLOR_GORILLA) {
        playerHit = await explodeGorilla(ctx, x);
    }

    return playerHit;
}

function updateScores(wins: number[], playerNumber: number, result: number) {
    /*
     * NOTE: HIT_SELF is +1, but DoShot returns QBasic TRUE (-1) for every
     * gorilla hit, so this branch is never reached. Scoring still works because
     * QBASIC passes PlayerNum by reference: DoShot changes the caller's Tosser
     * to the opponent on a self-hit before UpdateScores is called.
     */
    if (result === 1) {
        wins[1 - playerNumber]++;
    } else {
        wins[playerNumber]++;
    }
}

async function startGame(ctx: CanvasRenderingContext2D, player1: string, player2: string, rounds: number): Promise<void> {
    const wins = [0, 0];
    let activePlayer = 1;

    for (let r = 0; r < rounds; r++) {
        clearScreen(ctx);
        const buildings = generateLevel(ctx);
        placeGorillas(ctx, buildings);

        let roundIsOver = false;
        while (!roundIsOver) {
            activePlayer = 1 - activePlayer;

            drawText(ctx, 1, 1, player1);
            drawText(ctx, (TEXT_COLUMN_SIZE - 1 - player2.length), 1, player2);
            drawCenteredText(ctx, 23, `${wins[0]}>Score<${wins[1]}`);

            const scoringPlayer = await doShot(ctx, activePlayer);
            roundIsOver = scoringPlayer !== -1;

            if (roundIsOver) {
                /*
                * scoringPlayer reproduces the value left in QBASIC's by-reference
                * Tosser argument after DoShot returns.
                */
                updateScores(wins, scoringPlayer, -1);
            }
        }

        await rest(1);
    }
}

const canvas = document.querySelector("#game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

if (!ctx) {
    throw new Error("Could not get Canvas context");
}

await document.fonts.load('14px "IBM EGA 8x14"');

ctx.imageSmoothingEnabled = false;
ctx.scale(2, 2);
ctx.font = '14px "IBM EGA 8x14"';
ctx.textBaseline = "top";

await startGame(ctx, "Player 1", "Player 2", 3);
