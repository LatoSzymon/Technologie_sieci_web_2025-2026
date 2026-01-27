<script setup>
import { computed, ref, onMounted } from 'vue';
import { authStore } from '../auth';
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
	<div>
		<h2>Profil</h2>
		<div v-if="!auth.isLoggedIn">Nie jesteś zalogowany.</div>
		<div v-else>
			<p><strong>Login:</strong> {{ user.login }}</p>
			<p><strong>Email:</strong> {{ user.mail }}</p>
			<p><strong>Rola:</strong> {{ user.role }}</p>
			<p><strong>Zaakceptowany:</strong> {{ user.isApprovedByAdmin ? 'Tak' : 'Nie' }}</p>
			
			<div v-if="error" class="error-alert">{{ error }}</div>
			<div v-if="success" class="success-alert">{{ success }}</div>
			
			<div class="profile-edit-section">
				<h3>Edycja Profilu</h3>
				<button v-if="!isEditing" @click="isEditing = true" class="btn-edit-profile">
					Edytuj profil
				</button>
				
				<div v-if="isEditing" class="edit-form">
					<label class="form-label">
						Nowy login:
						<input v-model="newLogin" type="text" class="form-input" />
					</label>
					<button @click="saveProfile" class="btn-save">
						Zapisz
					</button>
					<button @click="cancel" class="btn-cancel">
						Anuluj
					</button>
				</div>
			</div>

			<div class="password-change-section">
				<h3>Zmiana Hasła</h3>
				<button v-if="!showChangePassword" @click="showChangePassword = true" class="btn-change-password">
					Zmień hasło
				</button>
				
				<div v-if="showChangePassword" class="password-form">
					<div class="form-group">
						<label class="form-label">
							Stare hasło:
							<input v-model="passwordForm.oldPassword" type="password" class="form-input" />
						</label>
					</div>
					<div class="form-group">
						<label class="form-label">
							Nowe hasło:
							<input v-model="passwordForm.newPassword" type="password" class="form-input" />
						</label>
					</div>
					<div class="form-group">
						<label class="form-label">
							Potwierdź hasło:
							<input v-model="passwordForm.confirmPassword" type="password" class="form-input" />
						</label>
					</div>
					<div v-if="passwordError" class="error-alert">
						{{ passwordError }}
					</div>
					<button @click="savePassword" class="btn-save">
						Zmień hasło
					</button>
					<button @click="cancelPasswordChange" class="btn-cancel">
						Anuluj
					</button>
				</div>
			</div>
		</div>
	</div>
</template>