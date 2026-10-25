<script>
  import { fly, slide } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { quintOut } from 'svelte/easing';
  import { createInvite, revokeInvite } from '../lib/backend/index.js';
  import { toast, explainError } from '../lib/toast.svelte.js';
  import Sheet from './Sheet.svelte';
  import Segmented from './Segmented.svelte';
  import QR from './QR.svelte';
  import Icon from './Icon.svelte';

  let { sid, title, invites = {}, onclose } = $props();

  let mode = $state('group'); // group | once
  let busy = $state(false);
  let latest = $state(null); // newest one-time token created in this sheet
  let copied = $state(null);
  let confirmClose = $state(false);

  const base = location.origin + location.pathname;
  const linkFor = (token) => `${base}#/j/${token}`;
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const timeFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const dayFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' });

  const all = $derived(
    Object.entries(invites || {})
      .map(([token, v]) => ({ token, ...v }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  );
  const group = $derived(all.find((i) => i.multi && i.expiresAt > Date.now()) || null);
  const joinedCount = $derived(group ? Object.keys(group.joined || {}).length : 0);
  const oneTime = $derived(all.filter((i) => !i.multi));
  const latestUsed = $derived(latest && invites?.[latest]?.usedBy);

  const shareText = (multi) =>
    multi ? `มาหารบิล "${title}" กัน เปิดลิงก์นี้ได้เลย` : `เข้าบิล "${title}" (ลิงก์นี้ใช้ได้ครั้งเดียว)`;
  const lineUrl = (token) =>
    `https://line.me/R/share?text=${encodeURIComponent(`${shareText(true)}\n${linkFor(token)}`)}`;

  async function create(multi) {
    busy = true;
    copied = null;
    try {
      const token = await createInvite(sid, { multi });
      if (!multi) latest = token;
    } catch (err) {
      toast(explainError(err), { tone: 'bad' });
    } finally {
      busy = false;
    }
  }

  async function copy(token) {
    try {
      await navigator.clipboard.writeText(linkFor(token));
      copied = token;
      setTimeout(() => copied === token && (copied = null), 1800);
    } catch {
      toast('คัดลอกไม่ได้ กดค้างที่ลิงก์เพื่อคัดลอกเอง', { tone: 'bad' });
    }
  }

  async function share(token, multi) {
    try {
      await navigator.share({ title: `hann: ${title}`, text: shareText(multi), url: linkFor(token) });
    } catch {
      /* user cancelled */
    }
  }

  async function revoke(token, message = 'ยกเลิกลิงก์แล้ว') {
    try {
      await revokeInvite(sid, token);
      if (latest === token) latest = null;
      toast(message);
    } catch (err) {
      toast(explainError(err), { tone: 'bad' });
    }
  }

  async function closeGroup() {
    if (!confirmClose) return (confirmClose = true);
    confirmClose = false;
    await revoke(group.token, 'ปิดลิงก์กลุ่มแล้ว');
  }

  async function renewGroup() {
    const old = group?.token;
    await create(true);
    if (old) await revoke(old, 'สร้างลิงก์ใหม่แล้ว ลิงก์เดิมใช้ไม่ได้');
  }

  function status(inv) {
    if (inv.usedBy) return `ใช้แล้ว ${inv.usedAt ? timeFmt.format(inv.usedAt) : ''}`;
    if (inv.expiresAt < Date.now()) return 'หมดอายุ';
    return 'ยังไม่มีคนเปิด';
  }
</script>

{#snippet linkCard(token, multi, used)}
  <div class="link card lift" in:fly={{ y: 12, duration: 380, easing: quintOut }}>
    <div class="qr-tile" class:used>
      <QR text={linkFor(token)} label="QR ของลิงก์เข้าบิล" />
      {#if used}
        <span class="used-badge" in:fly={{ y: 6, duration: 260 }}><Icon name="check" />มีคนเปิดแล้ว</span>
      {/if}
    </div>
    <div class="link-side stack" style="--gap: 10px">
      <p class="url num">{linkFor(token)}</p>
      <div class="row wrap" style="--gap: 8px">
        <button class="btn small" onclick={() => copy(token)} disabled={used}>
          {#key copied === token}
            <span class="swap" in:fly={{ y: 8, duration: 220 }}>
              <Icon name={copied === token ? 'check' : 'copy'} size={16} />{copied === token ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
            </span>
          {/key}
        </button>
        {#if multi}
          <a class="btn secondary small" href={lineUrl(token)} target="_blank" rel="noopener">
            <Icon name="chat" size={16} />ส่งไป LINE
          </a>
        {/if}
        {#if canShare}
          <button class="btn secondary small" onclick={() => share(token, multi)} disabled={used}>
            <Icon name="share" size={16} />แชร์
          </button>
        {/if}
      </div>
      <p class="caption muted">หรือให้เพื่อนสแกน QR นี้จากมือถือ</p>
    </div>
  </div>
{/snippet}

<Sheet title="ชวนเพื่อนเข้าบิล" {onclose}>
  <Segmented
    options={[
      { value: 'group', label: 'ลิงก์กลุ่ม' },
      { value: 'once', label: 'ใช้ครั้งเดียว' },
    ]}
    bind:value={mode}
    label="แบบลิงก์"
  />

  {#key mode}
    <div class="stack" style="--gap: 16px" in:fly={{ y: 8, duration: 280, easing: quintOut }}>
      {#if mode === 'group'}
        <p class="muted lead">
          ส่งลิงก์เดียวลงกลุ่มแชต ใครเปิดก็เข้าบิลและแก้ไขได้ ลิงก์ใช้ได้ 30 วัน
          ปิดลิงก์ได้ทุกเมื่อ คนที่เข้ามาแล้วยังอยู่ในบิลต่อ
        </p>

        {#if group}
          {@render linkCard(group.token, true, false)}
          <div class="group-meta">
            <span class="dot on"></span>
            <span>
              {joinedCount ? `มีคนเข้าผ่านลิงก์นี้แล้ว ${joinedCount} เครื่อง` : 'ยังไม่มีใครเข้าผ่านลิงก์นี้'}
            </span>
            <span class="muted">ใช้ได้ถึง {dayFmt.format(group.expiresAt)}</span>
          </div>
          <div class="row wrap" style="--gap: 8px">
            <button class="btn quiet small" onclick={renewGroup} disabled={busy}>สร้างลิงก์ใหม่แทน</button>
            <button
              class="btn quiet small danger"
              class:armed={confirmClose}
              onclick={closeGroup}
              onblur={() => (confirmClose = false)}
            >
              {confirmClose ? 'กดอีกครั้งเพื่อปิดลิงก์' : 'ปิดลิงก์'}
            </button>
          </div>
        {:else}
          <button class="btn" onclick={() => create(true)} disabled={busy}>
            <Icon name="link" />{busy ? 'กำลังสร้าง…' : 'สร้างลิงก์กลุ่ม'}
          </button>
        {/if}
      {:else}
        <p class="muted lead">
          ลิงก์แต่ละอันเปิดได้ครั้งเดียว คนแรกที่เปิดจะเข้าบิลได้ถาวรบนเครื่องนั้น แล้วลิงก์จะใช้ไม่ได้อีก
          เหมาะกับส่งหาทีละคน ลิงก์ที่ไม่มีใครเปิดหมดอายุใน 7 วัน
        </p>

        {#if latest}
          {@render linkCard(latest, false, !!latestUsed)}
        {/if}

        <button class="btn" class:secondary={latest} onclick={() => create(false)} disabled={busy}>
          <Icon name="link" />{busy ? 'กำลังสร้าง…' : latest ? 'สร้างลิงก์ให้อีกคน' : 'สร้างลิงก์ใช้ครั้งเดียว'}
        </button>

        {#if oneTime.length}
          <div class="history">
            <h3 class="caption muted">ลิงก์ใช้ครั้งเดียวที่สร้างแล้ว</h3>
            <ul>
              {#each oneTime as inv (inv.token)}
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
      {/if}
    </div>
  {/key}
</Sheet>

<style>
  .lead {
    margin: 0;
  }
  .wrap {
    flex-wrap: wrap;
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
  a.btn {
    text-decoration: none;
  }
  /* the link card is already one surface up, so its secondary buttons step up again */
  .link .btn.secondary {
    --bg: var(--surface-3);
  }
  .link .btn.secondary:hover {
    --bg: #2e2e2e;
  }
  .group-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
    font-size: 14px;
  }
  .danger.armed {
    --bg: rgba(255, 85, 119, 0.14);
    --fg: var(--coral);
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
    flex: none;
    border-radius: 50%;
    background: var(--surface-3);
  }
  .dot.on {
    background: var(--accent);
    box-shadow: 0 0 0 4px rgba(0, 153, 255, 0.18);
  }
</style>
