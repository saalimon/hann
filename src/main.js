import { mount } from 'svelte';
import '@fontsource-variable/inter/opsz.css';
import '@fontsource/anuphan/thai-400.css';
import '@fontsource/anuphan/thai-500.css';
import '@fontsource/anuphan/thai-600.css';
import './app.css';
import App from './App.svelte';

export default mount(App, { target: document.getElementById('app') });
