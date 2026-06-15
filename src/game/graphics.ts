import {
    COLOR_BUILDINGS,
    COLOR_SKY,
    COLOR_WHITE,
    COLOR_WINDOW_DARK,
    COLOR_WINDOW_LIT,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
    TEXT_COLUMN_COUNT,
    TEXT_ROW_COUNT,
    COLOR_WIND_ARROW,
    COLOR_RED,
    COLOR_BLACK,
    COLOR_SUN
} from "./constants";
import { createTimeline, qbasicRound, randomNumber } from "./runtime";
import type { Sprites } from "./types";

export function getPixelAt(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
): string {
    const transform = ctx.getTransform();
    const logicalX = qbasicRound(x);
    const logicalY = qbasicRound(y);
    const canvasX = Math.round(
        transform.a * logicalX + transform.c * logicalY + transform.e,
    );
    const canvasY = Math.round(
        transform.b * logicalX + transform.d * logicalY + transform.f,
    );
    const [red, green, blue] = ctx.getImageData(
        canvasX,
        canvasY,
        1,
        1,
    ).data;

    /**
     * NOTE: For whatever reason, the exact color values of pixels do not
     * necessarily match what was drawn. I have no idea why this is happening
     * but I am normalizing them the nearest EGA pallette...
     */
    return `#${[red, green, blue]
        .map(value => Math.round(value / 0x55) * 0x55)
        .map(value => value.toString(16).padStart(2, "0"))
        .join("")}`.toUpperCase();
}

/**
 * NOTE: The original game uses column based text rendering. In EGA mode,
 * there are 80 columns.
 */
function columnToPixel(column: number): number {
    if (column < 1) {
        throw new Error("column must be greater than 0");
    }

    return (column - 1) * Math.floor(SCREEN_WIDTH / TEXT_COLUMN_COUNT);
}

function rowToPixel(row: number): number {
    if (row < 1) {
        throw new Error("row must be greater than 0");
    }

    return (row - 1) * Math.floor(SCREEN_HEIGHT / TEXT_ROW_COUNT);
}

/**
 * NOTE: Text wrap behavior is currently missing.
 */
export function drawText(
    ctx: CanvasRenderingContext2D,
    column: number,
    row: number,
    text: string,
    foregroundColor = COLOR_WHITE,
    backgroundColor = COLOR_SKY,
): void {
    const x = columnToPixel(column);
    const y = rowToPixel(row);

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(x, y, text.length * 8, 14);

    ctx.fillStyle = foregroundColor;
    ctx.fillText(text, x, y);
}

export function drawCenteredText(
    ctx: CanvasRenderingContext2D,
    row: number,
    text: string,
    foregroundColor = COLOR_WHITE,
    backgroundColor = COLOR_SKY,
): void {
    const column = Math.floor(TEXT_COLUMN_COUNT / 2)
        - Math.round(text.length / 2);

    drawText(ctx, column, row, text, foregroundColor, backgroundColor);
}

export async function drawBuilding(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
): Promise<void> {
    const timeline = createTimeline();

    // QBASIC's LINE ... BF includes both endpoint pixels.
    ctx.fillStyle = COLOR_SKY;
    ctx.fillRect(x - 1, y - 1, width + 3, height + 3);

    ctx.fillStyle = COLOR_BUILDINGS[
        randomNumber(0, COLOR_BUILDINGS.length - 1)
    ];
    ctx.fillRect(x, y, width + 1, height + 1);

    for (let windowX = x + 3; windowX < x + width - 3; windowX += 10) {
        for (let windowY = 3; windowY <= height - 7; windowY += 15) {
            ctx.fillStyle = randomNumber(1, 4) === 1
                ? COLOR_WINDOW_DARK
                : COLOR_WINDOW_LIT;
            ctx.fillRect(windowX, y + windowY, 4, 7);
        }

        // NOTE: Simulate processing time
        await timeline.wait(0.01);
    }
}

export function drawWind(ctx: CanvasRenderingContext2D, wind: number): void {
    if (wind === 0) {
        return;
    }

    const arrowLength = wind * 3 * Math.floor(SCREEN_WIDTH / 320);
    const lineX = Math.floor(SCREEN_WIDTH / 2);
    const lineY = SCREEN_HEIGHT - 5;
    const arrowDirection = wind > 0 ? -2 : 2;

    ctx.beginPath();
    ctx.strokeStyle = COLOR_WIND_ARROW;
    ctx.lineWidth = 1;
    ctx.moveTo(lineX, lineY);
    ctx.lineTo(lineX + arrowLength, lineY);
    ctx.moveTo(lineX + arrowLength, lineY);
    ctx.lineTo(lineX + arrowLength + arrowDirection, lineY - 2);
    ctx.moveTo(lineX + arrowLength, lineY);
    ctx.lineTo(lineX + arrowLength + arrowDirection, lineY + 2);
    ctx.stroke();
}

export function clearScreen(ctx: CanvasRenderingContext2D, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
}

export function drawSprite(
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

    const bufferCtx = buffer.getContext("2d");
    if (!bufferCtx) {
        throw new Error("Could not get sprite buffer context");
    }

    bufferCtx.drawImage(sprite, 0, 0);
    bufferCtx.globalCompositeOperation = "source-in";
    bufferCtx.fillStyle = color;
    bufferCtx.fillRect(0, 0, width, height);

    ctx.drawImage(buffer, Math.round(x), Math.round(y));
}

/**
 * NOTE: This should be a very close approximation of the function used by QBASIC from drawing circles.
 * See https://github.com/robhagemans/pcbasic/blob/13d358df17475c42e36961d459ebba4efd82026e/pcbasic/basic/display/graphics.py#L558-L753
 */
export function drawCircle(
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
    let deltaX = 16 * (1 - 2 * radiusX) * radiusY * radiusY;
    let deltaY = 16 * radiusX * radiusX;
    const deltaDeltaX = 32 * radiusY * radiusY;
    const deltaDeltaY = 32 * radiusX * radiusX;
    let error = deltaX + deltaY;

    ctx.fillStyle = color;

    while (true) {
        ctx.fillRect(cx + x, cy + y, 1, 1);
        ctx.fillRect(cx + x, cy - y, 1, 1);
        ctx.fillRect(cx - x, cy + y, 1, 1);
        ctx.fillRect(cx - x, cy - y, 1, 1);

        const doubledError = 2 * error;
        if (doubledError <= deltaY) {
            y++;
            deltaY += deltaDeltaY;
            error += deltaY;
        }
        if (doubledError >= deltaX || doubledError > deltaY) {
            x--;
            deltaX += deltaDeltaX;
            error += deltaX;
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

export function drawSparkleBox(
    ctx: CanvasRenderingContext2D,
    phase: number,
): void {
    const sparkles = "*    *    *    *    *    *    *    *    *    *    *    *    *    *    *    *    *    ";

    // Draw top and bottom row
    const topStart = phase - 1;
    const bottomStart = 5 - phase;
    drawText(ctx, 1, 1, sparkles.slice(topStart, topStart + TEXT_COLUMN_COUNT), COLOR_RED, COLOR_BLACK);
    drawText(ctx, 1, 22, sparkles.slice(bottomStart, bottomStart + TEXT_COLUMN_COUNT), COLOR_RED, COLOR_BLACK);

    // Draw left and right row
    for (let row = 2; row <= 21; row++) {
        const sparklePosition = (phase + row) % 5;
        const character = sparklePosition == 1 ? '*' : ' ';

        drawText(ctx, TEXT_COLUMN_COUNT, row, character, COLOR_RED, COLOR_BLACK);
        drawText(ctx, 1, 23 - row, character, COLOR_RED, COLOR_BLACK);
    }
}

export function drawSun(ctx: CanvasRenderingContext2D, sprites: Sprites, mouthOpen: boolean) {
    const w = sprites.sunHappy.naturalWidth;
    const h = sprites.sunHappy.naturalHeight;

    const x = Math.floor(SCREEN_WIDTH / 2) - Math.floor(w / 2);
    const y = 25 - Math.floor(h / 2);

    // Overwrite old sun
    ctx.fillStyle = COLOR_SKY;
    ctx.fillRect(x, y, w, h);

    if (mouthOpen) {
        drawSprite(ctx, sprites.sunShocked, x, y, COLOR_SUN);
    } else {
        drawSprite(ctx, sprites.sunHappy, x, y, COLOR_SUN);
    }
}
