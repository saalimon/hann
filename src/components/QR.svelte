<script>
  import QRCode from 'qrcode';
  let { text, label = 'QR code', dark = '#000000', light = '#ffffff' } = $props();

  let svg = $state('');
  $effect(() => {
    const value = text;
    let alive = true;
    QRCode.toString(value, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark, light } })
      .then((s) => alive && (svg = s))
      .catch(() => alive && (svg = ''));
    return () => (alive = false);
  });
</script>

<div class="qr" role="img" aria-label={label}>
  {#key svg}
    <div class="inner">{@html svg}</div>
  {/key}
</div>

<style>
  .qr {
    aspect-ratio: 1;
    width: 100%;
  }
  .inner {
    width: 100%;
    height: 100%;
    animation: qr-in 420ms var(--ease-out);
  }
  .inner :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
    shape-rendering: crispEdges;
  }
  @keyframes qr-in {
    from {
      opacity: 0;
      filter: blur(6px);
      transform: scale(0.97);
    }
  }
</style>
