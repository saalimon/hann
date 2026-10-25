<script>
  let { name = '?', index = 0, size = 36 } = $props();
  // The gradient family colours people so they're easy to tell apart at a glance.
  const tones = ['#6a4cf5', '#d44df0', '#ff7a3d', '#ff5577'];
  const initial = $derived([...(name.trim() || '?')][0].toUpperCase());
</script>

<span
  class="avatar"
  style="--size:{size}px; --tone:{tones[index % tones.length]}"
  aria-hidden="true">{initial}</span
>

<style>
  .avatar {
    width: var(--size);
    height: var(--size);
    flex: none;
    display: inline-grid;
    place-items: center;
    border-radius: 50%;
    background: var(--tone);
    color: #fff;
    font-size: calc(var(--size) * 0.42);
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0;
  }
</style>
