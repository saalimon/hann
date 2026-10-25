<script>
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { init } from './lib/backend/index.js';
  import { toasts } from './lib/toast.svelte.js';
  import Home from './components/Home.svelte';
  import Bill from './components/Bill.svelte';
  import Join from './components/Join.svelte';
  import SetupHelp from './components/SetupHelp.svelte';

  function parse(hash) {
    const [, kind, id] = hash.replace(/^#/, '').split('/');
    if (kind === 'b' && id) return { name: 'bill', id, key: 'b' + id };
    if (kind === 'j' && id) return { name: 'join', id, key: 'j' + id };
    return { name: 'home', key: 'home' };
  }

  let route = $state(parse(location.hash));
  let status = $state('loading'); // loading | ready | error
  let error = $state(null);

  onMount(() => {
    const onHash = () => {
      route = parse(location.hash);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    init()
      .then(() => (status = 'ready'))
      .catch((err) => {
        error = err;
        status = 'error';
      });
    return () => window.removeEventListener('hashchange', onHash);
  });
</script>

{#if status === 'loading'}
  <div class="boot" out:fade={{ duration: 160 }}>
    <span class="boot-mark">hann</span>
  </div>
{:else if status === 'error'}
  <SetupHelp {error} />
{:else}
  {#key route.key}
    <main in:fly={{ y: 14, duration: 420, easing: quintOut }}>
      {#if route.name === 'bill'}
        <Bill sid={route.id} />
      {:else if route.name === 'join'}
        <Join token={route.id} />
      {:else}
        <Home />
      {/if}
    </main>
  {/key}
{/if}

<div class="toasts" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast" class:bad={t.tone === 'bad'} in:fly={{ y: 16, duration: 280, easing: quintOut }} out:fade={{ duration: 160 }}>
      {t.text}
    </div>
  {/each}
</div>

<style>
  .boot {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
  }
  .boot-mark {
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.05em;
    animation: breathe 1.4s var(--ease-out) infinite alternate;
  }
  @keyframes breathe {
    from {
      opacity: 0.25;
    }
    to {
      opacity: 1;
    }
  }
  main {
    min-height: 100dvh;
    padding-bottom: 96px;
  }
  .toasts {
    position: fixed;
    left: 50%;
    bottom: calc(20px + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    display: grid;
    gap: 8px;
    justify-items: center;
    z-index: 100;
    pointer-events: none;
    width: max-content;
    max-width: calc(100vw - 32px);
  }
  .toast {
    background: var(--ink);
    color: #000;
    padding: 12px 18px;
    border-radius: var(--r-pill);
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  }
  .toast.bad {
    background: var(--coral);
    color: #fff;
  }
</style>
