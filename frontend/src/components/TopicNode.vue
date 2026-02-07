<script setup>
import { ref, computed } from 'vue';
import { authStore } from '../stores/auth';
import { closeTopic, openTopic, hideTopic, unhideTopic } from '../services/adminService';

const props = defineProps({
  node: { type: Object, required: true }
});
const emit = defineEmits(["select", "refresh"]);
const auth = authStore();
const error = ref('');

const canModerate = computed(() => {
  const userId = auth.user?._id || auth.user?.id;
  if (auth.user?.role === 'admin') return true;
  if (!props.node.ownerId || !userId) return false;
  
  const ownerId = typeof props.node.ownerId === 'object' ? props.node.ownerId._id : props.node.ownerId;
  const isOwner = ownerId === userId;
  
  const moderators = (props.node.moderatorsId || []).map(m => 
    typeof m === 'object' ? m._id : m
  );
  const isModerator = moderators.includes(userId);
  
  return isOwner || isModerator;
});

const selectNode = () => {
  emit("select", props.node._id);
};

const getTagName = (tag) => {
  return typeof tag === 'string' ? tag : tag.name;
};

const handleCloseTopic = async (e) => {
  e.stopPropagation();
  try {
    error.value = '';
    await closeTopic(props.node._id);
    emit("refresh");
  } catch (err) {
    error.value = 'Błąd podczas zamykania tematu';
    console.error(err);
  }
};

const handleOpenTopic = async (e) => {
  e.stopPropagation();
  try {
    error.value = '';
    await openTopic(props.node._id);
    emit("refresh");
  } catch (err) {
    error.value = 'Błąd podczas otwierania tematu';
    console.error(err);
  }
};

const handleHideTopic = async (e) => {
  e.stopPropagation();
  try {
    error.value = '';
    await hideTopic(props.node._id);
    emit("refresh");
  } catch (err) {
    error.value = 'Błąd podczas ukrywania tematu';
    console.error(err);
  }
};

const handleUnhideTopic = async (e) => {
  e.stopPropagation();
  try {
    error.value = '';
    await unhideTopic(props.node._id);
    emit("refresh");
  } catch (err) {
    error.value = 'Błąd podczas odkrywania tematu';
    console.error(err);
  }
};
</script>

<template>
  <div class="topic-node">
    <div class="topic-title">
      <div class="topic-header">
        <span @click="selectNode" class="topic-name">
          {{ node.name }}
          <span v-if="node.isClosed" class="closed">(zamknięty)</span>
          <span v-if="node.isHidden" class="hidden">(ukryty)</span>
          <span v-if="node.tags && node.tags.length" class="tags">
            <span v-for="tag in node.tags" :key="tag._id || tag" class="tag">
              #{{ getTagName(tag) }}
            </span>
          </span>
        </span>
        <div v-if="canModerate" class="topic-actions">
          <button 
            v-if="!node.isClosed"
            @click="handleCloseTopic" 
            class="btn-action btn-close"
            title="Zamknij temat"
          >
            Zamknij
          </button>
          <button 
            v-else
            @click="handleOpenTopic" 
            class="btn-action btn-open"
            title="Otwórz temat"
          >
            Otwórz
          </button>
          <button 
            v-if="!node.isHidden"
            @click="handleHideTopic" 
            class="btn-action btn-hide"
            title="Ukryj temat"
          >
            Ukryj
          </button>
          <button 
            v-else
            @click="handleUnhideTopic" 
            class="btn-action btn-unhide"
            title="Odkryj temat"
          >
            Odkryj
          </button>
        </div>
      </div>
      <div v-if="error" class="error-message">{{ error }}</div>
    </div>
    <div v-if="node.children && node.children.length" class="topic-children">
      <TopicNode
        v-for="child in node.children"
        :key="child._id"
        :node="child"
        @select="$emit('select', $event)"
        @refresh="$emit('refresh')"
      />
    </div>
  </div>
</template>


<style scoped>
.topic-node {
  display: flex;
  flex-direction: column;
  margin-bottom: 1vh;
}

.topic-title {
  cursor: pointer;
  border: 3px solid #ffff00;
  padding: 15px;
  border-radius: 8px;
  background-color: rgba(255, 255, 0, 0.05);
  transition: all 0.2s ease;
}

.topic-title:hover {
  background-color: rgba(255, 255, 0, 0.15);
  box-shadow: 0 0 10px rgba(255, 255, 0, 0.3);
}

.topic-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.topic-name {
  cursor: pointer;
}

.closed {
  color: #ff6b6b;
  font-weight: bold;
}

.hidden {
  color: #ffa500;
  font-weight: bold;
}

span {
  cursor: pointer;
}

.tags {
  margin-left: 0.5em;
}

.tag {
  background: #037e2a;
  color: #ffff00;
  border-radius: 4px;
  padding: 0 0.4em;
  margin-left: 0.2em;
  font-size: 0.85em;
}

.topic-actions {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.btn-action {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
  font-weight: bold;
  white-space: nowrap;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 60px;
}

.btn-close, .btn-open {
  background-color: #ff6b6b;
  color: white;
}

.btn-close:hover {
  background-color: #ff5252;
}

.btn-open:hover {
  background-color: #51cf66;
}

.btn-hide, .btn-unhide {
  background-color: #ffa500;
  color: white;
}

.btn-hide:hover {
  background-color: #ff8c00;
}

.btn-unhide:hover {
  background-color: #ffb84d;
}

.error-message {
  color: #ff6b6b;
  font-size: 0.85em;
  margin-top: 5px;
}

.topic-children {
  margin-left: 20px;
  margin-top: 12px;
  padding-left: 15px;
  border-left: 2px dashed #ffff00;
}
</style>