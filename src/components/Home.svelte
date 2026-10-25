<script>
  import { fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { quintOut } from 'svelte/easing';
  import { createSession } from '../lib/backend/index.js';
  import { childId } from '../lib/ids.js';
  import { parsePromptPayId, sanitizeId } from '../lib/promptpay.js';
  import { recentBills, rememberBill, forgetBill, setMe } from '../lib/local-prefs.js';
  import { toast, explainError } from '../lib/toast.svelte.js';
  import Nav from './Nav.svelte';
  import Icon from './Icon.svelte';
  import QR from './QR.svelte';

  let title = $state('');
  let name = $state('');
  let promptpay = $state('');
  let busy = $state(false);
  let bills = $state(recentBills());

  const ppInvalid = $derived(promptpay.trim() !== '' && !parsePromptPayId(promptpay));
  const appUrl = location.origin + location.pathname;
  const dateFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' });

  async function create(e) {
    e.preventDefault();
    if (busy || ppInvalid) return;
    busy = true;
    try {
      const billTitle = title.trim() || 'บิลใหม่';
      const firstMember = name.trim()
        ? { id: childId(), data: { name: name.trim(), promptpay: sanitizeId(promptpay) } }
        : null;
      const sid = await createSession({ title: billTitle, firstMember });
      rememberBill(sid, billTitle);
      if (firstMember) setMe(sid, firstMember.id);
      location.hash = `#/b/${sid}`;
    } catch (err) {
      toast(explainError(err), { tone: 'bad' });
      busy = false;
    }
  }

  function forget(sid) {
    forgetBill(sid);
    bills = recentBills();
  }
</script>

<Nav />

<section class="container hero">
  <div class="intro">
    <h1 class="display-xl">หารกันง่าย ๆ<br />โอนด้วย QR</h1>
    <p class="body-lg muted lead">
      จดว่าใครจ่ายอะไร แอปคิดให้ว่าใครต้องโอนให้ใครเท่าไร แล้วสร้าง QR พร้อมเพย์ตามยอดจริงให้สแกนได้ทันที
    </p>

    <form class="card create stack" style="--gap: 14px" onsubmit={create}>
      <label class="field">
        <span>ชื่อบิล</span>
        <input class="input" bind:value={title} placeholder="ชาบูวันศุกร์, ทริปเขาใหญ่" maxlength="60" />
      </label>
      <div class="two">
        <label class="field">
          <span>ชื่อคุณ</span>
          <input class="input" bind:value={name} placeholder="ต้น" maxlength="30" autocomplete="given-name" />
        </label>
        <label class="field">
          <span>พร้อมเพย์ของคุณ</span>
          <input
            class="input num"
            bind:value={promptpay}
            placeholder="ไม่บังคับ"
            inputmode="numeric"
            autocomplete="tel"
            aria-invalid={ppInvalid}
          />
        </label>
      </div>
      {#if ppInvalid}
        <p class="hint" transition:fly={{ y: -4, duration: 180 }}>
          ใส่เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก
        </p>
      {/if}
      <button class="btn block" disabled={busy || ppInvalid}>
        {busy ? 'กำลังสร้าง…' : 'สร้างบิล'}
      </button>
    </form>
  </div>

  <aside class="spotlight preview" aria-label="ตัวอย่างหน้าโอนเงิน">
    <p class="who">ฝน <span>โอนให้</span> ต้น</p>
    <p class="amount num">฿420<span>.00</span></p>
    <div class="qr-tile">
      <QR text={appUrl} label="ตัวอย่าง QR" />
    </div>
    <p class="note">ทุกคนเปิดลิงก์เดียวกัน เห็นยอดตรงกัน และสแกนจ่ายจากแอปธนาคารได้เลย</p>
  </aside>
</section>

{#if bills.length}
  <section class="container recent">
    <h2 class="display-md">บิลบนเครื่องนี้</h2>
    <ul class="grid">
      {#each bills as b (b.sid)}
        <li animate:flip={{ duration: 320, easing: quintOut }} out:fly={{ x: -12, duration: 200 }}>
          <a class="bill card" href={`#/b/${b.sid}`}>
            <span class="headline">{b.title}</span>
            <span class="caption muted">เปิดล่าสุด {dateFmt.format(b.at)}</span>
          </a>
          <button class="icon-btn forget" aria-label={`ลบ ${b.title} ออกจากเครื่องนี้`} onclick={() => forget(b.sid)}>
            <Icon name="close" size={16} />
          </button>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .hero {
    display: grid;
    gap: 40px;
    padding-top: 48px;
    align-items: start;
  }
  @media (min-width: 960px) {
    .hero {
      grid-template-columns: 1.25fr 1fr;
      gap: 56px;
      padding-top: 72px;
    }
  }
  .intro {
    display: grid;
    gap: 24px;
  }
  .lead {
    margin: 0;
    max-width: 34em;
  }
  .create {
    margin-top: 8px;
  }
  .two {
    display: grid;
    gap: 14px;
  }
  @media (min-width: 560px) {
    .two {
      grid-template-columns: 1fr 1fr;
    }
  }
  .hint {
    margin: -4px 0 0;
    font-size: 13px;
    color: var(--coral);
  }

  .preview {
    display: grid;
    gap: 14px;
    justify-items: start;
    padding: 32px;
  }
  @media (min-width: 960px) {
    .preview {
      position: sticky;
      top: 96px;
      margin-top: 8px;
    }
  }
  .who {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .who span {
    font-weight: 400;
    opacity: 0.8;
  }
  .amount {
    margin: 0;
    font-size: clamp(56px, 9vw, 84px);
    font-weight: 600;
    line-height: 0.95;
    letter-spacing: -0.05em;
  }
  .amount span {
    font-size: 0.45em;
    letter-spacing: -0.02em;
    opacity: 0.7;
  }
  .qr-tile {
    width: min(220px, 60vw);
    padding: 16px;
    background: #fff;
    border-radius: var(--r-xl);
    margin-top: 6px;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
  }
  .note {
    margin: 4px 0 0;
    max-width: 26em;
    font-size: 15px;
    opacity: 0.88;
  }

  .recent {
    margin-top: 96px;
    display: grid;
    gap: 20px;
  }
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 12px;
  }
  @media (min-width: 810px) {
    .grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  .grid li {
    position: relative;
  }
  .bill {
    display: grid;
    gap: 6px;
    padding-right: 64px;
    color: var(--ink);
    text-decoration: none;
    transition:
      background-color var(--dur) var(--ease-out),
      transform var(--dur-fast) var(--ease-out);
  }
  .bill:hover {
    background: var(--surface-2);
    text-decoration: none;
  }
  .bill:active {
    transform: scale(0.985);
  }
  .forget {
    position: absolute;
    top: calc(50% - 20px);
    right: 14px;
    background: transparent;
    color: var(--ink-muted);
  }
  .forget:hover {
    color: var(--ink);
  }
</style>
