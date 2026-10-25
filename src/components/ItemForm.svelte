<script>
  import { untrack } from 'svelte';
  import { slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { parseBaht, toInputBaht, itemTotal, formatBaht } from '../lib/money.js';
  import Avatar from './Avatar.svelte';

  let { members, me = null, initial = null, submitLabel = 'เพิ่มรายการ', onsubmit, oncancel = null, ondelete = null } = $props();

  const everyone = () => Object.fromEntries(members.map((m) => [m.id, true]));

  // The form is seeded once from the item being edited (or sensible defaults);
  // later prop changes are reconciled by the effect below, not by re-seeding.
  const seed = untrack(() => ({ item: initial, me, firstId: members[0]?.id ?? null, all: everyone() }));

  let desc = $state(seed.item?.desc ?? '');
  let amountStr = $state(seed.item ? toInputBaht(seed.item.amount) : '');
  let paidBy = $state(seed.item?.paidBy ?? seed.me ?? seed.firstId);
  let split = $state(seed.item ? { ...(seed.item.split || {}) } : seed.all);
  let splitTouched = $state(!!seed.item);
  let sc = $state(seed.item?.sc ?? false);
  let vat = $state(seed.item?.vat ?? false);
  let busy = $state(false);
  let confirmDelete = $state(false);

  // Keep defaults sensible as people join: new members are included until the
  // user hand-picks who shares, and the payer falls back if they were removed.
  $effect(() => {
    if (!splitTouched) split = everyone();
    if (!members.some((m) => m.id === paidBy)) paidBy = me && members.some((m) => m.id === me) ? me : members[0]?.id ?? null;
  });

  const amount = $derived(parseBaht(amountStr));
  const amountInvalid = $derived(amountStr.trim() !== '' && (amount === null || amount <= 0));
  const people = $derived(members.filter((m) => split[m.id]));
  const total = $derived(amount ? itemTotal({ amount, sc, vat }) : 0);
  const each = $derived(people.length ? Math.ceil(total / people.length) : 0);
  const allOn = $derived(members.length > 0 && people.length === members.length);
  const canSave = $derived(!busy && amount > 0 && paidBy && people.length > 0);

  function toggle(id) {
    splitTouched = true;
    split = { ...split, [id]: !split[id] };
    if (!split[id]) delete split[id];
  }
  function toggleAll() {
    splitTouched = true;
    split = allOn ? {} : everyone();
  }

  async function submit(e) {
    e.preventDefault();
    if (!canSave) return;
    busy = true;
    try {
      const clean = Object.fromEntries(people.map((m) => [m.id, true]));
      await onsubmit({ desc: desc.trim() || 'ไม่ระบุ', amount, paidBy, split: clean, sc, vat });
      if (!initial) {
        desc = '';
        amountStr = '';
        sc = false;
        vat = false;
        splitTouched = false;
        split = everyone();
      }
    } catch {
      /* the caller already showed a toast */
    } finally {
      busy = false;
    }
  }
</script>

<form class="form stack" style="--gap: 18px" onsubmit={submit}>
  <div class="top">
    <label class="field grow">
      <span>รายการ</span>
      <input class="input" bind:value={desc} placeholder="หมูกระทะ, ค่าน้ำมัน" maxlength="60" />
    </label>
    <label class="field amount">
      <span>จำนวนเงิน (บาท)</span>
      <input
        class="input num"
        bind:value={amountStr}
        placeholder="0.00"
        inputmode="decimal"
        aria-invalid={amountInvalid}
      />
    </label>
  </div>

  <fieldset>
    <legend>ใครจ่าย</legend>
    <div class="chips" role="radiogroup" aria-label="ใครจ่าย">
      {#each members as m, i (m.id)}
        <button
          type="button"
          class="chip"
          role="radio"
          aria-checked={paidBy === m.id}
          onclick={() => (paidBy = m.id)}
        >
          <Avatar name={m.name} index={i} size={26} />{m.name}
        </button>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>หารกับใคร</legend>
    <div class="chips">
      <button type="button" class="chip text-only" aria-pressed={allOn} onclick={toggleAll}>ทุกคน</button>
      {#each members as m, i (m.id)}
        <button type="button" class="chip" aria-pressed={!!split[m.id]} onclick={() => toggle(m.id)}>
          <Avatar name={m.name} index={i} size={26} />{m.name}
        </button>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>บวกเพิ่ม</legend>
    <div class="chips">
      <button type="button" class="chip text-only" aria-pressed={sc} onclick={() => (sc = !sc)}>Service charge 10%</button>
      <button type="button" class="chip text-only" aria-pressed={vat} onclick={() => (vat = !vat)}>VAT 7%</button>
    </div>
  </fieldset>

  {#if total > 0 && people.length}
    <p class="summary" transition:slide={{ duration: 220, easing: quintOut }}>
      รวม <b class="num">฿{formatBaht(total)}</b>
      {#if people.length > 1}
        <span class="muted">หาร {people.length} คน ประมาณคนละ <span class="num">฿{formatBaht(each)}</span></span>
      {/if}
    </p>
  {/if}

  <div class="actions">
    <button class="btn" disabled={!canSave}>{busy ? 'กำลังบันทึก…' : submitLabel}</button>
    {#if oncancel}
      <button type="button" class="btn secondary" onclick={oncancel}>ยกเลิก</button>
    {/if}
    {#if ondelete}
      <button
        type="button"
        class="btn quiet danger"
        class:armed={confirmDelete}
        onclick={() => (confirmDelete ? ondelete() : (confirmDelete = true))}
        onblur={() => (confirmDelete = false)}
      >
        {confirmDelete ? 'กดอีกครั้งเพื่อลบ' : 'ลบรายการ'}
      </button>
    {/if}
  </div>
</form>

<style>
  .top {
    display: grid;
    gap: 14px;
  }
  @media (min-width: 560px) {
    .top {
      grid-template-columns: 1fr 180px;
    }
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
    min-width: 0;
  }
  legend {
    padding: 0;
    margin-bottom: 10px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-muted);
  }
  .summary {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    align-items: baseline;
    font-size: 15px;
  }
  .summary b {
    font-weight: 600;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .danger.armed {
    --bg: rgba(255, 85, 119, 0.14);
    --fg: var(--coral);
  }
</style>
