<script lang="ts">
    interface Props {
        href: string;
        icon: string;
        text: string;
    }

    const { href, icon, text } = $props();
</script>

<div class="wrapper">
    <a
        class="github-link"
        {href}
        target="_blank"
    >
        <img class="icon" src={icon} alt="icon" /> {text}
    </a>
</div>

<style lang="scss">
    .wrapper {
        display: flex;
        justify-content: center;
        margin: 20px;
    }

    .github-link:visited,
    .github-link {
        color: var(--color-grey);
        text-decoration: none;
        display: flex;
        align-items: center;
        column-gap: 20px;

        &:hover {
            text-decoration: underline;
        }
    }

    .icon {
        height: 40px;
    }

    @media (max-width: 700px) {
        .github-link {
            column-gap: 12px;
            font-size: 20px;
        }

        .icon {
            height: 28px;
        }
    }
</style>
