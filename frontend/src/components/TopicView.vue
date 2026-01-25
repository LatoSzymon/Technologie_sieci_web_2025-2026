<script setup>
import { onMounted, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useTopicsStore } from '../topics';
import { authStore } from '../auth';

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
	</div>
	<div v-else>
		<em>Nie znaleziono tematu.</em>
	</div>
</template>