<script>
  import { fly, slide } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { quintOut } from 'svelte/easing';
  import { formatBaht } from '../lib/money.js';
  import { transferKey } from '../lib/split.js';
  import { parsePromptPayId } from '../lib/promptpay.js';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';

  let { people, balances, transfers, payments, me, hasItems, onpay, onundo } = $props();

  let showDetail = $state(false);
  const timeFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const allDone = $derived(hasItems && transfers.length === 0);
</script>

<section class="stack" style="--gap: 20px">
  <div class="spread">
    <h2 class="display-md">ใครโอนให้ใคร</h2>
  </div>

  {#if !hasItems}
    <p class="muted">เพิ่มรายการแล้วยอดโอนจะขึ้นที่นี่ทันที</p>
  {:else if allDone}
    <div class="done card" in:fly={{ y: 10, duration: 360, easing: quintOut }}>
      <span class="tick"><Icon name="check" size={22} /></span>
      <div>
        <p class="headline">เคลียร์ครบแล้ว</p>
        <p class="muted">ไม่มีใครค้างใคร</p>
      </div>
    </div>
  {:else}
    <ul class="transfers">
      {#each transfers as t (transferKey(t))}
        {@const from = people[t.from]}
        {@const to = people[t.to]}
        {@const mine = me && (t.from === me || t.to === me)}
        <li animate:flip={{ duration: 380, easing: quintOut }} in:fly={{ y: 12, duration: 340, easing: quintOut }} out:fly={{ x: 24, duration: 240 }}>
          <button class="transfer" class:mine onclick={() => onpay(t)}>
            <span class="pair">
              <Avatar name={from.name} index={from.index} size={34} />
              <span class="arrow"><Icon name="arrow" size={16} /></span>
              <Avatar name={to.name} index={to.index} size={34} />
            </span>
            <span class="who">
              <span class="names">{from.name} โอนให้ {to.name}</span>
              <span class="sub muted">
                {#if parsePromptPayId(to.promptpay)}แตะเพื่อเปิด QR พร้อมเพย์{:else}{to.name}ยังไม่ใส่พร้อมเพย์{/if}
              </span>
            </span>
            <span class="amt num">฿{formatBaht(t.amount)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if payments.length}
    <div class="paid">
      <h3 class="caption muted">โอนแล้ว</h3>
      <ul>
        {#each [...payments].reverse() as p (p.id)}
          <li animate:flip={{ duration: 320 }} in:slide={{ duration: 280 }} out:slide={{ duration: 200 }}>
            <span class="tick small"><Icon name="check" size={14} /></span>
            <span class="paid-text">
              {people[p.from]?.name ?? '?'} โอนให้ {people[p.to]?.name ?? '?'}
              <span class="num">฿{formatBaht(p.amount)}</span>
              <span class="muted when">{timeFmt.format(p.at)}</span>
            </span>
            <button class="btn quiet small" onclick={() => onundo(p)}>ยกเลิก</button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if hasItems}
    <div>
      <button class="btn secondary small" aria-expanded={showDetail} onclick={() => (showDetail = !showDetail)}>
        {showDetail ? 'ซ่อนยอดของแต่ละคน' : 'ดูยอดของแต่ละคน'}
      </button>
      {#if showDetail}
        <div class="table-wrap" transition:slide={{ duration: 320, easing: quintOut }}>
          <table>
            <thead>
              <tr><th>คน</th><th>จ่ายไป</th><th>ส่วนของตัวเอง</th>{#if payments.length}<th>โอน/รับแล้ว</th>{/if}<th>คงเหลือ</th></tr>
            </thead>
            <tbody>
              {#each balances as r (r.id)}
                <tr>
                  <td>{people[r.id].name}</td>
                  <td class="num">{formatBaht(r.paid)}</td>
                  <td class="num">{formatBaht(r.share)}</td>
                  {#if payments.length}
                    <td class="num">{r.sent - r.received > 0 ? '+' : ''}{formatBaht(r.sent - r.received)}</td>
                  {/if}
                  <td class="num net">
                    {#if r.net > 0}รับคืน {formatBaht(r.net)}{:else if r.net < 0}ต้องจ่าย {formatBaht(-r.net)}{:else}<span class="muted">ครบ</span>{/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .transfers {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .transfer {
    appearance: none;
    border: 0;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border-radius: var(--r-xl);
    background: var(--surface-1);
    color: var(--ink);
    text-align: left;
    cursor: pointer;
    transition:
      background-color var(--dur) var(--ease-out),
      transform var(--dur-fast) var(--ease-out),
      box-shadow var(--dur) var(--ease-out);
  }
  .transfer:hover {
    background: var(--surface-2);
  }
  .transfer:active {
    transform: scale(0.985);
  }
  .transfer.mine {
    background: var(--surface-2);
    box-shadow: inset 0 0 0 1px rgba(0, 153, 255, 0.6);
  }
  .pair {
    display: inline-flex;
    align-items: center;
    flex: none;
  }
  .pair :global(.avatar:last-child) {
    margin-left: -2px;
  }
  .arrow {
    color: var(--ink-muted);
    display: inline-grid;
    width: 22px;
    place-items: center;
  }
  .who {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .names {
    font-weight: 600;
    font-size: 15px;
  }
  .sub {
    font-size: 13px;
  }
  .amt {
    font-size: 19px;
    font-weight: 600;
    letter-spacing: -0.025em;
    white-space: nowrap;
  }
  .done {
    display: flex;
    gap: 16px;
    align-items: center;
  }
  .done p {
    margin: 0;
  }
  .tick {
    width: 44px;
    height: 44px;
    flex: none;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgba(34, 197, 94, 0.14);
    color: var(--success);
  }
  .tick.small {
    width: 26px;
    height: 26px;
  }
  .paid {
    display: grid;
    gap: 6px;
  }
  .paid h3 {
    margin: 0;
  }
  .paid ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
  }
  .paid li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--hairline-soft);
    font-size: 14px;
  }
  .paid-text {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 2px 8px;
    align-items: baseline;
  }
  .when {
    font-size: 12px;
  }
  .table-wrap {
    overflow-x: auto;
    margin-top: 12px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  th {
    text-align: left;
    font-weight: 500;
    font-size: 13px;
    color: var(--ink-muted);
    padding: 8px 10px 8px 0;
    border-bottom: 1px solid var(--hairline);
    white-space: nowrap;
  }
  td {
    padding: 10px 10px 10px 0;
    border-bottom: 1px solid var(--hairline-soft);
    white-space: nowrap;
  }
  th:not(:first-child),
  td:not(:first-child) {
    text-align: right;
  }
</style>
