<script setup>
import { onMounted, onBeforeUnmount, watch, computed, ref, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useTopicsStore } from '../stores/topics';
import { authStore } from '../stores/auth';
import PostList from './PostList.vue';
import TopicParticipantsModeration from './moderation/TopicParticipantsModeration.vue';
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

const isTopicClosed = computed(() => {
	return topics.currentTopic?.isClosed === true;
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

const canRemoveModerator = computed(() => {
	const topic = topics.currentTopic;
	const userId = auth.user?._id || auth.user?.id;
	const role = auth.user?.role;
	if (!topic || !userId) return false;
	if (role === 'admin') return true;
	const ownerId = topic.ownerId?._id || topic.ownerId;
	const isOwner = ownerId && ownerId === userId;
	return isOwner;
});

const ownerLogin = computed(() => {
	const owner = topics.currentTopic?.ownerId;
	if (!owner) return '';
	return typeof owner === 'object' ? owner.login : String(owner);
});

const ownerBlocked = computed(() => {
	const owner = topics.currentTopic?.ownerId;
	if (!owner || typeof owner !== 'object') return false;
	return owner.isBlocked === true;
});

const canTransferOwner = computed(() => {
	return auth.user?.role === 'admin' && ownerBlocked.value;
});

const showCreateSubtopic = ref(false);
const showPromoteModal = ref(false);
const showRemoveModal = ref(false);
const removeModeratorId = ref('');
const removeModeratorLogin = ref('');
const isEditingTopic = ref(false);
const editForm = ref({ name: '', description: '' });
const editError = ref('');
const postFormRef = ref(null);
const showReplyJump = ref(true);
let replyObserver = null;

const handleBlocked = (payload) => {
	if (payload?.bannedUsersIds && topics.currentTopic) {
		topics.currentTopic.bannedUsersIds = payload.bannedUsersIds;
		topics.currentTopic.blockedUserExceptions = payload.blockedUserExceptions || [];
		return;
	}
	topics.fetchTopic(route.params.id);
};

const handleCreated = () => {
	topics.fetchTopic(route.params.id);
};

const handleReplyClick = (replyData) => {
	if (postFormRef.value) {
		postFormRef.value.handleReplyFromMain(replyData);
	}
};

const scrollToReply = () => {
	postFormRef.value?.scrollToForm?.();
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

const transferOwner = async (moderator) => {
	try {
		const topicId = topics.currentTopic?._id;
		if (!topicId) return;
		const moderatorId = typeof moderator === 'object' ? moderator._id : moderator;
		const moderatorLogin = typeof moderator === 'object' ? moderator.login : 'wybrany moderator';
		if (!confirm(`Ustawić ${moderatorLogin} jako właściciela tematu?`)) return;
		await topicService.transferTopicOwner(topicId, moderatorId);
		await topics.fetchTopic(topicId);
	} catch (e) {
		console.error(e);
	}
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
	nextTick(() => {
		const target = postFormRef.value?.$el;
		if (!target) {
			showReplyJump.value = true;
			return;
		}
		if (replyObserver) {
			replyObserver.disconnect();
		}
		replyObserver = new IntersectionObserver(
			(entries) => {
				showReplyJump.value = !entries[0]?.isIntersecting;
			},
			{ root: null, threshold: 0.2 }
		);
		replyObserver.observe(target);
	});
});

onBeforeUnmount(() => {
	if (replyObserver) {
		replyObserver.disconnect();
		replyObserver = null;
	}
});
</script>


<template>
	<div class="topic-view-container">
		<div v-if="isBlocked" class="alert alert-danger">
			<h2>Zostałeś zablokowany</h2>
			<p>Nie możesz publikować postów w tym temacie, ponieważ moderator Cię zablokował.</p>
		</div>
		<div v-else-if="topics.loading" class="loading-message">Ładowanie...</div>
		<div v-else-if="topics.error" class="error-message">Błąd: {{ topics.error }}</div>
		<div v-else-if="isBanned" class="alert alert-danger">
			<h3>Nie masz dostępu do tego tematu (zostałeś zbanowany).</h3>
		</div>
		<div v-else-if="topics.currentTopic" class="topic-layout">
			<div class="topic-main">
				<div class="topic-header-section">
					<div class="topic-title-area">
						<h1 class="topic-title">{{ topics.currentTopic.name }}</h1>
				<div class="topic-badges">
					<span v-if="topics.currentTopic.isClosed" class="badge badge-closed">Zamknięty</span>
					<span v-if="topics.currentTopic.isHidden" class="badge badge-hidden">Ukryty</span>
				</div>
			</div>
				<p class="topic-description">{{ topics.currentTopic.description }}</p>
				
				<div v-if="topics.currentTopic.tags && topics.currentTopic.tags.length" class="tags-section">
					<div class="tags-list">
						<span v-for="tag in topics.currentTopic.tags" :key="tag._id || tag" class="tag-badge">
							#{{ typeof tag === 'object' ? tag.name : tag }}
						</span>
					</div>
				</div>

				<div class="topic-meta">
					<div v-if="topics.currentTopic.ownerId" class="meta-item">
						<strong>Właściciel:</strong> {{ ownerLogin }}
						<span v-if="ownerBlocked" class="badge badge-owner-blocked">zablokowany</span>
					</div>
					<div v-if="topics.currentTopic.moderatorsId && topics.currentTopic.moderatorsId.length" class="meta-item">
						<strong>Moderatorzy:</strong>
					<div class="moderators-container">
						<span v-for="mod in topics.currentTopic.moderatorsId" :key="mod._id" class="moderator-badge">
							{{ mod.login }}
							<button 
								v-if="canRemoveModerator"
								@click="openRemoveModal(mod)"
								class="remove-moderator-btn"
								title="Usuń moderatora"
							>
								x
							</button>
							<button 
								v-if="canTransferOwner"
								@click="transferOwner(mod)"
								class="make-owner-btn"
								title="Ustaw jako właściciela"
							>
								owner
							</button>
						</span>
					</div>
					</div>
				</div>
			</div>

			<div class="discussion-section">
				<PostList :topic-id="topics.currentTopic._id" :is-sidebar="true" :show-posts="true" :show-form="false" @reply="handleReplyClick"/>
			</div>


				<div v-if="isTopicClosed" class="closed-topic-note">
					Temat jest zamknięty. Nie można dodawać nowych postów.
				</div>
				<PostList ref="postFormRef" :topic-id="topics.currentTopic._id" :is-sidebar="false" :show-posts="false" :show-form="!isTopicClosed" @reply="handleReplyClick"/>

		</div>

		<aside class="topic-sidebar">
			<div class="sidebar-card">
				<h3 class="card-title">Informacje</h3>
				<div class="topic-meta">
					<div v-if="topics.currentTopic.ownerId" class="meta-item">
						<span class="meta-label">Właściciel:</span>
						<span class="meta-value">{{ ownerLogin }}</span>
						<span v-if="ownerBlocked" class="badge badge-owner-blocked">zablokowany</span>
					</div>
					<div v-if="topics.currentTopic.moderatorsId && topics.currentTopic.moderatorsId.length" class="meta-item">
						<span class="meta-label">Moderatorzy:</span>
						<div class="moderators-list">
							<span v-for="mod in topics.currentTopic.moderatorsId" :key="mod._id" class="moderator-badge">
								{{ mod.login }}
								<button 
								v-if="canRemoveModerator"
								@click="openRemoveModal(mod)"
								class="remove-moderator-btn"
								title="Usuń moderatora"
							>
								x
							</button>
							<button 
								v-if="canTransferOwner"
								@click="transferOwner(mod)"
								class="make-owner-btn"
								title="Ustaw jako właściciela"
							>
								owner
							</button>
							</span>
						</div>
					</div>
				</div>
			</div>

			<div v-if="topics.currentTopic.children && topics.currentTopic.children.length" class="sidebar-card">
			<h3 class="card-title">Podtematy</h3>
			<ul class="subtopics-list">
				<li v-for="child in topics.currentTopic.children" :key="child._id || child.id" class="subtopic-item">
					<router-link :to="'/topics/' + (child._id || child.id)" class="subtopic-link">
						{{ child.name }}
					</router-link>
				</li>
			</ul>
			</div>

			<div v-if="canModerate" class="sidebar-card moderation-card">
				<h3 class="card-title">Moderacja</h3>
				<button v-if="!isEditingTopic" @click="isEditingTopic = true" class="btn btn-block btn-primary">
					Edytuj temat
				</button>
				<div v-if="isEditingTopic" class="edit-form">
					<div class="form-group">
						<label class="form-label">Nazwa:</label>
						<input v-model="editForm.name" type="text" class="form-input" />
					</div>
					<div class="form-group">
						<label class="form-label">Opis:</label>
						<textarea v-model="editForm.description" class="form-textarea"></textarea>
					</div>
					<div class="form-actions">
						<button @click="saveTopic" class="btn btn-success">Zapisz</button>
						<button @click="cancelEdit" class="btn btn-secondary">Anuluj</button>
					</div>
					<div v-if="editError" class="error-message">{{ editError }}</div>
				</div>
				<div class="mod-buttons">
					<button @click="showPromoteModal = true" class="btn btn-block btn-info">Promuj</button>
					<button @click="showCreateSubtopic = true" class="btn btn-block btn-primary">Stwórz podtemat</button>
				</div>
			</div>

			<div v-if="canModerate" class="sidebar-card participants-card">
				<TopicParticipantsModeration
					:topic-id="topics.currentTopic._id"
					:topic="topics.currentTopic"
					@changed="handleBlocked"
				/>
			</div>

		</aside>
		<button
			v-if="showReplyJump"
			type="button"
			class="reply-jump-btn"
			@click="scrollToReply"
		>
			Napisz odpowiedź
		</button>
	</div>
		<div v-else class="empty-message">
			Nie znaleziono tematu.
		</div>

		<PromoteModeratorModal 
			:open="showPromoteModal" 
			:topic-id="topics.currentTopic?._id" 
			@close="showPromoteModal = false" 
			@promoted="handlePromoted" />

		<RemoveModeratorModal 
			:open="showRemoveModal" 
			:topic-id="topics.currentTopic?._id"
			:moderator-id="removeModeratorId"
			:moderator-login="removeModeratorLogin"
			@close="showRemoveModal = false" 
			@removed="handleRemoved" />

		<CreateTopicModal 
			:show="showCreateSubtopic" 
			:parent-id="topics.currentTopic?._id" 
			@close="showCreateSubtopic = false" 
			@created="handleCreated" />
	</div>
</template>

<style scoped>
	.topic-view-container {
		padding: 24px;
		background-color: var(--bg);
		min-height: 100vh;
	}

	.alert {
		padding: 20px;
		margin-bottom: 20px;
	}

	.alert-danger {
		background-color: rgba(244, 107, 107, 0.2);
		color: var(--text);
		border: 2px solid var(--danger);
	}

	.loading-message,
	.empty-message {
		text-align: center;
		padding: 40px;
		font-size: 1.1em;
		color: #999;
	}

	.error-message {
		background-color: rgba(244, 107, 107, 0.2);
		color: var(--text);
		padding: 10px;
		margin: 10px 0;
		border-left: 4px solid var(--danger);
	}

	.topic-content {
		max-width: 1000px;
		margin: 0 auto;
	}

	.topic-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(320px, 400px);
		gap: 24px;
		max-width: 1320px;
		margin: 0 auto;
	}

	.topic-main {
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	.topic-sidebar {
		display: flex;
		flex-direction: column;
		gap: 16px;
		height: fit-content;
		position: sticky;
		top: 16px;
	}

	.sidebar-card {
		background-color: var(--panel);
		border: 2px solid var(--border);
		padding: 18px;
	}

	.sidebar-card.moderation-card {
		border-color: var(--border);
	}

	.sidebar-card.post-form-card {
		border-color: var(--border);
	}

	.closed-topic-note {
		background-color: rgba(244, 107, 107, 0.16);
		border: 1px solid var(--danger);
		color: var(--text);
		padding: 10px 12px;
		margin-bottom: 12px;
		font-size: 0.9em;
	}

	.card-title {
		color: var(--accent);
		margin: 0 0 12px 0;
		font-size: 1em;
		border-bottom: 1px solid var(--border);
		padding-bottom: 8px;
	}

	.sidebar-card.moderation-card .card-title {
		border-bottom-color: var(--border);
		color: var(--accent);
	}

	.sidebar-card.post-form-card .card-title {
		border-bottom-color: var(--border);
		color: var(--accent);
	}

	.btn-block {
		width: 100%;
		margin-bottom: 8px;
	}

	.topic-header-section {
		background-color: var(--panel);
		border: 2px solid var(--border);
		padding: 22px;
		margin-bottom: 0;
	}

	.topic-title-area {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 20px;
	}

	.topic-title {
		font-size: 2em;
		font-weight: bold;
		color: var(--accent);
		margin: 0;
		flex: 1;
	}

	.topic-badges {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.badge {
		padding: 6px 12px;
		font-size: 0.85em;
		font-weight: bold;
		white-space: nowrap;
	}

	.badge-closed {
		background-color: var(--danger);
		color: #000;
	}

	.badge-hidden {
		background-color: var(--warning);
		color: #000;
	}

	.badge-owner-blocked {
		background-color: var(--danger);
		color: #000;
		margin-left: 8px;
	}

	.topic-description {
		font-size: 1.1em;
		color: var(--text);
		line-height: 1.6;
		margin: 0 0 20px 0;
	}

	.tags-section {
		margin-bottom: 20px;
	}

	.tags-list {
		display: flex;
		gap: 10px;
		flex-wrap: nowrap;
		overflow-x: auto;
		padding-bottom: 2px;
	}

	.tag-badge {
		background-color: #14301c;
		color: var(--accent);
		padding: 6px 12px;
		border-radius: 4px;
		font-size: 0.9em;
		border: 1px solid var(--border-soft);
		white-space: nowrap;
	}

	.topic-meta {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-top: 0;
		border-top: none;
	}

	.meta-item {
		color: var(--text-soft);
		font-size: 0.95em;
	}

	.meta-label {
		color: var(--accent);
		font-weight: bold;
		display: block;
		margin-bottom: 5px;
	}

	.meta-value {
		color: var(--text);
	}

	.moderators-list {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.subtopics-section {
		margin-bottom: 30px;
	}

	.subtopics-section h3 {
		color: var(--accent);
		border-bottom: 2px solid var(--border);
		padding-bottom: 10px;
		margin-bottom: 15px;
	}

	.subtopics-list {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 15px;
	}

	.subtopic-item {
		background-color: var(--panel-2);
		border: 1px solid var(--border);
		padding: 12px;
		color: var(--text);
	}

	.subtopic-link {
		color: var(--accent);
		text-decoration: none;
	}

	.subtopic-link:hover {
		text-decoration: underline;
	}

	/* Sidebar - Subtopics */
	.topic-sidebar .subtopics-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.topic-sidebar .subtopic-item {
		padding: 10px;
		border: 1px solid var(--border);
		background-color: var(--panel-2);
	}

	.moderator-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background-color: var(--accent);
		color: #8a0000;
		padding: 4px 10px;
		font-size: 0.9em;
		margin: 0;
		position: relative;
		transition: all 0.2s ease;
	}

	.moderator-badge:hover {
		background-color: var(--accent-strong);
	}

	.remove-moderator-btn {
		background: none;
		border: none;
		color: var(--danger);
		cursor: pointer;
		font-size: 1em;
		padding: 0 4px;
		margin-left: 6px;
		transition: all 0.2s ease;
		font-weight: bold;
	}

	.remove-moderator-btn:hover {
		color: var(--danger);
		transform: scale(1.2);
	}

	.make-owner-btn {
		background: none;
		border: none;
		color: #111111;
		cursor: pointer;
		font-size: 0.8em;
		padding: 0 4px;
		margin-left: 6px;
		text-transform: uppercase;
		font-weight: bold;
	}

	.make-owner-btn:hover {
		color: #111111;
		text-decoration: underline;
	}

	.moderators-container {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 8px;
	}

	.moderation-panel {
		background-color: var(--panel-2);
		border: 2px solid var(--border);
		padding: 25px;
		margin-bottom: 30px;
	}

	.panel-title {
		color: var(--accent);
		margin-top: 0;
		border-bottom: 1px solid var(--border);
		padding-bottom: 8px;
	}

	.mod-controls {
		margin-bottom: 20px;
	}

	.edit-form {
		background-color: rgba(0, 0, 0, 0.3);
		padding: 14px;
		margin-top: 12px;
	}

	.form-group {
		margin-bottom: 15px;
	}

	.form-group label,
	.form-label {
		display: block;
		color: var(--accent);
		font-weight: bold;
		margin-bottom: 5px;
	}

	.form-input,
	.form-textarea {
		width: 100%;
		padding: 10px;
		border: 2px solid var(--border);
		background-color: #111111;
		color: #fff;
		font-family: "Pixelify Sans", sans-serif;
		box-sizing: border-box;
	}

	.form-input:focus,
	.form-textarea:focus {
		outline: none;
		border-color: var(--accent-strong);
	}

	.form-textarea {
		resize: vertical;
		min-height: 120px;
	}

	.form-actions {
		display: flex;
		gap: 10px;
		margin-top: 15px;
	}

	.mod-buttons {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.btn {
		padding: 10px 15px;
		border: none;
		font-weight: bold;
		cursor: pointer;
		font-family: "Pixelify Sans", sans-serif;
		border-radius: 4px;
	}

	.btn-primary {
		background-color: var(--accent);
		color: #000;
	}

	.btn-primary:hover {
		background-color: var(--accent-strong);
	}

	.btn-success {
		background-color: var(--success);
		color: #000;
	}

	.btn-success:hover {
		background-color: var(--success);
	}

	.btn-secondary {
		background-color: #2b2b2b;
		color: var(--text);
	}

	.btn-secondary:hover {
		background-color: #3b3b3b;
	}

	.btn-warning {
		background-color: var(--warning);
		color: #000;
	}

	.btn-warning:hover {
		background-color: var(--warning);
	}

	.btn-info {
		background-color: var(--accent);
		color: #000;
	}

	.btn-info:hover {
		background-color: var(--accent-strong);
	}

	.reply-panel {
		background-color: var(--panel);
		border: 2px solid var(--border);
		padding: 18px;
	}

	.discussion-section {
		margin-top: 0;
	}

	.reply-panel .post-list-container {
		max-width: 100%;
	}

	.reply-jump-btn {
		position: fixed;
		left: 50%;
		bottom: 28px;
		transform: translateX(-50%);
		z-index: 40;
		border: 2px solid #0a0a0a;
		background: var(--warning);
		color: #000;
		padding: 12px 18px;
		font-weight: 800;
		letter-spacing: 0.04em;
		box-shadow: 0 10px 22px rgba(0, 0, 0, 0.45);
	}

	.reply-jump-btn:hover {
		background: #ffd166;
	}

	/* Responsywność */
	@media (max-width: 1024px) {
		.topic-layout {
			grid-template-columns: 1fr;
		}

		.topic-sidebar {
			position: static;
			grid-template-columns: repeat(2, 1fr);
			display: grid;
			gap: 20px;
		}
	}

	@media (max-width: 768px) {
		.topic-sidebar {
			display: flex;
			flex-direction: column;
		}
	}
</style>