<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        title: string;
        children: Snippet;
    }

    const {title, children} = $props();
</script>

<div class="dialog">
    <div class="title">{title}</div>

    <div class="content">
        {@render children()}
    </div>
</div>

<style lang="scss">
    .dialog {
        width: max-content;
        margin: 20px auto;
        background-color: var(--color-grey);
        position: relative;
        padding: 15px 8px;
        color: var(--color-black);
    }

    .title {
        position: absolute;
        background-color: inherit;
        left: 50%;
        top: 18px;
        transform: translate(-50%, -50%);
        padding: 0 10px;
    }

    .content {
        border: solid 5px var(--color-black);
        padding: 15px 25px;
    }
</style>