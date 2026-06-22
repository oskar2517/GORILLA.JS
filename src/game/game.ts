import { playTone } from "./audio";
import {
    COLOR_BANANA,
    COLOR_EXPLOSION,
    COLOR_EXPLOSION_CYCLE,
    COLOR_GORILLA,
    COLOR_SKY,
    COLOR_SUN,
    HIT_SELF,
    NO_PLAYER,
    QBASIC_TRUE,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
    TEXT_COLUMN_COUNT,
} from "./constants";
import {
    clearScreen,
    drawBuilding,
    drawCenteredText,
    drawCircle,
    drawSprite,
    drawSun,
    drawText,
    drawWind,
    getPixelAt,
} from "./graphics";
import { readSynchronizedKey } from "./keyboard";
import {
    animateSteps,
    createTimeline,
    qbasicRound,
    randomNumber,
    waitFor,
} from "./runtime";
import type {
    GameInputs,
    GameState,
    MultiplayerSession,
    Point,
    ShotResult,
    Sprites,
    TurnResult,
} from "./types";
import { createKeyReader } from "./keyboard";

function createGameState(gravity: number): GameState {
    return {
        gravity,
        wind: 0,
        players: [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        ],
    };
}

function updateCityHeight(
    slope: number,
    x: number,
    currentHeight: number,
    heightStep: number,
): number {
    if (slope === 1) {
        return currentHeight + heightStep;
    }
    if (slope === 2) {
        return currentHeight - heightStep;
    }
    if (slope >= 3 && slope <= 5) {
        return x > SCREEN_WIDTH / 2
            ? currentHeight - 2 * heightStep
            : currentHeight + 2 * heightStep;
    }

    return currentHeight;
}

async function generateLevel(
    ctx: CanvasRenderingContext2D,
    state: GameState,
): Promise<Point[]> {
    const slope = randomNumber(1, 6);
    let newHeight = slope === 2 || slope === 6 ? 130 : 15;

    const bottom = SCREEN_HEIGHT - 15;
    const heightStep = 10;
    const buildings: Point[] = [];

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
        newHeight = updateCityHeight(slope, x, newHeight, heightStep);

        let width = randomNumber(1, 37) + 37;
        if (x + width > SCREEN_WIDTH) {
            width = SCREEN_WIDTH - x - 2;
        }

        let height = randomNumber(1, 120) + newHeight;
        if (height < heightStep) {
            height = heightStep;
        }

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
        const y = bottom - height;
        buildings.push({ x, y });
        await drawBuilding(ctx, x, y, width, height);

        x += width + 2;

        // NOTE: Simulate processing time
        await waitFor(0.05);
    }

    state.wind = randomNumber(1, 10) - 5;
    if (randomNumber(1, 3) === 1) {
        if (state.wind > 0) {
            state.wind += randomNumber(1, 10);
        } else {
            state.wind -= randomNumber(1, 10);
        }
    }

    drawWind(ctx, state.wind);
    return buildings;
}

function placeGorillas(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    sprites: Sprites,
    buildings: Point[],
): void {
    const xAdjust = 14;
    const yAdjust = 30;

    for (let player = 0; player < state.players.length; player++) {
        const offset = randomNumber(1, 2);
        const buildingIndex = player === 0
            ? offset
            : buildings.length - 1 - offset;

        /**
         * NOTE: The building gap is included in the width calculation.
         */
        const width = buildings[buildingIndex + 1].x
            - buildings[buildingIndex].x;
        const x = buildings[buildingIndex].x
            + Math.floor(width / 2)
            - xAdjust;
        const y = buildings[buildingIndex].y - yAdjust;

        state.players[player] = { x, y };
        drawSprite(ctx, sprites.gorillaArmsDown, x, y, COLOR_GORILLA);
    }
}

async function readShotNumber(
    ctx: CanvasRenderingContext2D,
    column: number,
    row: number,
    session: MultiplayerSession | undefined,
    inputId: string,
    activePlayer: 0 | 1,
): Promise<number> {
    let result = "";

    await session?.synchronize(inputId);
    const keyReader = !session || session.localPlayer === activePlayer
        ? createKeyReader("number")
        : undefined;

    try {
        while (true) {
            drawText(ctx, column, row, `${result}_    `);
            const key = await readSynchronizedKey(
                session,
                inputId,
                activePlayer,
                "number",
                keyReader,
            );

            if (/^[0-9]$/.test(key)) {
                result += key;
            } else if (key === "." && !result.includes(".")) {
                result += key;
            } else if (key === "Backspace" && result.length > 0) {
                result = result.substring(0, result.length - 1);
            } else if (key === "Enter") {
                const value = Number.parseFloat(result);
                if (result === "" || value <= 360) {
                    break;
                }
                result = "";
            }

            /**
             * NOTE: Currently missing beep sound for unsupported keys.
             */
        }
    } finally {
        keyReader?.destroy();
    }

    drawText(ctx, column, row, `${result} `);
    return result === "" ? 0 : Number.parseFloat(result);
}

function eraseShotInputFields(ctx: CanvasRenderingContext2D): void {
    const textScale = Math.floor(80 / TEXT_COLUMN_COUNT);
    const fieldWidth = Math.floor(30 / textScale);

    for (let row = 1; row <= 4; row++) {
        drawText(ctx, 1, row, " ".repeat(fieldWidth));
        drawText(ctx, Math.floor(50 / textScale), row, " ".repeat(fieldWidth));
    }
}

async function doVictoryDance(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    sprites: Sprites,
    playerNumber: number,
): Promise<void> {
    const player = state.players[playerNumber];
    const timeline = createTimeline();

    for (let step = 0; step < 4; step++) {
        drawSprite(
            ctx,
            sprites.gorillaLeftArmUp,
            player.x,
            player.y,
            COLOR_GORILLA,
        );
        
        await playTone("MFO0L32EFGEFDC");
        await timeline.wait(0.2);

        drawSprite(
            ctx,
            sprites.gorillaRightArmUp,
            player.x,
            player.y,
            COLOR_GORILLA,
        );
        await playTone("MFO0L32EFGEFDC");
        await timeline.wait(0.2);
    }
}

function drawBanana(
    ctx: CanvasRenderingContext2D,
    sprites: Sprites,
    x: number,
    y: number,
    rotation: number,
    erase: boolean,
): void {
    drawSprite(
        ctx,
        sprites.bananas[rotation],
        x,
        y,
        erase ? COLOR_SKY : COLOR_BANANA,
    );
}

async function animateSmallExplosion(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
): Promise<void> {
    await playTone("MBO0L32EFGEFDC");

    const radius = SCREEN_HEIGHT / 50;

    for (let currentRadius = 0; currentRadius <= radius; currentRadius += 0.5) {
        drawCircle(ctx, x, y, currentRadius, COLOR_EXPLOSION);
    }

    const timeline = createTimeline();
    for (let currentRadius = radius; currentRadius >= 0; currentRadius -= 0.5) {
        drawCircle(ctx, x, y, currentRadius, COLOR_SKY);

        // Note: The original game uses 0.005 here. On modern hardware, this is too short.
        await timeline.wait(0.05);
    }
}

async function explodeGorilla(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    impactX: number,
): Promise<number> {
    const playerHit = impactX < Math.floor(SCREEN_WIDTH / 2) ? 0 : 1;
    const player = state.players[playerHit];
    const xScale = SCREEN_WIDTH / 320;
    const yScale = SCREEN_HEIGHT / 200;
    const xAdjust = 5;
    const yAdjust = 12;

    await playTone("MBO0L16EFGEFDC");

    await animateSteps(8 * xScale, 0.1, step => {
        const radius = step + 1;
        const circleX = player.x + 3.5 * xScale + xAdjust;
        const circleY = player.y + 7 * yScale + yAdjust;

        drawCircle(ctx, circleX, circleY, radius, COLOR_EXPLOSION, -1.57);

        // NOTE: NO IDEA what this is supposed to be... but it's there in the original.
        const lineY = player.y + 9 * yScale - radius;
        const lineStartX = player.x + 7 * xScale;

        ctx.beginPath();
        ctx.strokeStyle = COLOR_EXPLOSION;
        ctx.moveTo(lineStartX, lineY);
        ctx.lineTo(player.x, lineY);
        ctx.stroke();
    });

    await animateSteps(16 * xScale, 0.3, step => {
        const radius = step + 1;
        const circleX = player.x + 3.5 * xScale + xAdjust;

        if (radius < 8 * xScale) {
            const lowerCircleY = player.y + 7 * yScale + yAdjust;
            const eraseRadius = 8 * xScale + 1 - radius;
            drawCircle(
                ctx,
                circleX,
                lowerCircleY,
                eraseRadius,
                COLOR_SKY,
                -1.57,
            );
        }

        const circleY = player.y + yAdjust;
        const color = COLOR_EXPLOSION_CYCLE[radius % 2];
        drawCircle(ctx, circleX, circleY, radius, color, -1.57);
    });

    const finalPhaseSteps = 24 * xScale;
    await animateSteps(finalPhaseSteps, 0.4, step => {
        const radius = finalPhaseSteps - step;
        const circleX = player.x + 3.5 * xScale + xAdjust;
        const circleY = player.y + yAdjust;

        drawCircle(ctx, circleX, circleY, radius, COLOR_SKY, -1.57);

        /**
         * NOTE: The original game busy waits for 200 loop iterations here.
         * Oirignal code:
         * FOR Count = 1 TO 200
         * NEXT
         */
    });

    return playerHit;
}

async function plotShot(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    sprites: Sprites,
    activePlayer: number,
    angleDegrees: number,
    velocity: number,
): Promise<ShotResult> {
    const player = state.players[activePlayer];
    const angle = angleDegrees / 180 * Math.PI;
    const initialXVelocity = Math.cos(angle) * velocity;
    const initialYVelocity = Math.sin(angle) * velocity;

    let oldX = player.x;
    let oldY = player.y;
    let oldRotation = 0;

    const throwingSprite = activePlayer === 0
        ? sprites.gorillaLeftArmUp
        : sprites.gorillaRightArmUp;
    drawSprite(ctx, throwingSprite, player.x, player.y, COLOR_GORILLA);

    await playTone("MBo0L32A-L64CL16BL64A+");
    await waitFor(0.1);
    drawSprite(
        ctx,
        sprites.gorillaArmsDown,
        player.x,
        player.y,
        COLOR_GORILLA,
    );

    const adjustment = 4;
    let impact = false;
    let onScreen = true;
    let bananaNeedsErasing = false;
    let playerHit = NO_PLAYER;
    let pixelColor = COLOR_SKY;
    let shotInSun = false;
    let sunHit = false;

    let startXPosition = player.x;
    const startYPosition = player.y - adjustment - 3;
    const collisionSampleDirection = activePlayer === 1 ? 4 : -4;

    if (activePlayer === 1) {
        startXPosition += 25;
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
    const timeline = createTimeline();

    while (!impact && onScreen) {
        /**
         * NOTE: The original game rests for 0.02 seconds. However,
         * on modern hardware, this extra delay is too small.
         */
        await timeline.wait(0.05);

        if (bananaNeedsErasing) {
            drawBanana(ctx, sprites, oldX, oldY, oldRotation, true);
            bananaNeedsErasing = false;
        }

        x = startXPosition
            + initialXVelocity * time
            + 0.5 * (state.wind / 5) * time * time;
        y = startYPosition
            + (-initialYVelocity * time
                + 0.5 * state.gravity * time * time)
            * (SCREEN_HEIGHT / 350);

        if (x >= SCREEN_WIDTH - 10 || x <= 3 || y >= SCREEN_HEIGHT - 3) {
            onScreen = false;
        }

        if (onScreen && y > 0) {
            let sampleY = 0;
            let sampleX = 8 * (1 - activePlayer);

            do {
                pixelColor = getPixelAt(ctx, x + sampleX, y + sampleY);

                if (pixelColor === COLOR_SKY) {
                    impact = false;

                    if (shotInSun && (Math.abs(Math.floor(SCREEN_WIDTH / 2) - x) > 20 || y > 39)) {
                        shotInSun = false;
                    }
                } else if (pixelColor === COLOR_SUN && y < 39) {
                    if (!sunHit) {
                        drawSun(ctx, sprites, true);
                    }

                    sunHit = true;
                    shotInSun = true;
                } else {
                    impact = true;
                }

                sampleX += collisionSampleDirection;
                sampleY += 6;
            } while (!impact && sampleX === 4);

            if (!shotInSun && !impact) {
                const rotation = Math.floor(time * 10) % 4;
                drawBanana(ctx, sprites, x, y, rotation, false);
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
        playerHit = await explodeGorilla(ctx, state, x);
    }

    return {
        playerHit,
        sunHit,
    };
}

async function doShot(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    sprites: Sprites,
    activePlayer: 0 | 1,
    session: MultiplayerSession | undefined,
    turnNumber: number,
): Promise<TurnResult> {
    const inputColumn = activePlayer === 0 ? 1 : 66;

    drawText(ctx, inputColumn, 2, "Angle:");
    let angle = await readShotNumber(
        ctx,
        inputColumn + 7,
        2,
        session,
        `turn-${turnNumber}-angle`,
        activePlayer,
    );

    drawText(ctx, inputColumn, 3, "Velocity:");
    /**
     * NOTE: In the original game, velocity is implicitly rounded to an integer since
     * it dees not define an explicit type and variables are declared as ints by default.
     */
    const velocity = qbasicRound(
        await readShotNumber(
            ctx,
            inputColumn + 10,
            3,
            session,
            `turn-${turnNumber}-velocity`,
            activePlayer,
        ),
    );

    /*
    * Players enter an angle as if facing toward the center. Convert player
    * 2's angle to the global coordinate system, where 0 degrees points
    * right and 180 degrees points left.
    */
    if (activePlayer === 1) {
        angle = 180 - angle;
    }

    eraseShotInputFields(ctx);

    const shotResult = await plotShot(
        ctx,
        state,
        sprites,
        activePlayer,
        angle,
        velocity,
    );
    if (shotResult.playerHit === NO_PLAYER) { // No player hit
        return {
            scoringPlayer: NO_PLAYER,
            sunHit: shotResult.sunHit,
        };
    }

    const winningPlayer = shotResult.playerHit === activePlayer
        ? 1 - activePlayer
        : activePlayer;
    await doVictoryDance(ctx, state, sprites, winningPlayer);

    return {
        scoringPlayer: winningPlayer,
        sunHit: shotResult.sunHit,
    };
}

function updateScores(
    wins: [number, number],
    playerNumber: number,
    result: number,
): void {
    /*
     * NOTE: HIT_SELF is +1, but DoShot returns QBasic TRUE (-1) for every
     * gorilla hit, so this branch is never reached. Scoring still works because
     * QBASIC passes PlayerNum by reference: DoShot changes the caller's Tosser
     * to the opponent on a self-hit before UpdateScores is called.
     */
    if (result === HIT_SELF) {
        wins[1 - playerNumber]++;
    } else {
        wins[playerNumber]++;
    }
}

export async function startGame(
    ctx: CanvasRenderingContext2D,
    sprites: Sprites,
    gameInputs: GameInputs,
    session?: MultiplayerSession,
): Promise<[number, number]> {
    const state = createGameState(gameInputs.gravity);
    const wins: [number, number] = [0, 0];
    let activePlayer: 0 | 1 = 1;
    let turnNumber = 0;

    for (let round = 0; round < gameInputs.rounds; round++) {
        await session?.synchronize(`round-${round}`);

        clearScreen(ctx, COLOR_SKY);
        await waitFor(0.5);

        const buildings = await generateLevel(ctx, state);
        placeGorillas(ctx, state, sprites, buildings);
        drawSun(ctx, sprites, false);

        let roundIsOver = false;
        while (!roundIsOver) {
            activePlayer = activePlayer === 0 ? 1 : 0;

            drawText(ctx, 1, 1, gameInputs.player1Name);
            drawText(
                ctx,
                TEXT_COLUMN_COUNT - 1 - gameInputs.player2Name.length,
                1,
                gameInputs.player2Name,
            );
            drawCenteredText(ctx, 23, `${wins[0]}>Score<${wins[1]}`);

            const shotResult = await doShot(
                ctx,
                state,
                sprites,
                activePlayer,
                session,
                turnNumber,
            );
            turnNumber++;
            const scoringPlayer = shotResult.scoringPlayer;

            if (shotResult.sunHit) {
                drawSun(ctx, sprites, false);
            }

            roundIsOver = scoringPlayer !== NO_PLAYER;

            if (roundIsOver) {
                /*
                * scoringPlayer reproduces the value left in QBASIC's by-reference
                * Tosser argument after DoShot returns.
                */
                updateScores(wins, scoringPlayer, QBASIC_TRUE);
            }
        }

        await waitFor(1);
    }

    return wins;
}
