<script>
  import Icon from './Icon.svelte';
  let { back = false, children } = $props();
</script>

<header class="nav">
  <div class="container spread">
    <div class="row" style="--gap: 10px">
      {#if back}
        <a class="icon-btn" href="#/" aria-label="กลับหน้าแรก"><Icon name="back" /></a>
      {/if}
      <a class="mark" href="#/">hann<span>หาร</span></a>
    </div>
    <div class="row" style="--gap: 8px">
      {@render children?.()}
    </div>
  </div>
</header>

<style>
  .nav {
    position: sticky;
    top: 0;
    z-index: 20;
    height: 64px;
    display: flex;
    align-items: center;
    background: rgba(9, 9, 9, 0.78);
    backdrop-filter: saturate(140%) blur(14px);
    -webkit-backdrop-filter: saturate(140%) blur(14px);
  }
  .mark {
    color: var(--ink);
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.06em;
    text-decoration: none;
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
  }
  .mark span {
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0;
    color: var(--ink-muted);
  }
  .icon-btn {
    text-decoration: none;
  }
</style>
