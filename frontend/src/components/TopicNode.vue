<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { authStore } from '../stores/auth';
import { useTopicsStore } from '../stores/topics';
import { closeTopic, openTopic, hideTopic, unhideTopic } from '../services/adminService';
import { useSocketStore } from '../stores/socket';

const socketStore = useSocketStore();
const props = defineProps({
  node: { type: Object, required: true }
});
const emit = defineEmits(["select", "refresh"]);
const auth = authStore();
const topics = useTopicsStore();
const isExpanded = ref(false);
const childrenVisible = ref(false);
const children = ref([]);
const childrenLoading = ref(false);
const childrenLoaded = ref(false);
const childrenError = ref('');
const error = ref('');

const canModerate = computed(() => {
  if (!auth.user) return false;
  if (auth.user.role === 'admin') return true;

  const userId = String(auth.user._id || auth.user.id);

  const ownerId = props.node.ownerId
    ? String(typeof props.node.ownerId === 'object' ? props.node.ownerId._id : props.node.ownerId)
    : null;

  if (ownerId && ownerId === userId) return true;

  const moderators = (props.node.moderatorsId || []).map(m =>
    String(typeof m === 'object' ? m._id : m)
  );

  return moderators.includes(userId);
});

const toggleOptions = () => {
  isExpanded.value = !isExpanded.value;
};

const handleOpen = (e) => {
  e.stopPropagation();
  selectNode();
};

const toggleChildren = async (e) => {
  e.stopPropagation();

  if (!childrenLoaded.value) {
    try {
      childrenLoading.value = true;
      childrenError.value = '';
      children.value = await topics.fetchChildren(props.node._id);
      childrenLoaded.value = true;
    } catch (err) {
      childrenError = "Nie udało się pobrać podtematów";
      console.error(err);
    } finally {
      childrenLoading.value = false;
    }
  }

  childrenVisible.value = !childrenVisible.value;
};

const refreshChildren = async () => {
  if (!childrenLoaded.value) {
    return
  }

  try {
    childrenLoading.value = true;
    childrenError.value = '';
    children.value = await topics.fetchChildren(props.node._id);
  } catch (err) {
    childrenError.value = 'Nie udało się pobrać podtematów';
  } finally {
    childrenLoading.value = false;
  }
}

const handleRefresh = async () => {
  await refreshChildren();
  emit("refresh");
}

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

const handleTopicSync = () => {
  if (childrenVisible.value) {
    refreshChildren();
  }
};

onMounted(() => {
  socketStore.on('topic:updated', handleTopicSync);
  socketStore.on('topic:closed', handleTopicSync);
  socketStore.on('topic:opened', handleTopicSync);
  socketStore.on('topic:hidden', handleTopicSync);
  socketStore.on('topic:unhidden', handleTopicSync);
});

onBeforeUnmount(() => {
  socketStore.off('topic:updated', handleTopicSync);
  socketStore.off('topic:closed', handleTopicSync);
  socketStore.off('topic:opened', handleTopicSync);
  socketStore.off('topic:hidden', handleTopicSync);
  socketStore.off('topic:unhidden', handleTopicSync);
});
</script>

<template>
  <div class="topic-node">
    <div class="topic-title" @click="toggleOptions">
      <div class="topic-header">
        <span class="topic-name">
          {{ node.name }}
          <span v-if="node.isClosed" class="closed">(zamkniety)</span>
          <span v-if="node.isHidden" class="hidden">(ukryty)</span>
          <span v-if="node.tags && node.tags.length" class="tags">
            <span v-for="tag in node.tags" :key="tag._id || tag" class="tag">
              #{{ getTagName(tag) }}
            </span>
          </span>
        </span>
      </div>

      <div v-if="isExpanded" class="topic-options">
        <button class="btn-option" @click="toggleChildren">Wyswietl podtematy</button>
        <button class="btn-option btn-open-topic" @click="handleOpen">🡺</button>
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
            title="Otworz temat"
          >
            Otworz
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
            @click="handleUnhideTopic" class="btn-action btn-unhide" title="Odkryj temat">
            Odkryj
          </button>
        </div>
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>
    </div>

    <div v-if="childrenVisible" class="topic-children">
      <div v-if="childrenLoading" class="children-loading">Ładowanie...</div>
      <div v-else-if="childrenError" class="error-message">{{ childrenError }}</div>
      <div v-else-if="children.length === 0" class="children-empty">Brak podtematow</div>
      <TopicNode
        v-else
        v-for="child in children"
        :key="child._id"
        :node="child"
        @select="$emit('select', $event)"
        @refresh="handleRefresh"
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


.topic-options {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.btn-option {
  padding: 6px 12px;
  border: 2px solid #ffff00;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: bold;
  background: #ffff00;
  color: #111;
}

.btn-open-topic {
  background: #51cf66;
  border-color: #51cf66;
  color: #111;
}

.children-loading,
.children-empty {
  color: #ffff00;
  font-size: 0.85em;
  padding: 6px 0;
}

.topic-children > .topic-node {
  margin: 5px;
  border: none;
}
</style>