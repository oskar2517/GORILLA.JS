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

<div class="room-code-wrapper">
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
</style>
