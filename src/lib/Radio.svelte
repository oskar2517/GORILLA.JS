<script lang="ts">
    interface Props {
        options: string[];
        value: string;
    }

    let { options, value = $bindable() }: Props = $props();
</script>

<div class="radio">
    {#each options as o, i}
        <label>
            <input type="radio" value={o} bind:group={value} />
            {i + 1}. {o}
        </label>
    {/each}
</div>

<style lang="scss">
    .radio {
        display: flex;
        flex-direction: column;
    }

    label {
        margin: 10px 0;
        cursor: pointer;
    }

    input[type="radio"] {
        appearance: none;
        -webkit-appearance: none;
    }

    input[type="radio"] {
        appearance: none;
        width: max-content;
        font-family: inherit;
        font-size: inherit;
        color: inherit;
        position: relative;

        &::before {
            content: "( )";
        }

        &:checked::before {
            content: "(\2666)";
        }

        &:focus::after {
            content: "_";
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
        }
    }
</style>
