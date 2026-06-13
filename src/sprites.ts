import imgBananaDown from "./assets/banana_down.png";
import imgBananaLeft from "./assets/banana_left.png";
import imgBananaRight from "./assets/banana_right.png";
import imgBananaUp from "./assets/banana_up.png";
import imgGorillaArmsDown from "./assets/gorilla.png";
import imgGorillaLeftArmUp from "./assets/gorilla_left_arm_up.png";
import imgGorillaRightArmUp from "./assets/gorilla_right_arm_up.png";
import { loadImage } from "./runtime";
import type { Sprites } from "./types";

export async function loadSprites(): Promise<Sprites> {
    const gorillaArmsDown = await loadImage(imgGorillaArmsDown);
    const gorillaLeftArmUp = await loadImage(imgGorillaLeftArmUp);
    const gorillaRightArmUp = await loadImage(imgGorillaRightArmUp);
    const bananaLeft = await loadImage(imgBananaLeft);
    const bananaRight = await loadImage(imgBananaRight);
    const bananaUp = await loadImage(imgBananaUp);
    const bananaDown = await loadImage(imgBananaDown);

    return {
        gorillaArmsDown,
        gorillaLeftArmUp,
        gorillaRightArmUp,
        bananas: [
            bananaLeft,
            bananaUp,
            bananaDown,
            bananaRight,
        ],
    };
}
