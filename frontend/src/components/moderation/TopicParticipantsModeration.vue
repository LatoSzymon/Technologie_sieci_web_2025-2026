<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { blockUserInTopic, unblockUserInTopic, getTopicSubtree, getTopicParticipants } from '../../services/topicService';

const props = defineProps({
  topicId: { type: String, required: true },
  topic: { type: Object, required: true }
});

const emit = defineEmits(['changed']);

const participants = ref([]);
const topicTree = ref(null);
const loading = ref(false);
const error = ref('');
const searchQuery = ref('');
const exceptionsByUser = ref({});
const expandedUsers = ref(new Set());
const savingUserId = ref('');

const flattenTree = (node, flat = []) => {
  if (!node) return flat;
  flat.push(node);
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      flattenTree(child, flat);
    }
  }
  return flat;
};

const subtopics = computed(() => {
  if (!topicTree.value) return [];
  const all = flattenTree(topicTree.value);
  return all.slice(1);
});

const filteredParticipants = computed(() => {
  if (!searchQuery.value.trim()) return participants.value;
  const query = searchQuery.value.toLowerCase();
  return participants.value.filter(user => user.login.toLowerCase().includes(query));
});

const getAllowedTopicIdsForUser = (userId) => {
  const exceptions = props.topic?.blockedUserExceptions || [];
  const exception = exceptions.find(exc => {
    const excUserId = typeof exc.userId === 'object' ? exc.userId._id : exc.userId;
    return excUserId === userId;
  });
  if (!exception || !Array.isArray(exception.allowedInTopicIds)) return [];
  return exception.allowedInTopicIds.map(topicId =>
    typeof topicId === 'object' ? topicId._id : topicId
  );
};

const syncExceptionsFromTopic = () => {
  const map = {};
  for (const user of participants.value) {
    map[user._id] = getAllowedTopicIdsForUser(user._id);
  }
  exceptionsByUser.value = map;
};

const isUserBlocked = (userId) => {
  const topic = props.topic;
  if (!topic || !userId || !topic.bannedUsersIds) return false;

  const isBanned = topic.bannedUsersIds.some(id =>
    (typeof id === 'object' ? id._id === userId : id === userId)
  );

  if (!isBanned) return false;

  const exceptions = topic.blockedUserExceptions || [];
  const exception = exceptions.find(exc => {
    const excUserId = typeof exc.userId === 'object' ? exc.userId._id : exc.userId;
    return excUserId === userId;
  });

  if (exception && Array.isArray(exception.allowedInTopicIds)) {
    const isAllowed = exception.allowedInTopicIds.some(topicId => {
      const allowedId = typeof topicId === 'object' ? topicId._id : topicId;
      const currentId = topic._id;
      return allowedId === currentId;
    });

    if (isAllowed) return false;
  }

  return true;
};

const toggleExpanded = (userId) => {
  const next = new Set(expandedUsers.value);
  if (next.has(userId)) {
    next.delete(userId);
  } else {
    next.add(userId);
  }
  expandedUsers.value = next;
};

const isExpanded = (userId) => expandedUsers.value.has(userId);

const toggleException = (userId, topicId) => {
  const current = new Set(exceptionsByUser.value[userId] || []);
  if (current.has(topicId)) {
    current.delete(topicId);
  } else {
    current.add(topicId);
  }
  exceptionsByUser.value = {
    ...exceptionsByUser.value,
    [userId]: Array.from(current)
  };
};

const blockUser = async (userId) => {
  savingUserId.value = userId;
  error.value = '';
  try {
    const exceptions = exceptionsByUser.value[userId] || [];
    const response = await blockUserInTopic({ topicId: props.topicId, userId, exceptTopicIds: exceptions });
    emit('changed', {
      bannedUsersIds: response?.topic?.bannedUsersIds || [],
      blockedUserExceptions: response?.topic?.blockedUserExceptions || []
    });
  } catch (e) {
    error.value = e?.response?.data?.message || 'Błąd blokowania użytkownika';
  } finally {
    savingUserId.value = '';
  }
};

const unblockUser = async (userId) => {
  savingUserId.value = userId;
  error.value = '';
  try {
    const response = await unblockUserInTopic({ topicId: props.topicId, userId });
    emit('changed', {
      bannedUsersIds: response?.topic?.bannedUsersIds || [],
      blockedUserExceptions: response?.topic?.blockedUserExceptions || []
    });
  } catch (e) {
    error.value = e?.response?.data?.message || 'Błąd odblokowywania użytkownika';
  } finally {
    savingUserId.value = '';
  }
};

const handleBlockToggle = async (userId) => {
  if (isUserBlocked(userId)) {
    await unblockUser(userId);
  } else {
    await blockUser(userId);
  }
};

const saveExceptions = async (userId) => {
  if (!isUserBlocked(userId)) return;
  await blockUser(userId);
};

const loadParticipants = async () => {
  if (!props.topicId) return;
  loading.value = true;
  error.value = '';
  try {
    const [users, tree] = await Promise.all([
      getTopicParticipants(props.topicId),
      getTopicSubtree(props.topicId)
    ]);
    participants.value = users || [];
    topicTree.value = tree;
    syncExceptionsFromTopic();
  } catch (e) {
    error.value = e?.response?.data?.message || 'Błąd pobierania uczestników';
  } finally {
    loading.value = false;
  }
};

onMounted(loadParticipants);

watch(() => props.topicId, () => {
  participants.value = [];
  topicTree.value = null;
  exceptionsByUser.value = {};
  expandedUsers.value = new Set();
  loadParticipants();
});

watch(() => props.topic, () => {
  syncExceptionsFromTopic();
});
</script>

<template>
  <div class="participants-panel">
    <div class="panel-header">
      <h3 class="panel-title">Rozmowcy</h3>
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="Szukaj po loginie..."
      />
    </div>

    <div v-if="loading" class="panel-message">Ladowanie uczestnikow...</div>
    <div v-else-if="error" class="panel-error">{{ error }}</div>
    <div v-else-if="filteredParticipants.length === 0" class="panel-message">
      Brak uczestnikow do wyswietlenia.
    </div>

    <div v-else class="participants-list">
      <div v-for="user in filteredParticipants" :key="user._id" class="participant-row">
        <div class="participant-info">
          <div class="participant-login">{{ user.login }}</div>
          <div v-if="user.mail" class="participant-mail">{{ user.mail }}</div>
        </div>

        <div class="participant-actions">
          <label class="block-toggle">
            <input
              type="checkbox"
              :checked="isUserBlocked(user._id)"
              :disabled="savingUserId === user._id"
              @change="handleBlockToggle(user._id)"
            />
            Zablokowany
          </label>
          <button
            type="button"
            class="exceptions-toggle"
            @click="toggleExpanded(user._id)"
          >
            {{ isExpanded(user._id) ? 'Ukryj wyjatki' : 'Wyjatki' }}
          </button>
        </div>

        <div v-if="isExpanded(user._id)" class="exceptions-panel">
          <div class="exceptions-title">Podtematy z dostepem:</div>
          <div v-if="subtopics.length === 0" class="panel-message">Brak podtematow</div>
          <div v-else class="exceptions-list">
            <label v-for="topic in subtopics" :key="topic._id" class="exception-item">
              <input
                type="checkbox"
                :checked="(exceptionsByUser[user._id] || []).includes(topic._id)"
                @change="toggleException(user._id, topic._id)"
              />
              <span>{{ topic.name }}</span>
            </label>
          </div>
          <button
            v-if="isUserBlocked(user._id)"
            type="button"
            class="btn-save"
            :disabled="savingUserId === user._id"
            @click="saveExceptions(user._id)"
          >
            {{ savingUserId === user._id ? 'Zapisywanie...' : 'Zapisz wyjatki' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.participants-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-title {
  margin: 0;
  color: #ffff00;
  font-size: 1em;
  border-bottom: 1px solid #ffff00;
  padding-bottom: 8px;
}

.search-input {
  margin: none;
  width: 90%;
  padding: 10px 12px;
  border: 2px solid #ffff00;
  background-color: #1a1a1a;
  color: #ffff00;
  font-family: "Pixelify Sans", sans-serif;
}

.search-input:focus {
  outline: none;
  border-color: #f7ff8a;
}

.panel-message {
  color: #ccc;
  font-size: 0.95em;
}

.panel-error {
  color: #fff;
  background-color: #ff6b6b;
  padding: 8px 10px;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.participant-row {
  border: 1px solid #ffff00;
  background-color: #2d2d2d;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.participant-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.participant-login {
  color: #ffff00;
  font-weight: bold;
}

.participant-mail {
  color: #ccc;
  font-size: 0.9em;
}

.participant-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.block-toggle {
  color: #eee;
  display: flex;
  align-items: center;
  gap: 8px;
}

.exceptions-toggle {
  background-color: transparent;
  border: 1px solid #ffff00;
  color: #ffff00;
  padding: 6px 10px;
  cursor: pointer;
  font-family: "Pixelify Sans", sans-serif;
}

.exceptions-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 0, 0.3);
  padding-top: 8px;
}

.exceptions-title {
  color: #ffff00;
  font-weight: bold;
}

.exceptions-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.exception-item {
  color: #eee;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-save {
  align-self: flex-start;
  background-color: #ffff00;
  color: #000;
  border: none;
  padding: 8px 12px;
  font-weight: bold;
  cursor: pointer;
  font-family: "Pixelify Sans", sans-serif;
}

@media (max-width: 768px) {
  .participant-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
