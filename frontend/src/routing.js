import {createRouter, createWebHistory} from "vue-router";
import Login from './components/Login.vue';
import Register from './components/Register.vue';
import PendingApproval from "./components/PendingApproval.vue";
import AdminDashboard from "./components/AdminDashboard.vue";
import { authStore } from "./auth";
import Home from "./components/Home.vue";
import Topics from "./components/Topics.vue";

const routes = [
  { path: '/pending', component: PendingApproval,
    //  meta: {requiresAuth: true, requiresApproval: false}
    },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  {path: '/topics', component: Topics, meta: {
    requiresAuth: true, requiresApproval: true
  }},

  {path: '/home', component: Home,
    meta: {requiresAuth: true, requiresApproval: true},
    children: [
      {
        path: '/admin',
        component: AdminDashboard,
        meta: {requiresAdmin: true}
      }
    ]
  }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});


router.beforeEach((to, from, next) => {
  const auth = authStore();

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return next('/login');
  }

  if (to.meta.requiresApproval && !auth.isApproved) {
    return next('/pending');
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return next('/app');
  }

  next();
})

export default router;