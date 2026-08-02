// Self-hosted so they load under the site's CSP (font-src 'self'), and so the page never
// depends on a third-party font CDN being up.
// IBM Plex Sans carries the headings, IBM Plex Mono the structural labels — a superfamily built
// for technical products, which is what this portfolio is about. Inter does the reading.
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource-variable/inter';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';

import './style.css'
import "@mdi/font/css/materialdesignicons.css";


import { createApp } from 'vue'
import { createPinia } from 'pinia'
import vuetify from "./plugins/vuetify";


import App from './App.vue'
import router from './router'


const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify);
app.mount('#app')
