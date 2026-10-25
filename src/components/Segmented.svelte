<script>
  // Pill tabs with a lift indicator that slides to the selected tab.
  let { options, value = $bindable(), label = 'มุมมอง' } = $props();

  let buttons = $state([]);
  let indicator = $state({ x: 0, w: 0, ready: false });

  function measure() {
    const i = options.findIndex((o) => o.value === value);
    const el = buttons[i];
    if (el) indicator = { x: el.offsetLeft, w: el.offsetWidth, ready: true };
  }

  $effect(() => {
    value;
    options.length;
    measure();
  });

  $effect(() => {
    const ro = new ResizeObserver(measure);
    buttons.forEach((b) => b && ro.observe(b));
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  });

  function onKey(e) {
    const i = options.findIndex((o) => o.value === value);
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + options.length) % options.length;
    value = options[next].value;
    buttons[next]?.focus();
  }
</script>

<div class="seg" role="tablist" aria-label={label} tabindex="-1" onkeydown={onKey}>
  <span
    class="indicator"
    class:ready={indicator.ready}
    style="transform: translateX({indicator.x}px); width: {indicator.w}px"
  ></span>
  {#each options as opt, i (opt.value)}
    <button
      bind:this={buttons[i]}
      role="tab"
      aria-selected={value === opt.value}
      tabindex={value === opt.value ? 0 : -1}
      onclick={() => (value = opt.value)}
    >
      {opt.label}
      {#if opt.count !== undefined}<span class="count num">{opt.count}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .seg {
    position: relative;
    display: inline-flex;
    padding: 4px;
    gap: 2px;
    border-radius: var(--r-pill);
    background: var(--surface-1);
    max-width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .indicator {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 0;
    border-radius: var(--r-pill);
    background: var(--surface-3);
    box-shadow: var(--shadow-float);
    opacity: 0;
  }
  .indicator.ready {
    opacity: 1;
    transition:
      transform 380ms var(--ease-spring),
      width 380ms var(--ease-spring);
  }
  button {
    position: relative;
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--ink-muted);
    min-height: 40px;
    padding: 8px 18px;
    border-radius: var(--r-pill);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: color var(--dur) var(--ease-out);
  }
  button[aria-selected='true'] {
    color: var(--ink);
  }
  .count {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-muted);
  }
</style>
