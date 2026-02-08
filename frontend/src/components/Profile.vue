<script setup>
import { computed, ref, onMounted } from 'vue';
import { authStore } from '../stores/auth';
import * as userService from '../services/userService';

const auth = authStore();
const user = computed(() => auth.user || {});
const newLogin = ref('');
const isEditing = ref(false);
const error = ref('');
const success = ref('');

const showChangePassword = ref(false);
const passwordForm = ref({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
});
const passwordError = ref('');

onMounted(() => {
    if (!auth.user) auth.fetchUser();
    newLogin.value = auth.user?.login || '';
});

const saveProfile = async () => {
    try {
        error.value = '';
        success.value = '';
        await userService.updateProfile({ login: newLogin.value });
        await auth.fetchUser();
        success.value = 'Profil został zaktualizowany';
        isEditing.value = false;
    } catch (e) {
        error.value = e?.response?.data?.message || 'Błąd';
    }
};

const cancel = () => {
    newLogin.value = auth.user?.login || '';
    isEditing.value = false;
};

const savePassword = async () => {
    try {
        passwordError.value = '';
        if (!passwordForm.value.oldPassword || !passwordForm.value.newPassword) {
            passwordError.value = 'Wypełnij wszystkie pola';
            return;
        }
        await userService.changePassword(passwordForm.value);
        success.value = 'Hasło zostało zmienione';
        showChangePassword.value = false;
        passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
    } catch (e) {
        passwordError.value = e?.response?.data?.message || 'Błąd';
    }
};

const cancelPasswordChange = () => {
    showChangePassword.value = false;
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
    passwordError.value = '';
};
</script>

<template>
	<div class="profile-container">
		<h2 class="profile-title">Mój Profil</h2>
		<div v-if="!auth.isLoggedIn" class="not-logged-in">
			Nie jesteś zalogowany.
		</div>
		<div v-else>
			<!-- User Info Section -->
			<div class="info-section">
				<h3>Informacje o koncie</h3>
				<div class="user-info-grid">
					<div class="info-item">
						<span class="info-label">Login:</span>
						<span class="info-value">{{ user.login }}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Email:</span>
						<span class="info-value">{{ user.mail }}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Rola:</span>
						<span class="info-value info-role">{{ user.role }}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Status:</span>
						<span class="info-value" :class="{ 'status-approved': user.isApprovedByAdmin }">
							{{ user.isApprovedByAdmin ? 'Zaakceptowany' : 'Oczekujący' }}
						</span>
					</div>
				</div>
			</div>

			<!-- Messages -->
			<div v-if="error" class="alert alert-error">{{ error }}</div>
			<div v-if="success" class="alert alert-success">{{ success }}</div>
			
			<!-- Edit Profile Section -->
			<div class="edit-section">
				<h3>Zmień login</h3>
				<button v-if="!isEditing" @click="isEditing = true" class="btn btn-primary">
					Edytuj profil
				</button>
				
				<div v-if="isEditing" class="form-container">
					<div class="form-group">
						<label class="form-label">Nowy login:</label>
						<input v-model="newLogin" type="text" class="form-input" placeholder="Wpisz nowy login" />
					</div>
					<div class="button-group">
						<button @click="saveProfile" class="btn btn-primary">
							Zapisz
						</button>
						<button @click="cancel" class="btn btn-secondary">
							Anuluj
						</button>
					</div>
				</div>
			</div>

			<!-- Password Change Section -->
			<div class="password-section">
				<h3>Zmień hasło</h3>
				<button v-if="!showChangePassword" @click="showChangePassword = true" class="btn btn-primary">
					Zmień hasło
				</button>
				
				<div v-if="showChangePassword" class="form-container">
					<div class="form-group">
						<label class="form-label">Stare hasło:</label>
						<input v-model="passwordForm.oldPassword" type="password" class="form-input" placeholder="Wpisz stare hasło" />
					</div>
					<div class="form-group">
						<label class="form-label">Nowe hasło:</label>
						<input v-model="passwordForm.newPassword" type="password" class="form-input" placeholder="Wpisz nowe hasło" />
					</div>
					<div class="form-group">
						<label class="form-label">Potwierdź hasło:</label>
						<input v-model="passwordForm.confirmPassword" type="password" class="form-input" placeholder="Powtórz nowe hasło" />
					</div>
					<div v-if="passwordError" class="alert alert-error">
						{{ passwordError }}
					</div>
					<div class="button-group">
						<button @click="savePassword" class="btn btn-primary">
							Zmień hasło
						</button>
						<button @click="cancelPasswordChange" class="btn btn-secondary">
							Anuluj
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.profile-container {
	max-width: 600px;
	margin: 0 auto;
	padding: 20px;
}

.profile-title {
	letter-spacing: 1.5px;
	font-size: 2.5em;
	margin-bottom: 30px;
	text-align: center;
	color: var(--accent);
	text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.not-logged-in {
	text-align: center;
	padding: 40px 20px;
	font-size: 1.2em;
	color: var(--accent);
}

/* Info Section */
.info-section {
	background-color: rgba(229, 242, 103, 0.06);
	border: 2px solid var(--border);
	border-radius: 8px;
	padding: 20px;
	margin-bottom: 30px;
}

.info-section h3 {
	color: var(--accent);
	margin-top: 0;
	margin-bottom: 20px;
	font-size: 1.3em;
}

.user-info-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 15px;
}

.info-item {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 5px;
	align-items: center;
}

.info-label {
	font-weight: bold;
	color: var(--accent);
	font-size: 0.9em;
}

.info-value {
	color: var(--text);
	font-size: 1.1em;
	word-break: break-all;
}

.info-role {
	background-color: rgba(229, 242, 103, 0.12);
	padding: 5px 10px;
	border-radius: 4px;
	display: inline-block;
	width: fit-content;
}

.status-approved {
	color: #4ade80;
}

/* Edit and Password Sections */
.edit-section,
.password-section {
	background-color: rgba(229, 242, 103, 0.06);
	border: 2px solid var(--border);
	border-radius: 8px;
	padding: 20px;
	margin-bottom: 20px;
}

.edit-section h3,
.password-section h3 {
	color: var(--accent);
	margin-top: 0;
	margin-bottom: 15px;
	font-size: 1.2em;
}

/* Form Styles */
.form-container {
	display: flex;
	flex-direction: column;
	gap: 15px;
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.form-label {
	color: var(--accent);
	font-weight: 500;
}

.form-input {
	background-color: rgba(0, 0, 0, 0.35);
	border: 2px solid var(--border);
	border-radius: 6px;
	padding: 10px 15px;
	color: var(--text);
	font-size: 1em;
	font-family: inherit;
	transition: all 0.3s ease;
}

.form-input:focus {
	outline: none;
	border-color: var(--accent-strong);
	background-color: rgba(0, 0, 0, 0.5);
}

.form-input::placeholder {
	color: rgba(229, 242, 103, 0.5);
}

/* Buttons */
.btn {
	padding: 10px 20px;
	border: 2px solid var(--border);
	border-radius: 6px;
	font-size: 1em;
	font-family: inherit;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.3s ease;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.btn-primary {
	background-color: var(--accent);
	color: #000000;
}

.btn-primary:hover {
	background-color: var(--accent-strong);
	border-color: var(--accent-strong);
	transform: scale(1.05);
}

.btn-secondary {
	background-color: transparent;
	color: var(--accent);
}

.btn-secondary:hover {
	background-color: rgba(229, 242, 103, 0.12);
	border-color: var(--accent-strong);
}

.button-group {
	display: flex;
	gap: 10px;
	margin-top: 10px;
}

.button-group .btn {
	flex: 0 0 auto;
	min-width: 140px;
}

/* Alerts */
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

/* Responsive */
@media (max-width: 600px) {
	.profile-container {
		padding: 10px;
	}

	.user-info-grid {
		grid-template-columns: 1fr;
	}

	.button-group {
		flex-direction: column;
	}

	.button-group .btn {
		width: 100%;
	}
}
</style>