export const SCREEN_WIDTH = 640;
export const SCREEN_HEIGHT = 350;

export const TEXT_COLUMN_COUNT = 80;
export const TEXT_ROW_COUNT = 25;

export const PALETTE = {
    BLUE: "#0000AA",
    YELLOW: "#FFFF55",
    LIGHT_YELLOW: "#FFFF00",
    GRAY: "#AAAAAA",
    DARK_GRAY: "#555555",
    WHITE: "#FFFFFF",
    BROWN: "#FFAA55",
    RED: "#AA0000",
    LIGHT_RED: "#FF0055",
    CYAN: "#00AAAA",
    BLACK: "#000000"
};

export const COLOR_SKY = PALETTE.BLUE;
export const COLOR_WINDOW_LIT = PALETTE.YELLOW;
export const COLOR_WINDOW_DARK = PALETTE.DARK_GRAY;
export const COLOR_BUILDINGS = [
    PALETTE.RED,
    PALETTE.GRAY,
    PALETTE.CYAN,
] as const;
export const COLOR_WIND_ARROW = PALETTE.LIGHT_RED;
export const COLOR_GORILLA = PALETTE.BROWN;
export const COLOR_BANANA = PALETTE.YELLOW;
export const COLOR_EXPLOSION = PALETTE.LIGHT_RED;
export const COLOR_SUN = PALETTE.LIGHT_YELLOW;
export const COLOR_EXPLOSION_CYCLE = [
    PALETTE.BROWN,
    PALETTE.LIGHT_RED,
] as const;

export const NO_PLAYER = -1;
export const QBASIC_TRUE = -1;
export const HIT_SELF = 1;
