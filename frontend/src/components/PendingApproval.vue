<script setup>
</script>

<template>
    <div class="pending-container">
        <h2>Twoje konto jeszcze nie zostało aktywowane</h2>
        <p>Cierpliwości, nasi admini na pewno niedługo cię wpuszczą</p>
    </div>
</template>

<style scoped>
.pending-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 24px;
    background: var(--panel);
    border: 2px solid var(--border);
    text-align: center;
}

.pending-container h2 {
    margin-top: 0;
    color: var(--accent);
}

.pending-container p {
    color: var(--text-soft);
}
</style>