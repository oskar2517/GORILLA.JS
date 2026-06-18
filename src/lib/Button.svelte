<script lang="ts">
    interface Props {
        value: string;
        disabled?: boolean;
        onclick?: (event: MouseEvent) => void;
    }

    const { value, onclick, disabled = false }: Props = $props();
</script>

<button class="button" {disabled} {onclick}>{value}</button>

<style lang="scss">
    .button {
        display: block;
        margin: 50px auto;
        font-family: "IBM EGA 8x14", sans-serif;
        font-size: 28px;
        border: none;
        background-color: var(--color-grey);
        color: var(--color-black);
        padding: 20px 30px;

        &:disabled {
            opacity: 0.6;
        }

        &:not(:disabled):hover {
            cursor: pointer;
            box-shadow: 20px 20px 0px 1px var(--color-black);
        }
    }

    @media (max-width: 700px) {
        .button {
            width: min(100%, 320px);
            margin: 24px auto;
            padding: 14px 18px;
            font-size: 20px;
        }

        .button:not(:disabled):hover {
            box-shadow: 10px 10px 0px 1px var(--color-black);
        }
    }
</style>
