<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { listUnapprovedUsers, listBlockedUsers, listAllNonAdminUsers, approveUser, blockUser, unblockUser, deleteUser, closeTopic, openTopic, hideTopic, unhideTopic, getStatistics } from '../services/adminService';
import tagService from '../services/tagService';
import * as topicService from '../services/topicService';
import { useSocketStore } from '../stores/socket';
import Chat from './Chat.vue';

const notifications = ref([]);
const socketStore = useSocketStore();
const handleNotify = (e) => {
	notifications.value.unshift({ ...(e.detail || {}), ts: new Date() });
};

const handleUsersUpdated = (data) => {
	if (data.type === 'blocked' || data.type === 'unblocked') {
		fetchAllUsers();
		fetchBlocked();
	}
};

onMounted(() => {
	window.addEventListener('admin-notify', handleNotify);
	if (window.__adminNotifications) {
		notifications.value = [...window.__adminNotifications].reverse();
	}
	fetchPending();
	fetchBlocked();
	fetchAllUsers();
	fetchAllTopics();
	fetchTags();
	fetchStatistics();
	
	socketStore.on('admin:users-updated', handleUsersUpdated);
});

onBeforeUnmount(() => {
	window.removeEventListener('admin-notify', handleNotify);
	socketStore.off('admin:users-updated', handleUsersUpdated);
});

const pendingUsers = ref([]);
const blockedUsers = ref([]);
const allUsers = ref([]);
const allTopics = ref([]);
const tags = ref([]);
const statistics = ref(null);
const loading = ref(false);
const error = ref('');
const actionInfo = ref('');
const manualUserId = ref('');
const newTagName = ref('');

const fetchPending = async () => {
	loading.value = true;
	error.value = '';
	try {
		pendingUsers.value = await listUnapprovedUsers();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd pobierania listy';
	} finally {
		loading.value = false;
	}
};

const fetchBlocked = async () => {
	try {
		blockedUsers.value = await listBlockedUsers();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd pobierania listy blokowanych';
	}
};

const fetchAllUsers = async () => {
	try {
		allUsers.value = await listAllNonAdminUsers();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd pobierania listy użytkowników';
		console.error(e);
	}
};

const fetchTags = async () => {
	try {
		tags.value = await tagService.getTags();
	} catch (e) {
		error.value = 'Błąd pobierania tagów';
		console.error(e);
	}
};

const fetchAllTopics = async () => {
	try {
		const topicsData = await topicService.getTopicTree();
		allTopics.value = Array.isArray(topicsData) ? topicsData : (topicsData?.topics || []);
		console.log('Loaded topics:', allTopics.value);
	} catch (e) {
		error.value = 'Błąd pobierania tematów';
		console.error('Error loading topics:', e);
	}
};

const fetchStatistics = async () => {
	try {
		statistics.value = await getStatistics();
	} catch (e) {
		error.value = 'Błąd pobierania statystyk';
		console.error(e);
	}
};

const addTag = async () => {
	if (!newTagName.value.trim()) {
		error.value = 'Wpisz nazwę tagu';
		return;
	}
	try {
		await tagService.createTag({ name: newTagName.value.trim() });
		actionInfo.value = 'Dodano tag';
		newTagName.value = '';
		await fetchTags();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd dodawania tagu';
	}
};

const deleteTag = async (tagId) => {
	if (!confirm('Usunąć ten tag?')) return;
	try {
		await tagService.deleteTag(tagId);
		actionInfo.value = 'Usunięto tag';
		await fetchTags();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd usuwania tagu';
	}
};

const approve = async (userId) => {
	actionInfo.value = '';
	try {
		await approveUser(userId);
		actionInfo.value = 'Zaakceptowano użytkownika';
		await fetchPending();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd akceptacji';
	}
};

const block = async (userId) => {
	actionInfo.value = '';
	try {
		await blockUser(userId);
		actionInfo.value = 'Zablokowano użytkownika';
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd blokowania';
	}
};

const unblock = async (userId) => {
	actionInfo.value = '';
	try {
		await unblockUser(userId);
		actionInfo.value = 'Odblokowano użytkownika';
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd odblokowania';
	}
};

const deleteUserAction = async (userId) => {
	if (!confirm('Czy na pewno usunąć tego użytkownika? (Ta operacja jest nieodwracalna)')) return;
	actionInfo.value = '';
	try {
		await deleteUser(userId);
		actionInfo.value = 'Usunięto użytkownika';
		await fetchAllUsers();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd usuwania użytkownika';
	}
};

const closeTopicAction = async (topicId) => {
	if (!confirm('Zamknąć ten temat?')) return;
	try {
		await closeTopic(topicId);
		actionInfo.value = 'Zamknięto temat';
		await fetchAllTopics();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd zamykania tematu';
	}
};

const openTopicAction = async (topicId) => {
	if (!confirm('Otworzyć ten temat?')) return;
	try {
		await openTopic(topicId);
		actionInfo.value = 'Otwarty temat';
		await fetchAllTopics();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd otwierania tematu';
	}
};

const hideTopicAction = async (topicId) => {
	if (!confirm('Ukryć ten temat?')) return;
	try {
		await hideTopic(topicId);
		actionInfo.value = 'Ukryto temat';
		await fetchAllTopics();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd ukrywania tematu';
	}
};

const unhideTopicAction = async (topicId) => {
	if (!confirm('Odkryć ten temat?')) return;
	try {
		await unhideTopic(topicId);
		actionInfo.value = 'Odkryto temat';
		await fetchAllTopics();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd odkrywania tematu';
	}
};

onMounted(fetchPending);
</script>

<template>
	<div class="admin-container">
		<h2 class="admin-title">Panel Administratora</h2>
		<div v-if="loading" class="loading-message">Ładowanie...</div>
		<div v-if="error" class="alert alert-error">{{ error }}</div>
		<div v-if="actionInfo" class="alert alert-success">{{ actionInfo }}</div>

		<section class="admin-section">
			<h3 class="section-title">Powiadomienia</h3>
			<div v-if="notifications.length === 0" class="empty-state">Brak powiadomień.</div>
			<ul v-else class="notifications-list">
				<li v-for="(n, idx) in notifications" :key="idx" class="notification-item">
					<span class="notification-time">{{ n.ts?.toLocaleString?.() || '' }}</span>
					<span v-if="n.type === 'new-user'" class="badge badge-new">Nowa rejestracja</span>
					<span v-else-if="n.type === 'user-approved'" class="badge badge-approved">Akceptacja</span>
					<span v-else class="badge badge-other">Inne</span>
					<span class="notification-message">{{ n.message }}</span>
				</li>
			</ul>
		</section>

		<section class="admin-section">
			<h3 class="section-title">Zarządzanie tagami</h3>
			<div class="tag-management">
				<div class="tag-input-group">
					<input 
						v-model="newTagName" 
						placeholder="Nazwa nowego tagu" 
						@keyup.enter="addTag"
						class="form-input"
					/>
					<button @click="addTag" class="btn btn-primary">Dodaj tag</button>
				</div>
				
				<div class="tags-list-container">
					<div class="list-header">
						<h4>Istniejące tagi ({{ tags.length }})</h4>
					</div>
					<div v-if="tags.length === 0" class="empty-state">Brak tagów</div>
					<div v-else class="tags-grid">
						<div v-for="tag in tags" :key="tag._id" class="tag-item">
							<span class="tag-name">{{ tag.name }}</span>
							<button 
								class="tag-delete-btn"
								@click="deleteTag(tag._id)"
								title="Usuń tag"
							>
								X
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="admin-section">
			<h3 class="section-title">Niezaakceptowani użytkownicy</h3>
			<div v-if="pendingUsers.length === 0" class="empty-state">Brak oczekujących.</div>
			<div v-else class="users-list">
				<div v-for="u in pendingUsers" :key="u._id" class="user-card">
					<div class="user-card-header">
						<strong class="user-login">{{ u.login }}</strong>
						<small class="user-email">{{ u.mail }}</small>
					</div>
					<div class="user-card-actions">
						<button @click="approve(u._id)" class="btn btn-success">Akceptuj</button>
						<button @click="block(u._id)" class="btn btn-danger">Zablokuj</button>
					</div>
				</div>
			</div>
		</section>

		<section class="admin-section">
			<h3 class="section-title">Zablokowani użytkownicy</h3>
			<div v-if="blockedUsers.length === 0" class="empty-state">Brak zablokowanych.</div>
			<div v-else class="users-list">
				<div v-for="u in blockedUsers" :key="u._id" class="user-card">
					<div class="user-card-header">
						<strong class="user-login">{{ u.login }}</strong>
						<small class="user-email">{{ u.mail }}</small>
					</div>
					<div class="user-card-actions">
						<button @click="unblock(u._id)" class="btn btn-success">Odblokuj</button>
					</div>
				</div>
			</div>
		</section>

		<section class="admin-section">
			<h3 class="section-title">Zarządzanie użytkownikami</h3>
			<div v-if="allUsers.length === 0" class="empty-state">Brak użytkowników.</div>
			<div v-else class="users-management">
				<div class="users-count">Wszyscy użytkownicy: <strong>{{ allUsers.length }}</strong></div>
				<div class="users-grid">
					<div v-for="u in allUsers" :key="u._id" class="user-card">
						<div class="user-card-header">
							<strong class="user-login">{{ u.login }}</strong>
							<small class="user-email">{{ u.mail }}</small>
						</div>
						<div class="user-badges">
							<span v-if="u.isBlocked" class="badge badge-blocked">Zablokowany</span>
							<span v-if="!u.isApprovedByAdmin" class="badge badge-pending">Oczekuje</span>
						</div>
						<div class="user-card-actions">
							<button 
								v-if="!u.isBlocked"
								@click="block(u._id)"
								class="btn btn-danger"
								title="Zablokuj użytkownika"
							>
								Blokuj
							</button>
							<button 
								v-else
								@click="unblock(u._id)"
								class="btn btn-success"
								title="Odblokuj użytkownika"
							>
								Odblokuj
							</button>
							<button 
								@click="deleteUserAction(u._id)"
								class="btn btn-danger"
								title="Usuń użytkownika"
							>
								Usuń
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="admin-section">
			<h3 class="section-title">Zarządzanie drzewami tematów</h3>
			<div v-if="allTopics.length === 0" class="empty-state">Brak tematów.</div>
			<div v-else class="topics-grid">
				<div v-for="topic in allTopics" :key="topic._id" class="topic-card">
					<div class="topic-card-header">
						<strong class="topic-name">{{ topic.name }}</strong>
						<div class="topic-badges">
							<span v-if="topic.isClosed" class="badge badge-closed">Zamknięty</span>
							<span v-if="topic.isHidden" class="badge badge-hidden">Ukryty</span>
						</div>
					</div>
					<div class="topic-actions">
						<button 
							v-if="!topic.isClosed"
							@click="closeTopicAction(topic._id)"
							class="btn btn-sm btn-danger"
							title="Zamknij temat"
						>
							Zamknij
						</button>
						<button 
							v-else
							@click="openTopicAction(topic._id)"
							class="btn btn-sm btn-success"
							title="Otwórz temat"
						>
							Otwórz
						</button>
						<button 
							v-if="!topic.isHidden"
							@click="hideTopicAction(topic._id)"
							class="btn btn-sm btn-warning"
							title="Ukryj temat"
						>
							Ukryj
						</button>
						<button 
							v-else
							@click="unhideTopicAction(topic._id)"
							class="btn btn-sm btn-info"
							title="Odkryj temat"
						>
							Odkryj
						</button>
					</div>
				</div>
			</div>
		</section>
		</div>

		<!-- <section class="admin-section">
			<h3 class="section-title">Statystyki</h3>
			<div v-if="!statistics" class="loading-message">Ładowanie statystyk...</div>
			<div v-else>

				<div class="stats-grid">
					<div class="stat-card stat-blue">
						<div class="stat-value">{{ statistics.users.total }}</div>
						<div class="stat-label">Użytkowników</div>
					</div>
					<div class="stat-card stat-green">
						<div class="stat-value">{{ statistics.users.approved }}</div>
						<div class="stat-label">Zaakceptowanych</div>
					</div>
					<div class="stat-card stat-yellow">
						<div class="stat-value">{{ statistics.users.pending }}</div>
						<div class="stat-label">Oczekujących</div>
					</div>
					<div class="stat-card stat-red">
						<div class="stat-value">{{ statistics.users.blocked }}</div>
						<div class="stat-label">Zablokowanych</div>
					</div>
					<div class="stat-card stat-purple">
						<div class="stat-value">{{ statistics.topics.total }}</div>
						<div class="stat-label">Tematów</div>
					</div>
					<div class="stat-card stat-orange">
						<div class="stat-value">{{ statistics.posts.total }}</div>
						<div class="stat-label">Postów</div>
					</div>
				</div>

				<div v-if="statistics.posts.topPostsByLikes && statistics.posts.topPostsByLikes.length" class="stats-subsection">
					<h4 class="subsection-title">Top posty (po likach)</h4>
					<div class="posts-list">
						<div v-for="(post, idx) in statistics.posts.topPostsByLikes" :key="idx" class="post-item">
							<div class="post-rank">{{ idx + 1 }}</div>
							<div class="post-content">
								<div class="post-author">{{ post.author }}</div>
								<div class="post-text">{{ post.content }}</div>
								<div class="post-likes">{{ post.likes }} polubień</div>
							</div>
						</div>
					</div>
				</div>

				<div v-if="statistics.analytics && statistics.analytics.usersByRole && statistics.analytics.usersByRole.length" class="stats-subsection">
					<h4 class="subsection-title">Użytkownicy po rolach</h4>
					<div class="roles-grid">
						<div v-for="role in statistics.analytics.usersByRole" :key="role._id" class="role-card">
							<span class="role-name">{{ role._id || 'user' }}</span>
							<span class="role-count">{{ role.count }}</span>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="admin-section">
			<h3 class="section-title">Chat z użytkownikami</h3>
			<Chat />
		</section>
	</div> na potem mooooże-->
</template>

<style scoped>

.admin-container {
	max-width: 1200px;
	margin: 0 auto;
	padding: 20px;
}

.admin-title {
	font-size: 2.5em;
	margin-bottom: 30px;
	text-align: center;
	color: rgb(238, 255, 0);
	text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.admin-section {
	border-radius: 8px;
	padding: 20px;
	margin-bottom: 20px;
}

.section-title {
	color: rgb(238, 255, 0);
	margin-top: 0;
	margin-bottom: 20px;
	font-size: 1.3em;
}

.empty-state {
	text-align: center;
	padding: 30px 20px;
	color: rgba(238, 255, 0, 0.7);
	font-style: italic;
}

.loading-message {
	text-align: center;
	padding: 20px;
	color: rgb(238, 255, 0);
	font-weight: 500;
}

.alert {
	padding: 15px;
	border-radius: 6px;
	margin-bottom: 20px;
	font-weight: 500;
}

.alert-error {
	background-color: rgba(239, 68, 68, 0.2);
	border: 2px solid #ef4444;
	color: #fca5a5;
}

.alert-success {
	background-color: rgba(74, 222, 128, 0.2);
	border: 2px solid #4ade80;
	color: #86efac;
}

.form-input {
	background-color: rgba(0, 0, 0, 0.3);
	border: 2px solid rgb(238, 255, 0);
	border-radius: 6px;
	padding: 10px 15px;
	color: rgb(238, 255, 0);
	font-size: 1em;
	font-family: inherit;
	transition: all 0.3s ease;
}

.form-input:focus {
	outline: none;
	border-color: rgb(247, 255, 138);
	background-color: rgba(0, 0, 0, 0.5);
}

.form-input::placeholder {
	color: rgba(238, 255, 0, 0.5);
}


.btn {
	padding: 10px 16px;
	border: 2px solid rgb(238, 255, 0);
	border-radius: 6px;
	font-size: 0.9em;
	font-family: inherit;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.3s ease;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.btn-primary {
	background-color: rgb(238, 255, 0);
	color: #000000;
	border-color: rgb(238, 255, 0);
}

.btn-primary:hover {
	background-color: rgb(247, 255, 138);
	border-color: rgb(247, 255, 138);
	transform: scale(1.05);
}

.btn-success {
	background-color: rgba(74, 222, 128, 0.9);
	color: #000000;
	border-color: #4ade80;
}

.btn-success:hover {
	background-color: #4ade80;
	border-color: rgb(247, 255, 138);
	transform: scale(1.05);
}

.btn-danger {
	background-color: rgba(239, 68, 68, 0.9);
	color: #ffffff;
	border-color: #ef4444;
}

.btn-danger:hover {
	background-color: #ef4444;
	border-color: rgb(247, 255, 138);
	transform: scale(1.05);
}

.btn-warning {
	background-color: rgba(249, 115, 22, 0.9);
	color: #ffffff;
	border-color: #f97316;
}

.btn-warning:hover {
	background-color: #f97316;
	border-color: rgb(247, 255, 138);
	transform: scale(1.05);
}

.btn-info {
	background-color: rgba(59, 130, 246, 0.9);
	color: #ffffff;
	border-color: #3b82f6;
}

.btn-info:hover {
	background-color: #3b82f6;
	border-color: rgb(247, 255, 138);
	transform: scale(1.05);
}

.btn-sm {
	padding: 6px 12px;
	font-size: 0.8em;
}

.notifications-list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.notification-item {
	background-color: rgba(238, 255, 0, 0.05);
	border-left: 4px solid rgb(238, 255, 0);
	padding: 12px;
	border-radius: 4px;
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

.notification-time {
	color: rgba(238, 255, 0, 0.6);
	font-size: 0.85em;
	min-width: 140px;
}

.notification-message {
	color: rgb(238, 255, 0);
	flex: 1;
}

.badge {
	display: inline-block;
	padding: 4px 10px;
	border-radius: 4px;
	font-size: 0.8em;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.badge-new {
	background-color: #4ade80;
	color: #000000;
}

.badge-approved {
	background-color: #3b82f6;
	color: #ffffff;
}

.badge-other {
	background-color: rgb(238, 255, 0);
	color: #000000;
}

.badge-blocked {
	background-color: rgba(239, 68, 68, 0.3);
	color: #fca5a5;
	border: 1px solid #ef4444;
}

.badge-pending {
	background-color: rgba(249, 115, 22, 0.3);
	color: #fed7aa;
	border: 1px solid #f97316;
}

.badge-closed {
	background-color: rgba(239, 68, 68, 0.3);
	color: #fca5a5;
	border: 1px solid #ef4444;
}

.badge-hidden {
	background-color: rgba(249, 115, 22, 0.3);
	color: #fed7aa;
	border: 1px solid #f97316;
}

.tag-management {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 20px;
}

.tag-input-group {
	display: flex;
	gap: 10px;
}

.tag-input-group .form-input {
	flex: 1;
	max-width: 400px;
}

.tags-list-container {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.list-header h4 {
	color: rgb(238, 255, 0);
	margin: 0 0 10px 0;
	font-size: 1.1em;
}

.tags-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}

.tag-item {
	display: flex;
	align-items: center;
	gap: 8px;
	background-color: rgba(238, 255, 0, 0.1);
	border: 1px solid rgb(238, 255, 0);
	padding: 8px 12px;
	border-radius: 20px;
	color: rgb(238, 255, 0);
}

.tag-name {
	font-weight: 500;
}

.tag-delete-btn {
	padding: 0;
	width: 20px;
	height: 20px;
	min-width: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #ef4444;
	border: none;
	border-radius: 50%;
	font-size: 1em;
	line-height: 1;
	color: white;
	cursor: pointer;
	transition: all 0.3s ease;
}

.tag-delete-btn:hover {
	background-color: #dc2626;
	transform: scale(1.15);
}

.users-list,
.users-management {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.users-count {
	color: rgb(238, 255, 0);
	font-weight: 500;
	margin-bottom: 10px;
}

.users-count strong {
	color: rgb(247, 255, 138);
	font-size: 1.2em;
}

.users-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
	gap: 15px;
}

.user-card {
	border: 4px solid rgb(238, 255, 0);
	border-radius: 6px;
	padding: 15px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.user-card:hover {
	background-color: rgba(238, 255, 0, 0.08);
}

.user-card-header {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.user-login {
	color: rgb(238, 255, 0);
	font-size: 1.1em;
}

.user-email {
	color: rgba(238, 255, 0, 0.6);
	font-size: 0.9em;
}

.user-badges {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.user-card-actions {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.user-card-actions .btn {
	flex: 1;
	min-width: 80px;
}

.topics-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
	gap: 15px;
}

.topic-card {
	background-color: rgba(0, 0, 0, 0.05);
	border: 4px solid rgb(238, 255, 0);
	border-radius: 6px;
	padding: 15px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.topic-card:hover {
	background-color: rgba(238, 255, 0, 0.08);
}

.topic-card-header {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.topic-name {
	color: rgb(238, 255, 0);
	font-size: 1.1em;
}

.topic-badges {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.topic-actions {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.topic-actions .btn {
	flex: 1;
	min-width: 80px;
}

.stats-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 15px;
	margin-bottom: 30px;
}

.stat-card {
	background: linear-gradient(135deg, rgba(238, 255, 0, 0.1) 0%, rgba(238, 255, 0, 0.05) 100%);
	border: 2px solid rgb(238, 255, 0);
	border-radius: 8px;
	padding: 20px;
	text-align: center;
	display: flex;
	flex-direction: column;
	gap: 10px;
	transition: all 0.3s ease;
}

.stat-card:hover {
	transform: translateY(-5px);
	background: linear-gradient(135deg, rgba(238, 255, 0, 0.15) 0%, rgba(238, 255, 0, 0.08) 100%);
}

.stat-blue {
	border-color: #3b82f6;
}

.stat-green {
	border-color: #4ade80;
}

.stat-yellow {
	border-color: rgb(238, 255, 0);
}

.stat-red {
	border-color: #ef4444;
}

.stat-purple {
	border-color: #a855f7;
}

.stat-orange {
	border-color: #f97316;
}

.stat-value {
	font-size: 2.5em;
	font-weight: bold;
	color: rgb(238, 255, 0);
}

.stat-label {
	font-size: 0.95em;
	color: rgba(238, 255, 0, 0.8);
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.stats-subsection {
	margin-top: 20px;
	padding-top: 20px;
	border-top: 1px solid rgba(238, 255, 0, 0.2);
}

.subsection-title {
	color: rgb(238, 255, 0);
	margin: 0 0 15px 0;
	font-size: 1.15em;
}

.posts-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.post-item {
	display: flex;
	gap: 15px;
	background-color: rgba(238, 255, 0, 0.05);
	border-left: 4px solid rgb(238, 255, 0);
	padding: 12px;
	border-radius: 4px;
}

.post-rank {
	min-width: 40px;
	height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: rgb(238, 255, 0);
	color: #000000;
	border-radius: 50%;
	font-weight: bold;
	font-size: 1.1em;
}

.post-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.post-author {
	font-weight: 600;
	color: rgb(238, 255, 0);
	font-size: 0.95em;
}

.post-text {
	color: rgb(247, 255, 138);
	font-size: 0.9em;
	line-height: 1.4;
}

.post-likes {
	color: rgba(238, 255, 0, 0.7);
	font-size: 0.85em;
	font-weight: 500;
}

.roles-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 10px;
}

.role-card {
	background-color: rgba(238, 255, 0, 0.05);
	border: 1px solid rgb(238, 255, 0);
	border-radius: 6px;
	padding: 15px;
	text-align: center;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.role-name {
	color: rgb(238, 255, 0);
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	font-size: 0.9em;
}

.role-count {
	color: rgb(247, 255, 138);
	font-size: 1.8em;
	font-weight: bold;
}

.chat-section {
	margin-top: 30px;
}


@media (max-width: 768px) {
	.admin-container {
		padding: 10px;
	}

	.admin-title {
		font-size: 1.8em;
	}

	.users-grid,
	.topics-grid {
		grid-template-columns: 1fr;
	}

	.stats-grid {
		grid-template-columns: repeat(2, 1fr);
	}

	.tag-input-group {
		flex-direction: column;
	}

	.tag-input-group .form-input {
		max-width: 100%;
	}

	.user-card-actions,
	.topic-actions {
		flex-direction: column;
	}

	.user-card-actions .btn,
	.topic-actions .btn {
		width: 100%;
	}
}
</style>