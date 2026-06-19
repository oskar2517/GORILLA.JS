<script lang="ts">
    export type OnscreenKeyboardLayout = "full" | "number" | "continue";

    interface Props {
        layout: OnscreenKeyboardLayout;
        onkey: (key: string) => void;
    }

    const { layout, onkey }: Props = $props();

    let shift = $state(false);

    function getKeys(layout: OnscreenKeyboardLayout) {
        switch (layout) {
            case "full":
                return [
                    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
                    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
                    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
                    ["Shift", "z", "x", "c", "v", "b", "n", "m", "Backspace"],
                    [",", " ", ".", "Enter"],
                ];
            case "number":
                return [
                    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
                    [".", "Backspace", "Enter"],
                ];
            case "continue":
                return [["Continue"]];
        }
    }

    const keys = $derived(getKeys(layout));

    function shouldBeShifted(key: string): boolean {
        if (shift && key.length === 1 && /[a-z]/.test(key)) {
            return true;
        }

        return false;
    }

    function handleKeyButtonPress(key: string): void {
        if (key === "Shift") {
            shift = !shift;
        } else {
            const convertedKey = shouldBeShifted(key) ? key.toUpperCase() : key;

            onkey(convertedKey);

            shift = false;
        }
    }

    function displayKey(key: string): string {
        if (shouldBeShifted(key)) {
            return key.toUpperCase();
        }

        switch (key) {
            case " ":
                return "    ";
            case "Shift":
                return "\u0018";
            case "Backspace":
                return "\u0011";
        }

        return key;
    }
</script>

<div class="keyboard">
    {#each keys as r}
        <div class="row">
            {#each r as k}
                <button class="key" onclick={() => handleKeyButtonPress(k)}
                    >{displayKey(k)}</button
                >
            {/each}
        </div>
    {/each}
</div>

<style lang="scss">
    .keyboard {
        position: fixed;
        left: 50%;
        bottom: 10px;
        transform: translateX(-50%);
        width: 100%;
        max-width: 600px;
        opacity: 0.6;
        user-select: none;
    }

    .row {
        display: flex;
        width: 100%;
    }

    .key {
        flex: 1 1 0;
        font-family: "IBM EGA 8x14", sans-serif;
        text-rendering: geometricPrecision;
        font-size: 28px;
        background-color: var(--color-grey);
        color: var(--color-black);
        padding: 5px;
        border: solid 2px black;

        &:active {
            filter: brightness(0.8);
        }
    }
</style>
