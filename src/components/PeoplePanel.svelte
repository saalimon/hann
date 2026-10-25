<script>
  import { slide, fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { quintOut } from 'svelte/easing';
  import { parsePromptPayId, sanitizeId, formatPromptPayId, ID_TYPE_LABEL } from '../lib/promptpay.js';
  import { childId } from '../lib/ids.js';
  import { toast } from '../lib/toast.svelte.js';
  import Avatar from './Avatar.svelte';

  let { members, items, payments, me, save, onsetme } = $props();

  let name = $state('');
  let pp = $state('');
  let busy = $state(false);
  let editing = $state(null);
  let editName = $state('');
  let editPp = $state('');
  let confirmDelete = $state(false);
  let nameInput;

  const ppInvalid = (v) => v.trim() !== '' && !parsePromptPayId(v);

  async function add(e) {
    e.preventDefault();
    if (!name.trim() || ppInvalid(pp) || busy) return;
    busy = true;
    try {
      await save({ [`members/${childId()}`]: { name: name.trim(), promptpay: sanitizeId(pp), createdAt: Date.now() } });
      name = '';
      pp = '';
      nameInput?.focus();
    } catch {
      /* toast shown by caller */
    } finally {
      busy = false;
    }
  }

  function startEdit(m) {
    if (editing === m.id) return (editing = null);
    editing = m.id;
    editName = m.name;
    editPp = m.promptpay ? formatPromptPayId(m.promptpay) : '';
    confirmDelete = false;
  }

  async function saveEdit(e, m) {
    e.preventDefault();
    if (!editName.trim() || ppInvalid(editPp)) return;
    await save(
      { [`members/${m.id}/name`]: editName.trim(), [`members/${m.id}/promptpay`]: sanitizeId(editPp) },
      'บันทึกแล้ว'
    );
    editing = null;
  }

  async function remove(m) {
    if (items.some((it) => it.paidBy === m.id)) {
      toast(`ลบ${m.name}ไม่ได้ เพราะเป็นคนจ่ายบางรายการ แก้รายการนั้นก่อน`, { tone: 'bad', ms: 3600 });
      return;
    }
    if (payments.some((p) => p.from === m.id || p.to === m.id)) {
      toast(`ลบ${m.name}ไม่ได้ เพราะมีประวัติการโอน`, { tone: 'bad', ms: 3600 });
      return;
    }
    if (!confirmDelete) return (confirmDelete = true);
    const updates = { [`members/${m.id}`]: null };
    for (const it of items) if (it.split?.[m.id]) updates[`items/${it.id}/split/${m.id}`] = null;
    await save(updates, `ลบ${m.name}แล้ว`);
    if (me === m.id) onsetme(null);
    editing = null;
  }
</script>

<form class="card add stack" style="--gap: 14px" onsubmit={add}>
  <div class="two">
    <label class="field">
      <span>ชื่อ</span>
      <input class="input" bind:this={nameInput} bind:value={name} placeholder="ฝน" maxlength="30" />
    </label>
    <label class="field">
      <span>พร้อมเพย์ (ไว้รับเงิน)</span>
      <input
        class="input num"
        bind:value={pp}
        placeholder="เบอร์มือถือหรือเลขบัตร"
        inputmode="numeric"
        aria-invalid={ppInvalid(pp)}
      />
    </label>
  </div>
  {#if ppInvalid(pp)}
    <p class="bad" transition:slide={{ duration: 180 }}>ใส่เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก</p>
  {/if}
  <button class="btn" disabled={!name.trim() || ppInvalid(pp) || busy}>เพิ่มคน</button>
</form>

{#if members.length}
  <ul class="list">
    {#each members as m, i (m.id)}
      <li
        animate:flip={{ duration: 360, easing: quintOut }}
        in:fly={{ y: -10, duration: 320, easing: quintOut }}
        out:slide={{ duration: 220 }}
        class:active={editing === m.id}
      >
        <button class="row-btn" aria-expanded={editing === m.id} onclick={() => startEdit(m)}>
          <Avatar name={m.name} index={i} size={40} />
          <span class="main">
            <span class="title">
              {m.name}
              {#if me === m.id}<span class="me">คุณ</span>{/if}
            </span>
            <span class="meta muted num">
              {#if parsePromptPayId(m.promptpay)}
                พร้อมเพย์ {formatPromptPayId(m.promptpay, { mask: true })}
              {:else}
                ยังไม่ใส่พร้อมเพย์
              {/if}
            </span>
          </span>
        </button>

        {#if editing === m.id}
          <form class="edit stack" style="--gap: 14px" transition:slide={{ duration: 300, easing: quintOut }} onsubmit={(e) => saveEdit(e, m)}>
            <div class="two">
              <label class="field">
                <span>ชื่อ</span>
                <input class="input" bind:value={editName} maxlength="30" />
              </label>
              <label class="field">
                <span>
                  พร้อมเพย์
                  {#if parsePromptPayId(editPp)}({ID_TYPE_LABEL[parsePromptPayId(editPp).type]}){/if}
                </span>
                <input class="input num" bind:value={editPp} inputmode="numeric" aria-invalid={ppInvalid(editPp)} />
              </label>
            </div>
            <div class="actions">
              <button class="btn" disabled={!editName.trim() || ppInvalid(editPp)}>บันทึก</button>
              <button
                type="button"
                class="btn secondary"
                aria-pressed={me === m.id}
                onclick={() => onsetme(me === m.id ? null : m.id)}
              >
                {me === m.id ? 'ไม่ใช่ฉัน' : 'นี่คือฉัน'}
              </button>
              <button
                type="button"
                class="btn quiet danger"
                class:armed={confirmDelete}
                onclick={() => remove(m)}
                onblur={() => (confirmDelete = false)}
              >
                {confirmDelete ? 'กดอีกครั้งเพื่อลบ' : 'ลบคนนี้'}
              </button>
            </div>
          </form>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .two {
    display: grid;
    gap: 14px;
  }
  @media (min-width: 560px) {
    .two {
      grid-template-columns: 1fr 1fr;
    }
  }
  .add .btn {
    justify-self: start;
  }
  .bad {
    margin: -4px 0 0;
    font-size: 13px;
    color: var(--coral);
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
    gap: 14px;
    padding: 14px 12px;
    cursor: pointer;
    border-radius: var(--r-md);
  }
  .row-btn:hover {
    background: var(--surface-1);
  }
  .main {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .title {
    font-size: 16px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .me {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--r-pill);
    background: var(--ink);
    color: #000;
  }
  .meta {
    font-size: 13px;
  }
  .edit {
    padding: 4px 12px 20px;
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
