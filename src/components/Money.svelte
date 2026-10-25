<script>
  // Big baht figure that rolls to its new value when the total changes.
  import { Tween, prefersReducedMotion } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { splitBaht } from '../lib/money.js';

  let { value = 0, class: cls = '', symbol = true } = $props();

  const tween = new Tween(0, { duration: 700, easing: cubicOut });
  $effect(() => {
    tween.set(value, { duration: prefersReducedMotion.current ? 0 : 700 });
  });

  const parts = $derived(splitBaht(Math.round(tween.current)));
</script>

<span class="money num {cls}" aria-label={`${(value / 100).toFixed(2)} บาท`}>
  {#if symbol}<span class="sym">฿</span>{/if}{parts[0]}<span class="dec">.{parts[1]}</span>
</span>

<style>
  .money {
    display: inline-flex;
    align-items: baseline;
    white-space: nowrap;
  }
  .sym {
    font-size: 0.62em;
    margin-right: 0.04em;
    opacity: 0.55;
    letter-spacing: 0;
  }
  .dec {
    font-size: 0.5em;
    opacity: 0.55;
    letter-spacing: -0.01em;
  }
</style>
