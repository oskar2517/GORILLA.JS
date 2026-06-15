import imgBananaDown from "../assets/game/banana_down.png";
import imgBananaLeft from "../assets/game/banana_left.png";
import imgBananaRight from "../assets/game/banana_right.png";
import imgBananaUp from "../assets/game/banana_up.png";
import imgGorillaArmsDown from "../assets/game/gorilla.png";
import imgGorillaLeftArmUp from "../assets/game/gorilla_left_arm_up.png";
import imgGorillaRightArmUp from "../assets/game/gorilla_right_arm_up.png";
import imgSunHappy from "../assets/game/sun_happy.png";
import imgSunShocked from "../assets/game/sun_shocked.png";
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
    const sunHappy = await loadImage(imgSunHappy);
    const sunShocked = await loadImage(imgSunShocked);

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
        sunHappy,
        sunShocked
    };
}
