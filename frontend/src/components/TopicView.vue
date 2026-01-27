<script setup>
import { onMounted, watch, computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useTopicsStore } from '../topics';
import { authStore } from '../auth';
import PostList from './PostList.vue';
import BlockUserModal from './moderation/BlockUserModal.vue';
import CreateTopicModal from './CreateTopicModal.vue';
import PromoteModeratorModal from './moderation/PromoteModeratorModal.vue';
import RemoveModeratorModal from './moderation/RemoveModeratorModal.vue';
import * as topicService from '../services/topicService';

const route = useRoute();
const topics = useTopicsStore();
const auth = authStore();

const loadTopic = () => {
	const id = route.params.id;
	if (id && id !== 'undefined') {
		topics.fetchTopic(id);
	}
};

onMounted(loadTopic);
watch(() => route.params.id, (newId, oldId) => {
	if (newId !== oldId) loadTopic();
});

const isBanned = computed(() => {
  const topic = topics.currentTopic;
  const userId = auth.user?.id || auth.user?._id;
  if (!topic || !userId || !topic.bannedUsersIds) return false;
  
  const isBannedInList = topic.bannedUsersIds.some(
    id => (typeof id === 'object' ? id._id === userId : id === userId)
  );
  
  if (!isBannedInList) return false;

  if (topic.blockedUserExceptions && Array.isArray(topic.blockedUserExceptions)) {
    const exception = topic.blockedUserExceptions.find(exc => {
      const excUserId = typeof exc.userId === 'object' ? exc.userId._id : exc.userId;
      return excUserId === userId;
    });
    
    if (exception && exception.allowedInTopicIds && Array.isArray(exception.allowedInTopicIds)) {
      const isInAllowedList = exception.allowedInTopicIds.some(topicId => {
        const allowedId = typeof topicId === 'object' ? topicId._id : topicId;
        const currentId = topic._id;
        return allowedId === currentId;
      });
      
      if (isInAllowedList) {
        return false;
      }
    }
  }
  
  return true;
});

const isBlocked = computed(() => {
  return auth.blocked === true;
});

const canModerate = computed(() => {
	const topic = topics.currentTopic;
	const userId = auth.user?._id || auth.user?.id;
	const role = auth.user?.role;
	if (!topic || !userId) return false;
	if (role === 'admin') return true;
	const ownerId = topic.ownerId?._id || topic.ownerId;
	const isOwner = ownerId && ownerId === userId;
	const moderators = (topic.moderatorsId || []).map(m => (typeof m === 'object' ? m._id : m));
	const isModerator = moderators.includes(userId);
	return isOwner || isModerator;
});

const showBlockModal = ref(false);
const showCreateSubtopic = ref(false);
const showPromoteModal = ref(false);
const showRemoveModal = ref(false);
const removeModeratorId = ref('');
const removeModeratorLogin = ref('');
const isEditingTopic = ref(false);
const editForm = ref({ name: '', description: '' });
const editError = ref('');

const handleBlocked = () => {
	topics.fetchTopic(route.params.id);
};

const handleCreated = () => {
	topics.fetchTopic(route.params.id);
};

const handlePromoted = () => {
	topics.fetchTopic(route.params.id);
};

const openRemoveModal = (moderator) => {
	removeModeratorId.value = typeof moderator === 'object' ? moderator._id : moderator;
	removeModeratorLogin.value = typeof moderator === 'object' ? moderator.login : 'nieznany';
	showRemoveModal.value = true;
};

const handleRemoved = () => {
	topics.fetchTopic(route.params.id);
};

const initEditForm = () => {
	editForm.value = {
		name: topics.currentTopic?.name || '',
		description: topics.currentTopic?.description || ''
	};
};

const saveTopic = async () => {
	try {
		editError.value = '';
		if (!editForm.value.name.trim()) {
			editError.value = 'Nazwa tematu nie może być pusta';
			return;
		}
		await topicService.updateTopic(topics.currentTopic._id, editForm.value);
		await topics.fetchTopic(topics.currentTopic._id);
		isEditingTopic.value = false;
	} catch (e) {
		editError.value = e?.response?.data?.message || 'Błąd';
	}
};

const cancelEdit = () => {
	isEditingTopic.value = false;
	initEditForm();
};

watch(() => topics.currentTopic, () => {
	initEditForm();
});
</script>

<template>
	<div v-if="isBlocked" class="blocked-alert">
		<h2 class="blocked-heading">Zostałeś zablokowany</h2>
		<p>Nie możesz publikować postów w tym temacie, ponieważ moderator Cię zablokował.</p>
	</div>
	<div v-else-if="topics.loading">Ładowanie...</div>
	<div v-else-if="topics.error">Błąd: {{ topics.error }}</div>
	<div v-else-if="isBanned">
		<div class="banned-message">Nie masz dostępu do tego tematu (zostałeś zbanowany).</div>
	</div>
	<div v-else-if="topics.currentTopic">
		<h2 class="topic-heading">
			{{ topics.currentTopic.name }}
			<span v-if="topics.currentTopic.isClosed" class="badge-closed">
				Zamknięty
			</span>
			<span v-if="topics.currentTopic.isHidden" class="badge-hidden">
				Ukryty
			</span>
		</h2>
		<p>{{ topics.currentTopic.description }}</p>
		<div v-if="topics.currentTopic.tags && topics.currentTopic.tags.length">
			<span v-for="tag in topics.currentTopic.tags" :key="tag">{{ tag }}</span>
		</div>
		<div v-if="topics.currentTopic.isClosed" class="topic-closed-notice">(Temat zamknięty)</div>
		<div v-if="topics.currentTopic.children && topics.currentTopic.children.length">
			<h3>Podtematy:</h3>
			<ul>
				<li v-for="child in topics.currentTopic.children" :key="child._id || child.id">
					{{ child.name }}
				</li>
			</ul>
		</div>
		<div v-if="topics.currentTopic.ownerId">
			<small>Właściciel: {{ topics.currentTopic.ownerId.login }}</small>
		</div>
		<div v-if="topics.currentTopic.moderatorsId && topics.currentTopic.moderatorsId.length">
			<small>Moderatorzy: 
				<span v-for="mod in topics.currentTopic.moderatorsId" :key="mod._id" class="moderator-item">
					{{ mod.login }}
					<button 
						v-if="canModerate"
						@click="openRemoveModal(mod)" 
						class="btn-remove-moderator"
					>
						Usuń
					</button>
				</span>
			</small>
		</div>

		<div v-if="canModerate" class="moderation-section">
			<h3>Moderacja</h3>
			
			<div class="moderation-controls">
				<button v-if="!isEditingTopic" @click="isEditingTopic = true" class="btn-edit-topic">
					Edytuj temat
				</button>
				
				<div v-if="isEditingTopic" class="edit-topic-form">
					<div class="form-group">
						<label class="form-label">
							Nazwa:
							<input v-model="editForm.name" type="text" class="form-input" />
						</label>
					</div>
					<div class="form-group">
						<label class="form-label">
							Opis:
							<textarea v-model="editForm.description" class="textarea-description"></textarea>
						</label>
					</div>
					<div v-if="editError" class="error-message">
						{{ editError }}
					</div>
					<button @click="saveTopic" class="btn-save">
						Zapisz
					</button>
					<button @click="cancelEdit" class="btn-cancel">
						Anuluj
					</button>
				</div>
			</div>
			
			<button @click="showBlockModal = true" class="btn-block-user">
				Blokuj/Odblokuj użytkownika
			</button>
			<button @click="showPromoteModal = true" class="btn-promote-moderator">
				Promuj moderatora
			</button>
			<button @click="showCreateSubtopic = true" class="btn-create-subtopic">
				Utwórz podtemat
			</button>
		</div>

		<BlockUserModal 
			:open="showBlockModal" 
			:topic-id="topics.currentTopic._id" 
			@close="showBlockModal = false" 
			@blocked="handleBlocked" 
			@unblocked="handleBlocked" />

		<PromoteModeratorModal 
			:open="showPromoteModal" 
			:topic-id="topics.currentTopic._id" 
			@close="showPromoteModal = false" 
			@promoted="handlePromoted" />

		<RemoveModeratorModal 
			:open="showRemoveModal" 
			:topic-id="topics.currentTopic._id"
			:moderator-id="removeModeratorId"
			:moderator-login="removeModeratorLogin"
			@close="showRemoveModal = false" 
			@removed="handleRemoved" />

		<CreateTopicModal 
			:show="showCreateSubtopic" 
			:parent-id="topics.currentTopic._id" 
			@close="showCreateSubtopic = false" 
			@created="handleCreated" />

        <div>
            <h3>Dyskusja</h3>
            <PostList :topic-id="topics.currentTopic._id"/>
        </div>
	</div>
	<div v-else>
		<em>Nie znaleziono tematu.</em>
	</div>
</template>