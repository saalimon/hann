<script>
  import { slide, fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { quintOut } from 'svelte/easing';
  import { itemTotal, formatBaht } from '../lib/money.js';
  import { participantsOf } from '../lib/split.js';
  import { childId } from '../lib/ids.js';
  import ItemForm from './ItemForm.svelte';
  import Icon from './Icon.svelte';

  let { members, items, me, save, ongotopeople } = $props();

  let adding = $state(false);
  let editing = $state(null);

  const nameOf = $derived(Object.fromEntries(members.map((m) => [m.id, m.name])));
  const newestFirst = $derived([...items].reverse());

  async function add(data) {
    await save({ [`items/${childId()}`]: { ...data, createdAt: Date.now() } }, 'เพิ่มรายการแล้ว');
  }
  async function update(id, data) {
    await save({ [`items/${id}/desc`]: data.desc, [`items/${id}/amount`]: data.amount, [`items/${id}/paidBy`]: data.paidBy, [`items/${id}/split`]: data.split, [`items/${id}/sc`]: data.sc, [`items/${id}/vat`]: data.vat }, 'บันทึกแล้ว');
    editing = null;
  }
  async function remove(id) {
    await save({ [`items/${id}`]: null }, 'ลบรายการแล้ว');
    editing = null;
  }

  function splitLabel(item) {
    const ids = participantsOf(item, members);
    if (!ids.length) return 'ยังไม่มีคนหาร';
    if (ids.length === members.length && members.length > 1) return `หารทุกคน (${ids.length})`;
    if (ids.length <= 3) return 'หารกับ ' + ids.map((id) => nameOf[id]).join(', ');
    return `หาร ${ids.length} คน`;
  }
</script>

{#if members.length === 0}
  <div class="empty card">
    <p class="headline">เพิ่มคนในบิลก่อน</p>
    <p class="muted">ใส่ชื่อทุกคนที่ร่วมจ่าย แล้วค่อยจดรายการว่าใครจ่ายอะไร</p>
    <button class="btn" onclick={ongotopeople}>เพิ่มคน</button>
  </div>
{:else}
  <div class="add card" class:open={adding}>
    {#if adding}
      <div transition:slide={{ duration: 320, easing: quintOut }}>
        <div class="spread add-head">
          <h3 class="headline">รายการใหม่</h3>
          <button class="icon-btn" aria-label="ปิดฟอร์ม" onclick={() => (adding = false)}><Icon name="close" /></button>
        </div>
        <ItemForm {members} {me} onsubmit={add} />
      </div>
    {:else}
      <button class="add-btn" onclick={() => (adding = true)}>
        <span class="plus"><Icon name="plus" size={20} /></span>
        <span>
          <span class="headline">เพิ่มรายการ</span>
          <span class="muted sub">ค่าอาหาร ที่พัก ค่าน้ำมัน หรืออะไรก็ได้</span>
        </span>
      </button>
    {/if}
  </div>

  {#if items.length === 0}
    <p class="muted hint">ยังไม่มีรายการ เริ่มจากบิลแรกได้เลย</p>
  {:else}
    <ul class="list">
      {#each newestFirst as item (item.id)}
        {@const total = itemTotal(item)}
        <li
          animate:flip={{ duration: 360, easing: quintOut }}
          in:fly={{ y: -10, duration: 320, easing: quintOut }}
          out:slide={{ duration: 220 }}
          class:active={editing === item.id}
        >
          <button
            class="row-btn"
            aria-expanded={editing === item.id}
            onclick={() => (editing = editing === item.id ? null : item.id)}
          >
            <span class="main">
              <span class="title">{item.desc}</span>
              <span class="meta muted">
                {nameOf[item.paidBy] ?? 'คนที่ถูกลบ'}จ่าย, {splitLabel(item)}
                {#if item.sc}<span class="tag">SC</span>{/if}
                {#if item.vat}<span class="tag">VAT</span>{/if}
              </span>
            </span>
            <span class="amt num">฿{formatBaht(total)}</span>
          </button>
          {#if editing === item.id}
            <div class="edit" transition:slide={{ duration: 300, easing: quintOut }}>
              <ItemForm
                {members}
                {me}
                initial={item}
                submitLabel="บันทึก"
                onsubmit={(d) => update(item.id, d)}
                oncancel={() => (editing = null)}
                ondelete={() => remove(item.id)}
              />
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  .empty {
    display: grid;
    gap: 10px;
    justify-items: start;
    padding: 28px;
  }
  .empty p {
    margin: 0;
  }
  .add {
    padding: 0;
    overflow: hidden;
    transition: background-color var(--dur) var(--ease-out);
  }
  .add.open {
    padding: 20px;
  }
  .add-head {
    margin-bottom: 18px;
  }
  .add-btn {
    appearance: none;
    border: 0;
    width: 100%;
    background: transparent;
    color: var(--ink);
    text-align: left;
    padding: 18px 20px;
    display: flex;
    gap: 16px;
    align-items: center;
    cursor: pointer;
    border-radius: var(--r-xl);
    transition: background-color var(--dur) var(--ease-out);
  }
  .add-btn:hover {
    background: var(--surface-2);
  }
  .add-btn > span:last-child {
    display: grid;
    gap: 2px;
  }
  .plus {
    width: 44px;
    height: 44px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--ink);
    color: #000;
    transition: transform var(--dur) var(--ease-spring);
  }
  .add-btn:hover .plus {
    transform: rotate(90deg);
  }
  .sub {
    font-size: 14px;
  }
  .hint {
    margin: 8px 4px;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
  }
  .list li {
    border-bottom: 1px solid var(--hairline-soft);
    border-radius: var(--r-md);
    transition: background-color var(--dur) var(--ease-out);
  }
  .list li.active {
    background: var(--surface-1);
    border-bottom-color: transparent;
  }
  .row-btn {
    appearance: none;
    border: 0;
    background: transparent;
    color: inherit;
    width: 100%;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 12px;
    cursor: pointer;
    border-radius: var(--r-md);
  }
  .row-btn:hover {
    background: var(--surface-1);
  }
  .main {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .title {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.015em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    font-size: 13px;
    display: flex;
    flex-wrap: wrap;
    gap: 2px 6px;
    align-items: center;
  }
  .tag {
    font-size: 11px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: var(--r-xs);
    background: var(--surface-2);
    color: var(--ink);
  }
  .amt {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.02em;
    white-space: nowrap;
  }
  .edit {
    padding: 4px 12px 20px;
  }
</style>
