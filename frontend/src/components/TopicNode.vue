<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { authStore } from '../stores/auth';
import { useTopicsStore } from '../stores/topics';
import { closeTopic, openTopic, hideTopic, unhideTopic } from '../services/adminService';
import { useSocketStore } from '../stores/socket';

const socketStore = useSocketStore();
const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 }
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
const listenersRegistered = ref(false);

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
}

const selectNode = () => {
  emit("select", props.node._id);
};

const getTagName = (tag) => {
  return typeof tag === 'string' ? tag : tag.name;
};

const applyTopicUpdate = (payload) => {
  if (payload?.topic) {
    const incoming = { ...payload.topic };
    const tagsAreIds = Array.isArray(incoming.tags)
      && incoming.tags.length > 0
      && incoming.tags.every(tag => typeof tag === 'string');

    if (tagsAreIds) {
      const existingNode = topics.getTopicFromTree?.(incoming._id);
      if (existingNode?.tags?.length && typeof existingNode.tags[0] === 'object') {
        incoming.tags = existingNode.tags;
      } else if (topics.currentTopic?.tags?.length && typeof topics.currentTopic.tags[0] === 'object') {
        incoming.tags = topics.currentTopic.tags;
      }
    }

    topics.upsertTopicInTree(incoming);
    topics.mergeCurrentTopic(incoming);
    return;
  }
  if (payload?.topicId) {
    topics.updateTopicInTree({ _id: payload.topicId, ...payload.patch });
    topics.mergeCurrentTopic({ _id: payload.topicId, ...payload.patch });
  }
};

const handleCloseTopic = async (e) => {
  e.stopPropagation();
  try {
    error.value = '';
    const res = await closeTopic(props.node._id);
    applyTopicUpdate({ topic: res?.topic, topicId: props.node._id, patch: { isClosed: true } });
  } catch (err) {
    error.value = 'Błąd podczas zamykania tematu';
    console.error(err);
  }
};

const handleOpenTopic = async (e) => {
  e.stopPropagation();
  try {
    error.value = '';
    const res = await openTopic(props.node._id);
    applyTopicUpdate({ topic: res?.topic, topicId: props.node._id, patch: { isClosed: false } });
  } catch (err) {
    error.value = 'Błąd podczas otwierania tematu';
    console.error(err);
  }
};

const handleHideTopic = async (e) => {
  e.stopPropagation();
  try {
    error.value = '';
    const res = await hideTopic(props.node._id);
    applyTopicUpdate({ topic: res?.topic, topicId: props.node._id, patch: { isHidden: true } });
  } catch (err) {
    error.value = 'Błąd podczas ukrywania tematu';
    console.error(err);
  }
};

const handleUnhideTopic = async (e) => {
  e.stopPropagation();
  try {
    error.value = '';
    const res = await unhideTopic(props.node._id);
    applyTopicUpdate({ topic: res?.topic, topicId: props.node._id, patch: { isHidden: false } });
  } catch (err) {
    error.value = 'Błąd podczas odkrywania tematu';
    console.error(err);
  }
};

const handleTopicSync = (data) => {
  if (!childrenLoaded.value) return;

  const targetId = data?.topic?._id || data?.topicId;
  if (!targetId) return;

  const parentId = data?.topic?.parent?._id || data?.topic?.parent || data?.parentId;
  const nodeId = props.node._id;

  if (parentId && parentId !== nodeId) return;

  const idx = children.value.findIndex(child => child?._id === targetId);
  if (idx === -1) {
    if (data?.topic && parentId === nodeId) {
      children.value.push(data.topic);
    }
    return;
  }

  const action = data?.action;
  if (action === 'hidden' && auth.user?.role !== 'admin') {
    children.value.splice(idx, 1);
    return;
  }

  if (data?.topic) {
    children.value[idx] = { ...children.value[idx], ...data.topic };
  } else if (action === 'closed' || action === 'opened') {
    children.value[idx] = {
      ...children.value[idx],
      isClosed: action === 'closed'
    };
  } else if (action === 'hidden' || action === 'unhidden') {
    children.value[idx] = {
      ...children.value[idx],
      isHidden: action === 'hidden'
    };
  }
};

const registerTopicListeners = () => {
  if (listenersRegistered.value) return;
  socketStore.on('topic:updated', handleTopicSync);
  socketStore.on('topic:closed', handleTopicSync);
  socketStore.on('topic:opened', handleTopicSync);
  socketStore.on('topic:hidden', handleTopicSync);
  socketStore.on('topic:unhidden', handleTopicSync);
  listenersRegistered.value = true;
};

const unregisterTopicListeners = () => {
  if (!listenersRegistered.value) return;
  socketStore.off('topic:updated', handleTopicSync);
  socketStore.off('topic:closed', handleTopicSync);
  socketStore.off('topic:opened', handleTopicSync);
  socketStore.off('topic:hidden', handleTopicSync);
  socketStore.off('topic:unhidden', handleTopicSync);
  listenersRegistered.value = false;
};

onMounted(() => {
  if (socketStore.connected) {
    registerTopicListeners();
  }
});

watch(
  () => socketStore.connected,
  (isConnected) => {
    if (isConnected) {
      registerTopicListeners();
    } else {
      unregisterTopicListeners();
    }
  }
);

onBeforeUnmount(() => {
  unregisterTopicListeners();
});
</script>

<template>
  <div class="topic-node" :style="{ '--depth': depth }">
    <div class="topic-title" @click="toggleOptions">
      <div class="topic-header">
        <div class="topic-title-row">
          <span class="topic-name" :title="node.name">{{ node.name }}</span>
          <div class="topic-status">
            <span v-if="node.isClosed" class="closed">zamkniety</span>
            <span v-if="node.isHidden" class="hidden">ukryty</span>
          </div>
        </div>
        <div v-if="node.tags && node.tags.length" class="tags">
          <span v-for="tag in node.tags" :key="tag._id || tag" class="tag">
            #{{ getTagName(tag) }}
          </span>
        </div>
      </div>

      <div v-if="isExpanded" class="topic-options">
        <div class="topic-options-primary">
          <button class="btn-option" @click="toggleChildren">Wyswietl podtematy</button>
          <button class="btn-option btn-open-topic" @click="handleOpen">Otworz</button>
        </div>
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

    <div v-if="childrenVisible" class="topic-children">
      <div v-if="childrenLoading" class="children-loading">Ładowanie...</div>
      <div v-else-if="childrenError" class="error-message">{{ childrenError }}</div>
      <div v-else-if="children.length === 0" class="children-empty">Brak podtematow</div>
      <TopicNode
        v-else
        v-for="child in children"
        :key="child._id"
        :node="child"
        :depth="depth + 1"
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
  margin-bottom: 10px;
  width: 100%;
  --indent: 12px;
  --indent-max: 6;
}

.topic-title {
  cursor: pointer;
  border: 2px solid var(--border);
  padding: 14px;
  padding-left: calc(14px + clamp(0px, calc(var(--depth) * var(--indent)), calc(var(--indent-max) * var(--indent))));
  border-radius: 6px;
  background-color: rgba(229, 242, 103, 0.05);
  transition: all 0.2s ease;
  min-height: 64px;
  position: relative;
}

.topic-title::before {
  content: "";
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 8px;
  width: clamp(0px, calc(var(--depth) * 2px), 12px);
  background: repeating-linear-gradient(
    to bottom,
    rgba(229, 242, 103, 0.25) 0px,
    rgba(229, 242, 103, 0.25) 6px,
    rgba(229, 242, 103, 0) 6px,
    rgba(229, 242, 103, 0) 12px
  );
  opacity: 0.6;
}

.topic-title:hover {
  background-color: rgba(229, 242, 103, 0.12);
  box-shadow: 0 0 8px rgba(229, 242, 103, 0.25);
}

.topic-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.topic-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.topic-name {
  cursor: pointer;
  display: block;
  font-size: 1.05em;
  font-weight: 700;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-status {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
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
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: thin;
}

.tag {
  background: #0d3015;
  color: var(--accent);
  border-radius: 4px;
  padding: 0.2em 0.6em;
  font-size: 0.85em;
  white-space: nowrap;
  border: 1px solid var(--border-soft);
}

.topic-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.btn-action {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
  font-weight: bold;
  white-space: nowrap;
  transition: all 0.2s ease;
  flex: 0 0 auto;
  min-width: 88px;
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
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.topic-options-primary {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-option {
  padding: 6px 12px;
  border: 2px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: bold;
  background: var(--accent);
  color: #111;
  flex: 0 0 auto;
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
  margin: 8px 0 0;
  border: none;
}
</style>