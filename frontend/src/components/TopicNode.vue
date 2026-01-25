<script setup>
const props = defineProps({
  node: { type: Object, required: true }
});
const emit = defineEmits(["select"]);
const selectNode = () => {
  emit("select", props.node.id);
};
</script>

<template>
  <div class="topic-node">
    <span @click="selectNode" class="topic-title">
      {{ node.name }}
      <span v-if="node.isClosed" class="closed">(zamknięty)</span>
    </span>
    <div v-if="node.children && node.children.length" class="topic-children">
      <TopicNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>


<style scoped>
</style>