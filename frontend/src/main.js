import { createApp } from 'vue';
import './style.css';
import 'highlight.js/styles/atom-one-dark.css';
import App from './App.vue';
import router from './routing';
import { createPinia } from 'pinia';
import hljs from 'highlight.js';

const app = createApp(App);

app.directive('highlight', {
  mounted(el) {
    if (el.querySelector('code')) {
      hljs.highlightElement(el.querySelector('code'));
    }
  },
  updated(el) {
    if (el.querySelector('code')) {
      hljs.highlightElement(el.querySelector('code'));
    }
  }
});

app.use(createPinia()).use(router).mount('#app');
