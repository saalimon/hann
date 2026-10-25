// Tiny global toast queue.
export const toasts = $state([]);
let seq = 0;

export function toast(text, { tone = 'info', ms = 2600 } = {}) {
  const id = ++seq;
  toasts.push({ id, text, tone });
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id);
    if (i >= 0) toasts.splice(i, 1);
  }, ms);
}

/** Thai explanation for backend error codes. */
export function explainError(err) {
  switch (err?.code) {
    case 'PERMISSION':
      return 'ไม่มีสิทธิ์เข้าถึงบิลนี้ ขอลิงก์ใหม่จากเจ้าของบิล';
    case 'NETWORK':
      return 'เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง';
    case 'AUTH_DISABLED':
      return 'ยังไม่ได้เปิด Anonymous sign-in ใน Firebase';
    case 'INVITE_GONE':
      return 'ลิงก์นี้ถูกใช้ไปแล้วหรือหมดอายุ';
    default:
      return 'บันทึกไม่สำเร็จ ลองอีกครั้ง';
  }
}
