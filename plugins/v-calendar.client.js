import { createApp } from 'vue';
import VCalendar from 'v-calendar';
import 'v-calendar/style.css';

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.use(VCalendar, {});
}); 