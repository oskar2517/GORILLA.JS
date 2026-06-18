<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();
</script>

<div class="view">
    <h1 class="title">GORILLA.JS</h1>

    <div class="content">
        {@render children()}
    </div>
</div>

<style lang="scss">
    .view {
        flex: 1;
        border: solid 5px var(--color-grey);
        margin: 3% 5%;
        position: relative;
        display: flex;
        min-width: 0;
        min-height: 0;
    }

    .content {
        overflow: auto;
        flex: 1;
        min-width: 0;
        min-height: 0;
        padding: 40px;
    }

    .title {
        position: absolute;
        left: 50%;
        top: 0;
        transform: translate(-50%, -50%);
        color: var(--color-blue);
        background-color: var(--color-grey);
        padding: 5px 20px;
        font-size: 28px;
        z-index: 1000;
    }

    @media (max-width: 700px) {
        .view {
            border-width: 3px;
            margin: 20px 12px 12px;
        }

        .content {
            padding: 28px 12px 16px;
        }

        .title {
            padding: 3px 10px;
            font-size: 20px;
            white-space: nowrap;
        }
    }
</style>
