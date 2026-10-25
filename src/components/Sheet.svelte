<script>
  // Bottom sheet on phones, centred panel on wider screens.
  import { fade, fly } from 'svelte/transition';
  import { quintOut, cubicIn } from 'svelte/easing';
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  let { title, onclose, children } = $props();
  let panel;

  onMount(() => {
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => panel?.focus());
    const onKey = (e) => e.key === 'Escape' && onclose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  });

  const wide = matchMedia('(min-width: 720px)').matches;
</script>

<div class="backdrop" transition:fade={{ duration: 220 }} onclick={onclose} aria-hidden="true"></div>
<div
  class="panel"
  role="dialog"
  aria-modal="true"
  aria-label={title}
  tabindex="-1"
  bind:this={panel}
  in:fly={{ y: wide ? 24 : 420, duration: wide ? 380 : 460, easing: quintOut, opacity: wide ? 0 : 1 }}
  out:fly={{ y: wide ? 16 : 420, duration: 220, easing: cubicIn, opacity: wide ? 0 : 1 }}
>
  <div class="head spread">
    <h2 class="headline">{title}</h2>
    <button class="icon-btn" onclick={onclose} aria-label="ปิด"><Icon name="close" /></button>
  </div>
  <div class="body">
    {@render children()}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0, 0, 0, 0.66);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }
  .panel {
    position: fixed;
    z-index: 51;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 92dvh;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--canvas);
    border-radius: var(--r-xxl) var(--r-xxl) 0 0;
    box-shadow:
      inset 0 0.5px 0 rgba(255, 255, 255, 0.12),
      0 -20px 60px rgba(0, 0, 0, 0.5);
    padding: 16px 16px calc(24px + env(safe-area-inset-bottom));
    outline: none;
  }
  .panel::before {
    content: '';
    display: block;
    width: 40px;
    height: 4px;
    margin: 0 auto 12px;
    border-radius: 4px;
    background: var(--surface-3);
  }
  @media (min-width: 720px) {
    .panel {
      left: 50%;
      right: auto;
      top: 50%;
      bottom: auto;
      width: min(520px, calc(100vw - 48px));
      translate: -50% -50%;
      border-radius: var(--r-xxl);
      padding: 24px;
    }
    .panel::before {
      display: none;
    }
  }
  .head {
    margin-bottom: 16px;
  }
  .body {
    display: grid;
    gap: 16px;
  }
</style>
