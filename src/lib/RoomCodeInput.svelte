<script lang="ts">
    interface Props {
        value: string;
        disabled?: boolean;
        readonly?: boolean;
    }

    let {
        value = $bindable(),
        disabled = false,
        readonly = false,
    }: Props = $props();
</script>

<div class="room-code-wrapper" class:disabled>
    <input
        class="room-code"
        type="text"
        {disabled}
        {readonly}
        bind:value
        placeholder="Room code"
    />
</div>

<style lang="scss">
    .room-code-wrapper {
        padding: 10px 20px;
        background-color: var(--color-grey);
        margin: 50px auto;
        width: max-content;

        &.disabled {
            opacity: 0.7;
        }
    }

    .room-code {
        background-color: transparent;
        font-family: "IBM EGA 8x14", sans-serif;
        font-size: 28px;
        border: solid 5px var(--color-black);
        padding: 10px 20px;
        resize: none;
        outline: none;
    }

    @media (max-width: 700px) {
        .room-code-wrapper {
            width: min(100%, 320px);
            margin: 28px auto;
            padding: 8px 12px;
        }

        .room-code {
            width: 100%;
            font-size: 20px;
            border-width: 3px;
            padding: 8px 10px;
        }
    }
</style>
