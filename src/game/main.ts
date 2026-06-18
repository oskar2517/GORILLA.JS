import { startGame } from "./game";
import { loadSprites } from "./sprites";
import { COLOR_BLACK, COLOR_BLUE, COLOR_GORILLA, COLOR_GREY, COLOR_WHITE } from "./constants";
import { clearScreen, drawCenteredText, drawSparkleBox, drawSprite, drawText } from "./graphics";
import {
    createTimeline,
    readInput,
    setRandomSeed,
} from "./runtime";
import type {
    GameInputAction,
    GameInputs,
    MultiplayerSession,
    Sprites,
} from "./types";
import { playTone } from "./audio";
import { readSynchronizedKey } from "./keyboard";

async function readSharedInput(
    ctx: CanvasRenderingContext2D,
    session: MultiplayerSession | undefined,
    inputId: string,
    column: number,
    row: number,
    prompt: string,
): Promise<string> {
    await session?.synchronize(inputId);

    return readInput(
        ctx,
        column,
        row,
        prompt,
        COLOR_GREY,
        COLOR_BLACK,
        () => readSynchronizedKey(session, inputId, 0, "full"),
    );
}

async function showTextIntro(
    ctx: CanvasRenderingContext2D,
    session: MultiplayerSession | undefined,
): Promise<void> {
    clearScreen(ctx, COLOR_BLACK);

    drawCenteredText(ctx, 4, "Q B a s i c    G O R I L L A S", COLOR_WHITE, COLOR_BLACK);
    drawCenteredText(ctx, 6, "Copyright (C) IBM Corporation 1991", COLOR_GREY, COLOR_BLACK);

    drawCenteredText(ctx, 8, "Your mission is to hit your opponent with the exploding", COLOR_GREY, COLOR_BLACK);
    drawCenteredText(ctx, 9, "banana by varying the angle and power of your throw, taking", COLOR_GREY, COLOR_BLACK);
    drawCenteredText(ctx, 10, "into account wind speed, gravity, and the city skyline.", COLOR_GREY, COLOR_BLACK);
    drawCenteredText(ctx, 11, "The wind speed is shown by a directional arrow at the bottom", COLOR_GREY, COLOR_BLACK);
    drawCenteredText(ctx, 12, "of the playing field, its length relative to its strength.", COLOR_GREY, COLOR_BLACK);

    drawCenteredText(ctx, 24, "Press any key to continue", COLOR_GREY, COLOR_BLACK);

    await session?.synchronize("text-intro");

    await playTone("MBT160O1L8CDEDCDL4ECC");

    let keyPressed = false;
    const keyPromise = readSynchronizedKey(
        session,
        "text-intro",
        0,
        "full"
    ).then(() => {
        keyPressed = true;
    });
    const timeline = createTimeline();

    while (!keyPressed) {
        for (let phase = 1; phase <= 5 && !keyPressed; phase++) {
            drawSparkleBox(ctx, phase);
            await timeline.wait(0.03);
        }
    }

    await keyPromise;
}

async function readGameInputs(
    ctx: CanvasRenderingContext2D,
    session: MultiplayerSession | undefined,
): Promise<GameInputs> {
    clearScreen(ctx, COLOR_BLACK);

    let player1Name = await readSharedInput(
        ctx,
        session,
        "config-player-1",
        15,
        8,
        "Name of Player 1 (Default = 'Player 1'): ",
    );
    if (player1Name === "") {
        player1Name = "Player 1";
    } else {
        player1Name = player1Name.substring(0, 10);
    }

    let player2Name = await readSharedInput(
        ctx,
        session,
        "config-player-2",
        15,
        10,
        "Name of Player 2 (Default = 'Player 2'): ",
    );
    if (player2Name === "") {
        player2Name = "Player 2";
    } else {
        player2Name = player2Name.substring(0, 10);
    }

    let roundsText = "";
    let rounds: number;
    do {
        // Clear input area for repeated inputs
        drawText(ctx, 56, 12, " ".repeat(25), COLOR_BLACK, COLOR_BLACK);

        roundsText = await readSharedInput(
            ctx,
            session,
            "config-rounds",
            13,
            12,
            "Play to how many total points (Default = 3)? ",
        );

        const parsed = Number.parseFloat(roundsText.substring(0, 2));
        rounds = Number.isNaN(parsed) ? 0 : parsed;
    } while (
        !(
            (rounds > 0 && roundsText.length < 3) ||
            roundsText.length === 0
        )
    );

    if (rounds === 0) {
        rounds = 3;
    }

    let gravityText = "";
    let gravity: number;
    do {
        // Clear input area for repeated inputs
        drawText(ctx, 53, 14, " ".repeat(28), COLOR_BLACK, COLOR_BLACK);

        gravityText = await readSharedInput(
            ctx,
            session,
            "config-gravity",
            17,
            14,
            "Gravity in Meters/Sec (Earth = 9.8)? ",
        );

        const parsed = Number.parseFloat(gravityText);
        gravity = Number.isNaN(parsed) ? 0 : parsed;
    } while (!(gravity > 0 || gravityText.length === 0));

    if (gravity === 0) {
        gravity = 9.8;
    }

    drawText(ctx, 34, 16, "--------------", COLOR_GREY, COLOR_BLACK);
    drawText(ctx, 34, 18, "V = View Intro", COLOR_GREY, COLOR_BLACK);
    drawText(ctx, 34, 19, "P = Play Game", COLOR_GREY, COLOR_BLACK);
    drawText(ctx, 35, 21, "Your Choice?", COLOR_GREY, COLOR_BLACK);

    await session?.synchronize("config-action");
    const key = await readSynchronizedKey(session, "config-action", 0, "full");
    let nextAction: GameInputAction = "game";
    if (key.toLowerCase() === "v") {
        nextAction = "intro"
    }

    return {
        player1Name,
        player2Name,
        rounds,
        gravity,
        nextAction
    };
}

async function showIntro(ctx: CanvasRenderingContext2D, gameInputs: GameInputs, sprites: Sprites) {
    const x = 278
    const y = 175
    const timeline = createTimeline();

    clearScreen(ctx, COLOR_BLUE);

    drawCenteredText(ctx, 2, "Q B A S I C   G O R I L L A S", COLOR_WHITE, COLOR_BLUE);
    drawCenteredText(ctx, 5, "             STARRING:               ", COLOR_WHITE, COLOR_BLUE);

    drawCenteredText(ctx, 7, `${gameInputs.player1Name} AND ${gameInputs.player2Name}`, COLOR_WHITE, COLOR_BLUE);

    drawSprite(ctx, sprites.gorillaArmsDown, x - 13, y, COLOR_GORILLA);
    drawSprite(ctx, sprites.gorillaArmsDown, x + 47, y, COLOR_GORILLA);

    await timeline.wait(1);

    drawSprite(ctx, sprites.gorillaLeftArmUp, x - 13, y, COLOR_GORILLA);
    drawSprite(ctx, sprites.gorillaRightArmUp, x + 47, y, COLOR_GORILLA);

    await playTone("t120o1l16b9n0baan0bn0bn0baaan0b9n0baan0b");

    await timeline.wait(0.3);

    drawSprite(ctx, sprites.gorillaRightArmUp, x - 13, y, COLOR_GORILLA);
    drawSprite(ctx, sprites.gorillaLeftArmUp, x + 47, y, COLOR_GORILLA);

    await playTone("o2l16e-9n0e-d-d-n0e-n0e-n0e-d-d-d-n0e-9n0e-d-d-n0e-");

    await timeline.wait(0.3);

    drawSprite(ctx, sprites.gorillaLeftArmUp, x - 13, y, COLOR_GORILLA);
    drawSprite(ctx, sprites.gorillaRightArmUp, x + 47, y, COLOR_GORILLA);

    await playTone("o2l16g-9n0g-een0g-n0g-n0g-eeen0g-9n0g-een0g-");

    await timeline.wait(0.3);

    drawSprite(ctx, sprites.gorillaRightArmUp, x - 13, y, COLOR_GORILLA);
    drawSprite(ctx, sprites.gorillaLeftArmUp, x + 47, y, COLOR_GORILLA);

    await playTone("o2l16b9n0baan0g-n0g-n0g-eeen0o1b9n0baan0b");

    await timeline.wait(0.3);

    for (let i = 0; i < 4; i++) {
        drawSprite(ctx, sprites.gorillaLeftArmUp, x - 13, y, COLOR_GORILLA);
        drawSprite(ctx, sprites.gorillaRightArmUp, x + 47, y, COLOR_GORILLA);

        await playTone("T160O0L32EFGEFDC");

        await timeline.wait(0.1);

        drawSprite(ctx, sprites.gorillaRightArmUp, x - 13, y, COLOR_GORILLA);
        drawSprite(ctx, sprites.gorillaLeftArmUp, x + 47, y, COLOR_GORILLA);

        await playTone("T160O0L32EFGEFDC");

        await timeline.wait(0.1);
    }
}

async function showResults(
    ctx: CanvasRenderingContext2D,
    gameInputs: GameInputs,
    wins: [number, number],
    session: MultiplayerSession | undefined,
): Promise<void> {
    clearScreen(ctx, COLOR_BLACK);

    drawCenteredText(ctx, 8, "GAME OVER!", COLOR_GREY, COLOR_BLACK);
    drawCenteredText(ctx, 10, "Score:", COLOR_GREY, COLOR_BLACK);

    drawText(ctx, 30, 11, gameInputs.player1Name, COLOR_GREY, COLOR_BLACK);
    drawText(ctx, 50, 11, wins[0].toString(), COLOR_GREY, COLOR_BLACK);

    drawText(ctx, 30, 12, gameInputs.player2Name, COLOR_GREY, COLOR_BLACK);
    drawText(ctx, 50, 12, wins[1].toString(), COLOR_GREY, COLOR_BLACK);

    drawCenteredText(ctx, 24, "Press any key to continue", COLOR_GREY, COLOR_BLACK);

    await session?.synchronize("game-results");

    let keyPressed = false;
    const keyPromise = readSynchronizedKey(
        session,
        "game-results",
        0,
        "full"
    ).then(() => {
        keyPressed = true;
    });
    const timeline = createTimeline();

    while (!keyPressed) {
        for (let phase = 1; phase <= 5 && !keyPressed; phase++) {
            drawSparkleBox(ctx, phase);
            await timeline.wait(0.03);
        }
    }

    await keyPromise;
}

export async function runGame(
    canvas: HTMLCanvasElement,
    multiplayerSession?: MultiplayerSession,
): Promise<void> {
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

    while (true) {
        await showTextIntro(ctx, multiplayerSession);

        const gameInputs = await readGameInputs(ctx, multiplayerSession);

        if (gameInputs.nextAction === "intro") {
            await showIntro(ctx, gameInputs, sprites);
        }

        let randomSeed: number | undefined;
        if (multiplayerSession?.isHost) {
            randomSeed = crypto.getRandomValues(new Uint32Array(1))[0];
            multiplayerSession.sendSeed(randomSeed);
        } else if (multiplayerSession) {
            randomSeed = await multiplayerSession.receiveSeed();
        }
        setRandomSeed(randomSeed);

        const results = await startGame(
            ctx,
            sprites,
            gameInputs,
            multiplayerSession,
        );

        await showResults(ctx, gameInputs, results, multiplayerSession);
    }
}
