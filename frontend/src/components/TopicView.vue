<script setup>
import { onMounted, watch, computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useTopicsStore } from '../topics';
import { authStore } from '../auth';
import PostList from './PostList.vue';
import BlockUserModal from './moderation/BlockUserModal.vue';
import CreateSubtopicModal from './moderation/CreateSubtopicModal.vue';

const route = useRoute();
const topics = useTopicsStore();
const auth = authStore();

const loadTopic = () => {
	const id = route.params.id;
	if (id) {
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
  // bannedUsersIds can be array of strings or objects
  return topic.bannedUsersIds.some(
    id => (typeof id === 'object' ? id._id === userId : id === userId)
  );
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

const handleBlocked = () => {
	// Refresh topic to reflect banned list change
	topics.fetchTopic(route.params.id);
};
const handleCreated = () => {
	// Refresh children
	topics.fetchTopic(route.params.id);
};
</script>

<template>
	<div v-if="topics.loading">Ładowanie...</div>
	<div v-else-if="topics.error">Błąd: {{ topics.error }}</div>
	<div v-else-if="isBanned">
		<div style="color: red; font-weight: bold;">Nie masz dostępu do tego tematu (zostałeś zbanowany).</div>
	</div>
	<div v-else-if="topics.currentTopic">
		<h2>{{ topics.currentTopic.name }}</h2>
		<p>{{ topics.currentTopic.description }}</p>
		<div v-if="topics.currentTopic.tags && topics.currentTopic.tags.length">
			<span v-for="tag in topics.currentTopic.tags" :key="tag">{{ tag }}</span>
		</div>
		<div v-if="topics.currentTopic.isClosed" style="color: red;">(Temat zamknięty)</div>
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
			<small>Moderatorzy: <span v-for="mod in topics.currentTopic.moderatorsId" :key="mod._id">{{ mod.login }}</span></small>
		</div>

				<div v-if="canModerate" style="margin: 1rem 0; border-top: 1px solid #eee; padding-top: 1rem;">
						<h3>Moderacja</h3>
						<button @click="showBlockModal = true">Blokuj/Odblokuj użytkownika</button>
						<button style="margin-left:0.5rem" @click="showCreateSubtopic = true">Utwórz podtemat</button>
				</div>

				<BlockUserModal 
					:open="showBlockModal" 
					:topic-id="topics.currentTopic._id" 
					@close="showBlockModal = false" 
					@blocked="handleBlocked" 
					@unblocked="handleBlocked" />

				<CreateSubtopicModal 
					:open="showCreateSubtopic" 
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