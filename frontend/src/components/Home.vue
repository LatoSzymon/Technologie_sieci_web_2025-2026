<script setup>

</script>

<template>
    <div class="home-container">
        <h2>Witaj w ProgTalk</h2>
        <p>
            To jest panel startowy. Wybierz temat z listy lub przejdz do profilu,
            aby dostosowac swoje ustawienia.
        </p>
    </div>
</template>

<style scoped>
.home-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
    background: var(--panel);
    border: 2px solid var(--border);
}

.home-container h2 {
    margin-top: 0;
    color: var(--accent);
}

.home-container p {
    color: var(--text-soft);
}
</style>