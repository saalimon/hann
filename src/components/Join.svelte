<script>
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { claimInvite } from '../lib/backend/index.js';
  import { rememberBill } from '../lib/local-prefs.js';
  import Nav from './Nav.svelte';

  let { token } = $props();
  let phase = $state('working'); // working | ok | gone | error
  let viaGroup = $state(false);

  onMount(() => {
    let timer;
    claimInvite(token)
      .then(({ sid, multi }) => {
        viaGroup = multi;
        phase = 'ok';
        rememberBill(sid, 'บิลที่ได้รับเชิญ');
        // replace() so the back button never lands on the spent link again
        timer = setTimeout(() => location.replace(`#/b/${sid}`), 900);
      })
      .catch((err) => (phase = err?.code === 'INVITE_GONE' ? 'gone' : 'error'));
    return () => clearTimeout(timer);
  });
</script>

<Nav />

<section class="container join">
  <div class="mark" class:ok={phase === 'ok'} class:bad={phase === 'gone' || phase === 'error'}>
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle class="track" cx="32" cy="32" r="28" />
      <circle class="spin" cx="32" cy="32" r="28" />
      <path class="check" d="M20 33l8 8 16-17" />
      <path class="cross" d="M23 23l18 18M41 23L23 41" />
    </svg>
  </div>

  {#key phase}
    <div class="copy" in:fly={{ y: 10, duration: 360, easing: quintOut }}>
      {#if phase === 'working'}
        <h1 class="display-lg">กำลังเปิดบิล…</h1>
        <p class="body-lg muted">กำลังยืนยันลิงก์เชิญ</p>
      {:else if phase === 'ok'}
        <h1 class="display-lg">เข้าบิลแล้ว</h1>
        <p class="body-lg muted">
          {viaGroup ? 'เครื่องนี้เปิดบิลนี้ได้ตลอด' : 'เครื่องนี้เปิดบิลได้ตลอด ลิงก์เชิญถูกใช้ไปแล้ว'}
        </p>
      {:else if phase === 'gone'}
        <h1 class="display-lg">ลิงก์นี้ใช้ไม่ได้แล้ว</h1>
        <p class="body-lg muted">ลิงก์อาจถูกใช้ไปแล้ว ถูกปิด หรือหมดอายุ ขอลิงก์ใหม่จากเพื่อนในบิล</p>
        <a class="btn" href="#/">ไปหน้าแรก</a>
      {:else}
        <h1 class="display-lg">เปิดลิงก์ไม่สำเร็จ</h1>
        <p class="body-lg muted">ตรวจอินเทอร์เน็ตแล้วลองโหลดหน้านี้ใหม่</p>
        <button class="btn" onclick={() => location.reload()}>ลองอีกครั้ง</button>
      {/if}
    </div>
  {/key}
</section>

<style>
  .join {
    max-width: 640px;
    padding-top: 14vh;
    display: grid;
    gap: 28px;
    justify-items: start;
  }
  .copy {
    display: grid;
    gap: 14px;
    justify-items: start;
  }
  .copy p {
    margin: 0;
  }
  .mark svg {
    width: 64px;
    height: 64px;
    fill: none;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .track {
    stroke: var(--surface-2);
  }
  .spin {
    stroke: var(--ink);
    stroke-dasharray: 60 200;
    transform-origin: 32px 32px;
    animation: spin 0.9s linear infinite;
  }
  .check,
  .cross {
    stroke: var(--ink);
    stroke-dasharray: 60;
    stroke-dashoffset: 60;
  }
  .ok .spin,
  .bad .spin {
    animation: none;
    stroke-dasharray: 176;
    transition: stroke 300ms;
  }
  .ok .spin {
    stroke: var(--success);
  }
  .bad .spin {
    stroke: var(--surface-3);
  }
  .ok .check,
  .bad .cross {
    animation: draw 420ms 120ms var(--ease-out) forwards;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes draw {
    to {
      stroke-dashoffset: 0;
    }
  }
</style>
