<script setup>
const props = defineProps({
  node: { type: Object, required: true }
});
const emit = defineEmits(["select"]);
const selectNode = () => {
  emit("select", props.node._id);
};

const getTagName = (tag) => {
  return typeof tag === 'string' ? tag : tag.name;
};
</script>

<template>
  <div class="topic-node">
    <span @click="selectNode" class="topic-title">
      {{ node.name }}
      <span v-if="node.isClosed" class="closed">(zamknięty)</span>
      <span v-if="node.tags && node.tags.length" class="tags">
        <span v-for="tag in node.tags" :key="tag._id || tag" class="tag">
          #{{ getTagName(tag) }}
        </span>
      </span>
    </span>
    <div v-if="node.children && node.children.length" class="topic-children">
      <TopicNode
        v-for="child in node.children"
        :key="child._id"
        :node="child"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>


<style scoped>
span {
  cursor: pointer;
}
.tags {
  margin-left: 0.5em;
}
.tag {
  background: #e6eaff;
  color: #061b82;
  border-radius: 4px;
  padding: 0 0.4em;
  margin-left: 0.2em;
  font-size: 0.85em;
}
</style>