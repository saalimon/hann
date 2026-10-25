<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { getSlip } from '../lib/backend/index.js';
  import { formatBaht } from '../lib/money.js';
  import Sheet from './Sheet.svelte';

  let { sid, payment, fromName, toName, onclose } = $props();

  let src = $state(null);
  let phase = $state('loading'); // loading | ok | missing

  onMount(() => {
    getSlip(sid, payment.id)
      .then((data) => {
        src = data;
        phase = data ? 'ok' : 'missing';
      })
      .catch(() => (phase = 'missing'));
  });
</script>

<Sheet title="สลิปการโอน" {onclose}>
  <p class="muted lead">
    {fromName} โอนให้ {toName} <span class="num">฿{formatBaht(payment.amount)}</span>
    ตรวจยอด เวลา และชื่อผู้รับในสลิปกับแอปธนาคารของคุณอีกครั้ง
  </p>
  <div class="frame">
    {#if phase === 'loading'}
      <div class="skeleton"></div>
    {:else if phase === 'ok'}
      <img {src} alt={`สลิปที่ ${fromName} แนบ`} in:fade={{ duration: 260 }} />
    {:else}
      <p class="muted">ไม่พบรูปสลิป อาจถูกลบไปแล้ว</p>
    {/if}
  </div>
</Sheet>

<style>
  .lead {
    margin: 0;
  }
  .frame {
    display: grid;
    place-items: center;
    min-height: 240px;
    border-radius: var(--r-xl);
    background: var(--surface-1);
    overflow: hidden;
  }
  img {
    display: block;
    width: 100%;
    max-height: 70dvh;
    object-fit: contain;
    background: #fff;
  }
  .skeleton {
    width: 100%;
    height: 360px;
    background: linear-gradient(90deg, var(--surface-1), var(--surface-2), var(--surface-1));
    background-size: 200% 100%;
    animation: shimmer 1.2s linear infinite;
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
</style>
