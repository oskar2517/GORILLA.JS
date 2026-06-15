<script lang="ts">
    interface Props {
        value?: string;
        readonly?: boolean;
        disabled?: boolean;
        placeholder?: string;
    }

    let {
        value = $bindable(""),
        readonly = false,
        disabled = false,
        placeholder = "",
    }: Props = $props();
</script>

<div class="textarea-wrapper" class:disabled>
    <textarea
        class="textarea"
        rows="5"
        {disabled}
        {readonly}
        {placeholder}
        bind:value
    ></textarea>
</div>

<style lang="scss">
    .textarea-wrapper {
        padding: 10px 20px;
        background-color: var(--color-grey);
        margin: 50px 20%;

        &.disabled {
            opacity: 0.7;
        }
    }

    .textarea {
        border: none;
        width: 100%;
        background-color: transparent;
        font-family: "IBM EGA 8x14", sans-serif;
        font-size: 28px;
        border: solid 5px var(--color-black);
        padding: 10px 20px;
        resize: none;
        outline: none;
    }
</style>
