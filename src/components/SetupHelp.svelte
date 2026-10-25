<script>
  import { firebaseConfig } from '../firebase-config.js';
  let { error } = $props();

  const code = $derived(error?.code || 'UNKNOWN');
</script>

<div class="container wrap">
  <p class="caption muted">hann</p>
  {#if code === 'CONFIG_MISSING'}
    <h1 class="display-lg">ยังไม่ได้ตั้งค่า Firebase</h1>
    <p class="body-lg muted">เว็บนี้ถูก build โดยไม่มีค่า Firebase config</p>
    <ol class="steps card">
      <li>GitHub repo → Settings → Secrets and variables → Actions</li>
      <li>สร้าง secret ชื่อ FIREBASE_CONFIG ใส่ config ของเว็บแอปเป็น JSON</li>
      <li>รัน workflow Deploy to GitHub Pages ใหม่</li>
    </ol>
  {:else if code === 'AUTH_DISABLED'}
    <h1 class="display-lg">เปิด Anonymous sign-in ก่อนใช้งาน</h1>
    <p class="body-lg muted">
      แอปใช้บัญชีแบบไม่ระบุตัวตนเพื่อให้ลิงก์แชร์ใช้ได้ครั้งเดียวจริง ๆ ต้องเปิดครั้งเดียวใน Firebase Console
    </p>
    <ol class="steps card">
      <li>เปิด Firebase Console โปรเจกต์ <b>{firebaseConfig?.projectId}</b></li>
      <li>ไปที่ Authentication แล้วกด Get started (ถ้ายังไม่เคยเปิด)</li>
      <li>แท็บ Sign-in method เลือก Anonymous แล้วเปิด Enable</li>
      <li>กลับมาโหลดหน้านี้ใหม่</li>
    </ol>
  {:else}
    <h1 class="display-lg">เชื่อมต่อ Firebase ไม่ได้</h1>
    <p class="body-lg muted">ตรวจอินเทอร์เน็ต แล้วลองโหลดหน้าใหม่ ถ้ายังไม่ได้ ให้ตรวจการตั้งค่า Firebase ของแอป</p>
  {/if}
  <button class="btn" onclick={() => location.reload()}>โหลดใหม่</button>
  <p class="micro muted">รหัสข้อผิดพลาด: {code}</p>
</div>

<style>
  .wrap {
    max-width: 680px;
    display: grid;
    gap: 20px;
    padding-top: 12vh;
    justify-items: start;
  }
  .steps {
    margin: 0;
    padding-left: 44px;
    display: grid;
    gap: 8px;
    width: 100%;
  }
  .micro {
    font-size: 12px;
  }
</style>
