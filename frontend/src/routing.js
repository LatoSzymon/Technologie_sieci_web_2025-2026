import {createRouter, createWebHistory} from "vue-router";
import Login from './components/Login.vue'
import Register from './components/Register.vue'
import Topics from './components/Topics.vue'
import Chat from './components/Chat.vue'
import TopicView from "./components/TopicView.vue";

const routes = [
  { path: '/', component: Topics },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/topics/:id', component: TopicView },
  { path: '/chat', component: Chat }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router