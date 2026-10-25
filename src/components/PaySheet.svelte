<script>
  import { slide } from 'svelte/transition';
  import { promptPayPayload, parsePromptPayId, formatPromptPayId, ID_TYPE_LABEL, sanitizeId } from '../lib/promptpay.js';
  import { formatBaht } from '../lib/money.js';
  import { renderPayImage, shareOrDownload } from '../lib/pay-image.js';
  import { compressSlip } from '../lib/slip.js';
  import { toast } from '../lib/toast.svelte.js';
  import Sheet from './Sheet.svelte';
  import QR from './QR.svelte';
  import Money from './Money.svelte';
  import Icon from './Icon.svelte';

  let { transfer, from, to, me = null, onclose, onreport, onreceived, onsavepp } = $props();

  const pp = $derived(parsePromptPayId(to.promptpay));
  const payload = $derived(pp ? promptPayPayload(pp.digits, transfer.amount) : null);
  const idText = $derived(pp ? formatPromptPayId(pp.digits, { mask: true }) : '');

  let newPp = $state('');
  let saving = $state(false);
  let exporting = $state(false);
  let marking = $state(false);
  let reporting = $state(false); // payer opened the "I've paid" step
  let slip = $state(null); // compressed data URL
  let slipBusy = $state(false);
  let slipInput = $state(null);
  const isReceiver = $derived(me === to.id);
  const newPpInvalid = $derived(newPp.trim() !== '' && !parsePromptPayId(newPp));

  async function savePp(e) {
    e.preventDefault();
    if (!parsePromptPayId(newPp)) return;
    saving = true;
    try {
      await onsavepp(to.id, sanitizeId(newPp));
    } finally {
      saving = false;
    }
  }

  async function exportImage() {
    exporting = true;
    try {
      const blob = await renderPayImage({
        payload,
        fromName: from.name,
        toName: to.name,
        amountText: '฿' + formatBaht(transfer.amount),
        idText,
      });
      const r = await shareOrDownload(blob, `promptpay-${to.name}-${(transfer.amount / 100).toFixed(2)}.png`);
      if (r === 'downloaded') toast('บันทึกรูป QR แล้ว');
    } catch (err) {
      console.error(err);
      toast('สร้างรูปไม่สำเร็จ', { tone: 'bad' });
    } finally {
      exporting = false;
    }
  }

  async function copyAmount() {
    try {
      await navigator.clipboard.writeText((transfer.amount / 100).toFixed(2));
      toast('คัดลอกยอดแล้ว');
    } catch {
      toast('คัดลอกไม่ได้ในเบราว์เซอร์นี้', { tone: 'bad' });
    }
  }

  async function pickSlip(e) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    slipBusy = true;
    try {
      slip = await compressSlip(file);
    } catch (err) {
      toast(err?.message === 'SLIP_NOT_IMAGE' ? 'เลือกไฟล์รูปภาพ' : 'อ่านรูปสลิปไม่ได้ ลองรูปอื่น', { tone: 'bad' });
    } finally {
      slipBusy = false;
    }
  }

  async function report() {
    marking = true;
    try {
      await onreport(transfer, slip);
    } catch {
      /* toast shown by caller */
    } finally {
      marking = false;
    }
  }

  async function received() {
    marking = true;
    try {
      await onreceived(transfer);
    } catch {
      /* toast shown by caller */
    } finally {
      marking = false;
    }
  }
</script>

<Sheet title="จ่ายด้วยพร้อมเพย์" {onclose}>
  <div class="spotlight poster">
    <p class="who">{from.name} <span>โอนให้</span> {to.name}</p>
    <Money value={transfer.amount} class="poster-amt" />
    {#if payload}
      <div class="qr-tile">
        <QR text={payload} label={`QR พร้อมเพย์ของ ${to.name} ยอด ${formatBaht(transfer.amount)} บาท`} />
      </div>
      <p class="pp num">พร้อมเพย์ {ID_TYPE_LABEL[pp.type]} {idText}</p>
    {:else}
      <form class="need-pp stack" style="--gap: 10px" onsubmit={savePp} transition:slide={{ duration: 260 }}>
        <p>ใส่พร้อมเพย์ของ{to.name}เพื่อสร้าง QR</p>
        <div class="row" style="--gap: 8px">
          <input
            class="input num"
            bind:value={newPp}
            placeholder="เบอร์มือถือหรือเลขบัตร"
            inputmode="numeric"
            aria-invalid={newPpInvalid}
            aria-label={`พร้อมเพย์ของ ${to.name}`}
          />
          <button class="btn" disabled={saving || !parsePromptPayId(newPp)}>บันทึก</button>
        </div>
      </form>
    {/if}
  </div>

  {#if payload}
    <p class="caption muted tip">
      สแกนจากแอปธนาคาร หรือบันทึกรูปแล้วเลือก "สแกนจากรูป" ตรวจชื่อผู้รับในแอปธนาคารก่อนกดยืนยันทุกครั้ง
    </p>
  {/if}

  {#if reporting && !isReceiver}
    <div class="report card" transition:slide={{ duration: 280 }}>
      <p class="body-sm">แนบสลิปให้{to.name}ดูประกอบได้ (ไม่บังคับ) แล้วกดแจ้งโอน {to.name}จะเป็นคนกดยืนยันว่าได้รับเงิน</p>
      <input class="visually-hidden" type="file" accept="image/*" bind:this={slipInput} onchange={pickSlip} />
      {#if slip}
        <div class="slip-preview" in:slide={{ duration: 220 }}>
          <img src={slip} alt="สลิปที่แนบ" />
          <button class="btn quiet small" onclick={() => (slip = null)}>เอาสลิปออก</button>
        </div>
      {/if}
      <div class="actions">
        <button class="btn" onclick={report} disabled={marking || slipBusy}>
          <Icon name="check" />{marking ? 'กำลังส่ง…' : slip ? 'แจ้งโอนพร้อมสลิป' : 'แจ้งโอน'}
        </button>
        <button class="btn secondary" onclick={() => slipInput.click()} disabled={slipBusy || marking}>
          <Icon name="image" />{slipBusy ? 'กำลังย่อรูป…' : slip ? 'เปลี่ยนสลิป' : 'แนบสลิป'}
        </button>
        <button class="btn quiet" onclick={() => ((reporting = false), (slip = null))}>ยกเลิก</button>
      </div>
    </div>
  {/if}

  <div class="actions">
    {#if isReceiver}
      <button class="btn" onclick={received} disabled={marking}>
        <Icon name="check" />{marking ? 'กำลังบันทึก…' : 'ได้รับเงินแล้ว'}
      </button>
    {:else if !reporting}
      <button class="btn" onclick={() => (reporting = true)}>
        <Icon name="check" />แจ้งว่าโอนแล้ว
      </button>
    {/if}
    {#if payload}
      <button class="btn secondary" onclick={exportImage} disabled={exporting}>
        <Icon name="download" />{exporting ? 'กำลังสร้างรูป…' : 'บันทึกรูป QR'}
      </button>
    {/if}
    <button class="btn secondary" onclick={copyAmount}><Icon name="copy" />คัดลอกยอด</button>
  </div>
</Sheet>

<style>
  .poster {
    display: grid;
    gap: 12px;
    justify-items: start;
  }
  .who {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }
  .who span {
    font-weight: 400;
    opacity: 0.8;
  }
  .poster :global(.poster-amt) {
    font-size: clamp(52px, 14vw, 76px);
    font-weight: 600;
    line-height: 0.95;
    letter-spacing: -0.05em;
  }
  .qr-tile {
    width: min(260px, 66vw);
    padding: 18px;
    margin-top: 6px;
    background: #fff;
    border-radius: var(--r-xl);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
    animation: tile-in 520ms var(--ease-spring);
  }
  @keyframes tile-in {
    from {
      transform: translateY(10px) scale(0.94);
      opacity: 0;
    }
  }
  .pp {
    margin: 0;
    font-size: 14px;
    opacity: 0.9;
  }
  .need-pp {
    width: 100%;
  }
  .need-pp p {
    margin: 0;
  }
  .need-pp .input {
    background: rgba(0, 0, 0, 0.35);
  }
  .tip {
    margin: 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .report {
    display: grid;
    gap: 14px;
  }
  .report p {
    margin: 0;
  }
  .slip-preview {
    display: flex;
    align-items: flex-end;
    gap: 12px;
  }
  .slip-preview img {
    width: 96px;
    max-height: 180px;
    object-fit: cover;
    object-position: top;
    border-radius: var(--r-md);
    box-shadow: 0 0 0 1px var(--hairline);
  }
</style>
