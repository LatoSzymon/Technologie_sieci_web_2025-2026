import {createRouter, createWebHistory} from "vue-router";
import Login from './components/Login.vue';
import Register from './components/Register.vue';
import PendingApproval from "./components/PendingApproval.vue";


const routes = [
  { path: '/pending', component: PendingApproval },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;