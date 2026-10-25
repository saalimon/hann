import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base './' keeps asset URLs relative so the build works at
// https://<user>.github.io/hann/ (and anywhere else) without changes.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: { target: 'es2022' },
});
