<script setup>
import { defineProps } from 'vue';
const props = defineProps({
    page: Number,
    totalPages: Number
});
</script>

<template>
    <div>
        <button :disabled="page<=1" @click="$emit('change', page -1)">Poprzednia strona</button>
        <span>Strona: {{ page }}/{{ totalPages }}</span>
        <button :disabled="page >= totalPages" @click="$emit('change', page+ 1)">Następna strona</button>
    </div>
</template>