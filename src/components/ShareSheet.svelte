<script>
  import { fly, slide } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { quintOut } from 'svelte/easing';
  import { createInvite, revokeInvite } from '../lib/backend/index.js';
  import { toast, explainError } from '../lib/toast.svelte.js';
  import Sheet from './Sheet.svelte';
  import QR from './QR.svelte';
  import Icon from './Icon.svelte';

  let { sid, title, invites = {}, onclose } = $props();

  let creating = $state(false);
  let latest = $state(null);
  let copied = $state(false);

  const base = location.origin + location.pathname;
  const linkFor = (token) => `${base}#/j/${token}`;
  const timeFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const list = $derived(
    Object.entries(invites || {})
      .map(([token, v]) => ({ token, ...v }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  );
  const latestUsed = $derived(latest && invites?.[latest]?.usedBy);

  async function create() {
    creating = true;
    copied = false;
    try {
      latest = await createInvite(sid);
    } catch (err) {
      toast(explainError(err), { tone: 'bad' });
    } finally {
      creating = false;
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(linkFor(latest));
      copied = true;
      setTimeout(() => (copied = false), 1800);
    } catch {
      toast('คัดลอกไม่ได้ กดค้างที่ลิงก์เพื่อคัดลอกเอง', { tone: 'bad' });
    }
  }

  async function share() {
    try {
      await navigator.share({ title: `hann: ${title}`, text: `เข้าบิล "${title}" (ลิงก์ใช้ได้ครั้งเดียว)`, url: linkFor(latest) });
    } catch {
      /* user cancelled */
    }
  }

  async function revoke(token) {
    try {
      await revokeInvite(sid, token);
      if (latest === token) latest = null;
      toast('ยกเลิกลิงก์แล้ว');
    } catch (err) {
      toast(explainError(err), { tone: 'bad' });
    }
  }

  function status(inv) {
    if (inv.usedBy) return `ใช้แล้ว ${inv.usedAt ? timeFmt.format(inv.usedAt) : ''}`;
    if (inv.expiresAt < Date.now()) return 'หมดอายุ';
    return 'ยังไม่มีคนเปิด';
  }
</script>

<Sheet title="ชวนเพื่อนเข้าบิล" {onclose}>
  <p class="muted lead">
    ลิงก์แต่ละอันเปิดได้ครั้งเดียว คนแรกที่เปิดจะเข้าบิลได้ถาวรบนเครื่องนั้น แล้วลิงก์จะใช้ไม่ได้อีก
    สร้างแยกให้แต่ละคน ลิงก์ที่ไม่มีใครเปิดหมดอายุใน 7 วัน
  </p>

  {#if latest}
    <div class="link card lift" in:fly={{ y: 12, duration: 380, easing: quintOut }}>
      <div class="qr-tile" class:used={latestUsed}>
        <QR text={linkFor(latest)} label="QR ของลิงก์เข้าบิล" />
        {#if latestUsed}
          <span class="used-badge" in:fly={{ y: 6, duration: 260 }}><Icon name="check" />มีคนเปิดแล้ว</span>
        {/if}
      </div>
      <div class="link-side stack" style="--gap: 10px">
        <p class="url num">{linkFor(latest)}</p>
        <div class="row" style="--gap: 8px; flex-wrap: wrap">
          <button class="btn small" onclick={copy} disabled={latestUsed}>
            {#key copied}
              <span class="swap" in:fly={{ y: 8, duration: 220 }}>
                <Icon name={copied ? 'check' : 'copy'} size={16} />{copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
              </span>
            {/key}
          </button>
          {#if typeof navigator !== 'undefined' && navigator.share}
            <button class="btn secondary small" onclick={share} disabled={latestUsed}>
              <Icon name="share" size={16} />แชร์
            </button>
          {/if}
        </div>
        <p class="caption muted">ให้เพื่อนสแกน QR นี้จากมือถือได้เลย</p>
      </div>
    </div>
  {/if}

  <button class="btn" class:secondary={latest} onclick={create} disabled={creating}>
    <Icon name="link" />{creating ? 'กำลังสร้าง…' : latest ? 'สร้างลิงก์ให้อีกคน' : 'สร้างลิงก์ใช้ครั้งเดียว'}
  </button>

  {#if list.length}
    <div class="history">
      <h3 class="caption muted">ลิงก์ที่สร้างแล้ว</h3>
      <ul>
        {#each list as inv (inv.token)}
          <li animate:flip={{ duration: 300 }} in:slide={{ duration: 240 }} out:slide={{ duration: 200 }}>
            <span class="dot" class:on={!inv.usedBy && inv.expiresAt > Date.now()}></span>
            <span class="meta">
              <span class="num">…{inv.token.slice(-6)}</span>
              <span class="muted">{status(inv)}</span>
            </span>
            {#if !inv.usedBy}
              <button class="btn quiet small" onclick={() => revoke(inv.token)}>ยกเลิก</button>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</Sheet>

<style>
  .lead {
    margin: 0;
  }
  .link {
    display: grid;
    gap: 18px;
    align-items: center;
  }
  @media (min-width: 480px) {
    .link {
      grid-template-columns: 150px 1fr;
    }
  }
  .qr-tile {
    position: relative;
    width: 150px;
    padding: 12px;
    background: #fff;
    border-radius: var(--r-lg);
    transition: opacity var(--dur) var(--ease-out);
  }
  .qr-tile.used :global(.qr) {
    opacity: 0.12;
  }
  .used-badge {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 4px;
    color: #000;
    font-size: 13px;
    font-weight: 600;
  }
  .url {
    margin: 0;
    font-size: 13px;
    color: var(--ink-muted);
    word-break: break-all;
  }
  .link-side .caption {
    margin: 0;
  }
  .swap {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .history h3 {
    margin: 0 0 4px;
  }
  .history ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .history li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--hairline-soft);
    font-size: 14px;
  }
  .meta {
    flex: 1;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--surface-3);
  }
  .dot.on {
    background: var(--accent);
    box-shadow: 0 0 0 4px rgba(0, 153, 255, 0.18);
  }
</style>
