<script lang="ts">
    interface Props {
        text: string;
    }

    const { text }: Props = $props();
</script>

<p>{text}</p>

<style lang="scss">
    p {
        line-height: 35px;
        min-height: 35px;
        text-align: center;
        position: relative;

        &::before {
            content: "' ";
            display: block;
            position: absolute;
            left: 0;
        }
    }

    @media (max-width: 700px) {
        p {
            line-height: 26px;
            min-height: 26px;

            &::before {
                display: none;
            }
        }
    }
</style>
