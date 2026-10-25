<script>
  import { onMount, untrack } from 'svelte';
  import { fly, fade, slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { watchSession, patch } from '../lib/backend/index.js';
  import { orderedMembers, orderedItems, orderedPayments, computeBalances, settle } from '../lib/split.js';
  import { formatBaht } from '../lib/money.js';
  import { childId } from '../lib/ids.js';
  import { rememberBill, forgetBill, getMe, setMe } from '../lib/local-prefs.js';
  import { toast, explainError } from '../lib/toast.svelte.js';
  import Nav from './Nav.svelte';
  import Icon from './Icon.svelte';
  import Money from './Money.svelte';
  import Avatar from './Avatar.svelte';
  import Segmented from './Segmented.svelte';
  import ItemsPanel from './ItemsPanel.svelte';
  import PeoplePanel from './PeoplePanel.svelte';
  import SettlePanel from './SettlePanel.svelte';
  import PaySheet from './PaySheet.svelte';
  import ShareSheet from './ShareSheet.svelte';

  let { sid } = $props();

  let session = $state(undefined); // undefined = loading, null = missing
  let error = $state(null);
  let me = $state(untrack(() => getMe(sid)));
  let wide = $state(false);
  let tab = $state('items');
  let shareOpen = $state(false);
  let paying = $state(null);
  let editingTitle = $state(false);
  let titleDraft = $state('');
  let pickDismissed = $state(false);

  onMount(() => {
    const mq = matchMedia('(min-width: 960px)');
    const onMq = () => (wide = mq.matches);
    onMq();
    mq.addEventListener('change', onMq);

    let rememberedTitle = null;
    const slow = setTimeout(() => {
      if (session === undefined && !error) error = { code: 'TIMEOUT' };
    }, 15000);
    const stop = watchSession(
      sid,
      (s) => {
        session = s;
        error = null;
        const t = s?.meta?.title;
        if (t && t !== rememberedTitle) {
          rememberedTitle = t;
          rememberBill(sid, t);
        }
      },
      (err) => (error = err)
    );
    return () => {
      stop();
      clearTimeout(slow);
      mq.removeEventListener('change', onMq);
    };
  });

  const members = $derived(orderedMembers(session?.members));
  const items = $derived(orderedItems(session?.items));
  const payments = $derived(orderedPayments(session?.payments));
  const balances = $derived(computeBalances(session?.members, session?.items, session?.payments));
  const transfers = $derived(settle(balances.rows));
  const people = $derived(Object.fromEntries(members.map((m, i) => [m.id, { ...m, index: i }])));
  const meValid = $derived(me && people[me] ? me : null);
  const myOut = $derived(meValid ? transfers.filter((t) => t.from === meValid) : []);
  const myIn = $derived(meValid ? transfers.filter((t) => t.to === meValid) : []);

  const tabs = $derived([
    { value: 'items', label: 'รายการ', count: items.length },
    { value: 'people', label: 'คน', count: members.length },
    ...(wide ? [] : [{ value: 'settle', label: 'สรุปโอน', count: transfers.length || undefined }]),
  ]);
  $effect(() => {
    if (wide && tab === 'settle') tab = 'items';
  });

  async function save(updates, okMessage) {
    try {
      await patch(sid, updates);
      if (okMessage) toast(okMessage);
    } catch (err) {
      toast(explainError(err), { tone: 'bad' });
      throw err;
    }
  }

  function setMine(id) {
    me = id;
    setMe(sid, id);
  }

  function startTitle() {
    titleDraft = session.meta?.title || '';
    editingTitle = true;
  }
  async function saveTitle(e) {
    e?.preventDefault();
    editingTitle = false;
    const t = titleDraft.trim();
    if (t && t !== session.meta?.title) await save({ 'meta/title': t }).catch(() => {});
  }

  async function markPaid(t) {
    await save({ [`payments/${childId()}`]: { from: t.from, to: t.to, amount: t.amount, at: Date.now() } }, 'บันทึกว่าโอนแล้ว');
    paying = null;
  }
  async function undoPayment(p) {
    await save({ [`payments/${p.id}`]: null }, 'ยกเลิกสถานะโอนแล้ว').catch(() => {});
  }
  async function savePp(memberId, pp) {
    await save({ [`members/${memberId}/promptpay`]: pp }, 'บันทึกพร้อมเพย์แล้ว').catch(() => {});
  }

  function leave() {
    forgetBill(sid);
    location.hash = '#/';
  }
</script>

<Nav back>
  {#if session}
    <button class="btn" onclick={() => (shareOpen = true)}><Icon name="share" size={16} />ชวนเพื่อน</button>
  {/if}
</Nav>

{#if error}
  <section class="container state" in:fade>
    {#if error.code === 'PERMISSION'}
      <h1 class="display-lg">เครื่องนี้ยังเปิดบิลนี้ไม่ได้</h1>
      <p class="body-lg muted">
        บิลจะเปิดได้เฉพาะเครื่องที่สร้างบิล หรือเครื่องที่เข้าผ่านลิงก์เชิญ ขอลิงก์เชิญใหม่จากเพื่อนในบิลได้เลย
      </p>
      <div class="row" style="--gap: 8px">
        <a class="btn" href="#/">ไปหน้าแรก</a>
        <button class="btn secondary" onclick={leave}>ลบออกจากเครื่องนี้</button>
      </div>
    {:else if error.code === 'TIMEOUT'}
      <h1 class="display-lg">เชื่อมต่อฐานข้อมูลไม่ได้</h1>
      <p class="body-lg muted">
        ตรวจอินเทอร์เน็ต ถ้ายังไม่ได้ ให้ตรวจว่า databaseURL ใน firebase-config.js ตรงกับ Realtime Database ใน Firebase Console
      </p>
      <button class="btn" onclick={() => location.reload()}>ลองอีกครั้ง</button>
    {:else}
      <h1 class="display-lg">เปิดบิลไม่สำเร็จ</h1>
      <p class="body-lg muted">{explainError(error)}</p>
      <button class="btn" onclick={() => location.reload()}>ลองอีกครั้ง</button>
    {/if}
  </section>
{:else if session === undefined}
  <section class="container head" aria-busy="true">
    <div class="skeleton title"></div>
    <div class="skeleton total"></div>
  </section>
{:else if session === null}
  <section class="container state">
    <h1 class="display-lg">ไม่พบบิลนี้</h1>
    <p class="body-lg muted">บิลอาจถูกลบไปแล้ว</p>
    <button class="btn" onclick={leave}>กลับหน้าแรก</button>
  </section>
{:else}
  <section class="container head">
    {#if editingTitle}
      <form onsubmit={saveTitle}>
        <!-- svelte-ignore a11y_autofocus -->
        <input
          class="title-input display-md"
          bind:value={titleDraft}
          onblur={saveTitle}
          maxlength="60"
          autofocus
          aria-label="ชื่อบิล"
        />
      </form>
    {:else}
      <button class="title-btn" onclick={startTitle} aria-label="แก้ชื่อบิล">
        <h1 class="display-md">{session.meta?.title || 'บิล'}</h1>
        <span class="pen"><Icon name="edit" size={16} /></span>
      </button>
    {/if}

    <div class="total">
      <Money value={balances.total} class="total-amt" />
      <p class="muted body-lg">
        <span>ยอดรวมทั้งบิล</span>
        {#if members.length > 1}
          <span>เฉลี่ยคนละ <span class="num">฿{formatBaht(Math.round(balances.total / members.length))}</span></span>
        {/if}
      </p>
    </div>

    {#if meValid && (myOut.length || myIn.length)}
      <div class="mine" in:slide={{ duration: 300, easing: quintOut }}>
        {#each myOut as t (t.to)}
          <button class="mine-chip" onclick={() => (paying = t)}>
            คุณต้องโอนให้ {people[t.to].name} <b class="num">฿{formatBaht(t.amount)}</b>
            <Icon name="qr" size={16} />
          </button>
        {/each}
        {#each myIn as t (t.from)}
          <span class="mine-chip passive">
            รอรับจาก {people[t.from].name} <b class="num">฿{formatBaht(t.amount)}</b>
          </span>
        {/each}
      </div>
    {/if}

    {#if !meValid && members.length > 0 && !pickDismissed}
      <div class="pick card" transition:slide={{ duration: 300, easing: quintOut }}>
        <p class="body-sm">คุณคือใครในบิลนี้ จะได้เห็นยอดของตัวเองทันที</p>
        <div class="chips">
          {#each members as m, i (m.id)}
            <button class="chip" onclick={() => setMine(m.id)}><Avatar name={m.name} index={i} size={26} />{m.name}</button>
          {/each}
          <button class="chip text-only" onclick={() => (pickDismissed = true)}>ข้ามไปก่อน</button>
        </div>
      </div>
    {/if}
  </section>

  <section class="container body" class:wide>
    <div class="main stack" style="--gap: 20px">
      <Segmented options={tabs} bind:value={tab} label="ส่วนของบิล" />
      {#key tab}
        <div class="panel stack" style="--gap: 16px" in:fly={{ y: 10, duration: 320, easing: quintOut }}>
          {#if tab === 'items'}
            <ItemsPanel {members} {items} me={meValid} {save} ongotopeople={() => (tab = 'people')} />
          {:else if tab === 'people'}
            <PeoplePanel {members} {items} {payments} me={meValid} {save} onsetme={setMine} />
          {:else}
            <SettlePanel
              {people}
              balances={balances.rows}
              {transfers}
              {payments}
              me={meValid}
              hasItems={balances.total > 0}
              onpay={(t) => (paying = t)}
              onundo={undoPayment}
            />
          {/if}
        </div>
      {/key}
    </div>

    {#if wide}
      <aside class="side">
        <SettlePanel
          {people}
          balances={balances.rows}
          {transfers}
          {payments}
          me={meValid}
          hasItems={balances.total > 0}
          onpay={(t) => (paying = t)}
          onundo={undoPayment}
        />
      </aside>
    {/if}
  </section>

  {#if paying && people[paying.from] && people[paying.to]}
    <PaySheet
      transfer={paying}
      from={people[paying.from]}
      to={people[paying.to]}
      onclose={() => (paying = null)}
      onmarkpaid={markPaid}
      onsavepp={savePp}
    />
  {/if}

  {#if shareOpen}
    <ShareSheet {sid} title={session.meta?.title || 'บิล'} invites={session.invites} onclose={() => (shareOpen = false)} />
  {/if}
{/if}

<style>
  .state {
    max-width: 680px;
    padding-top: 12vh;
    display: grid;
    gap: 20px;
    justify-items: start;
  }
  .state p {
    margin: 0;
  }
  .head {
    padding-top: 32px;
    display: grid;
    gap: 18px;
    justify-items: start;
  }
  @media (min-width: 810px) {
    .head {
      padding-top: 56px;
    }
  }
  .title-btn {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--ink);
    padding: 0;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    text-align: left;
  }
  .pen {
    color: var(--ink-muted);
    opacity: 0;
    transition: opacity var(--dur) var(--ease-out);
  }
  .title-btn:hover .pen,
  .title-btn:focus-visible .pen {
    opacity: 1;
  }
  @media (pointer: coarse) {
    .pen {
      opacity: 0.6;
    }
  }
  .title-input {
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--accent);
    color: var(--ink);
    outline: none;
    padding: 0 0 4px;
    width: min(100%, 640px);
  }
  .total {
    display: grid;
    gap: 6px;
  }
  .total p {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0 0.5em;
  }
  .total :global(.total-amt) {
    font-size: clamp(64px, 15vw, 132px);
    font-weight: 600;
    line-height: 0.9;
    letter-spacing: -0.055em;
    margin-left: -0.04em;
  }
  .mine {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .mine-chip {
    appearance: none;
    border: 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 8px 16px;
    border-radius: var(--r-pill);
    background: var(--ink);
    color: #000;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: transform var(--dur-fast) var(--ease-out);
  }
  .mine-chip:active {
    transform: scale(0.96);
  }
  .mine-chip.passive {
    background: var(--surface-2);
    color: var(--ink);
    cursor: default;
  }
  .pick {
    display: grid;
    gap: 12px;
    width: 100%;
  }
  .pick p {
    margin: 0;
  }
  .body {
    margin-top: 40px;
    display: grid;
    gap: 40px;
    align-items: start;
  }
  .body.wide {
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
    gap: 56px;
  }
  .side {
    position: sticky;
    top: 88px;
  }
  .skeleton {
    border-radius: var(--r-md);
    background: linear-gradient(90deg, var(--surface-1), var(--surface-2), var(--surface-1));
    background-size: 200% 100%;
    animation: shimmer 1.2s linear infinite;
  }
  .skeleton.title {
    width: 220px;
    height: 32px;
  }
  .skeleton.total {
    width: 320px;
    max-width: 80vw;
    height: 96px;
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
</style>
