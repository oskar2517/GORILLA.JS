<script lang="ts">
    import icon from "../assets/github.svg";
</script>

<div class="wrapper">
    <a
        class="github-link"
        href="https://github.com/oskar2517/GORILLA.JS"
        target="_blank"
    >
        <img class="icon" src={icon} alt="icon" /> View on GitHub
    </a>
</div>

<style lang="scss">
    .wrapper {
        display: flex;
        justify-content: center;
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
