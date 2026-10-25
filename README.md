# hann — หารค่าข้าว ค่าเที่ยว

เว็บแอปหารค่าใช้จ่ายตามคน จดว่าใครจ่ายอะไร แอปคิดให้ว่าใครต้องโอนให้ใครเท่าไร
แล้วสร้าง QR พร้อมเพย์ตามยอดจริงให้สแกนจ่ายจากแอปธนาคารได้ทันที

**เว็บ:** https://saalimon.github.io/hann/

## ทำอะไรได้บ้าง

- **หารตามรายการ** แต่ละรายการเลือกได้ว่าใครจ่าย และหารกับใครบ้าง (ทุกคน หรือบางคน)
- **Service charge 10% / VAT 7%** ติ๊กได้รายรายการ (VAT คิดหลังบวก service)
- **โอนน้อยครั้งที่สุด** จับคู่คนที่ค้างมากสุดกับคนที่ต้องได้คืนมากสุด เศษสตางค์แจกให้ครบทุกสตางค์
- **QR พร้อมเพย์ต่อยอดโอน** รองรับเบอร์มือถือ เลขบัตรประชาชน/ผู้เสียภาษี และ e-Wallet บันทึกเป็นรูปหรือแชร์ได้
- **บันทึกว่าโอนแล้ว** ยอดที่โอนแล้วถูกนับเป็นเงินที่จ่ายจริง ถ้าเพิ่มรายการทีหลัง ยอดที่เหลือก็ยังถูกต้อง
- **ซิงก์แบบเรียลไทม์** ทุกคนในบิลเห็นข้อมูลตรงกันผ่าน Firebase Realtime Database
- **ลิงก์เชิญใช้ได้ครั้งเดียว** คนแรกที่เปิดลิงก์จะเข้าบิลได้ถาวรบนเครื่องนั้น แล้วลิงก์จะตายทันที (บังคับด้วย security rules ไม่ใช่แค่ฝั่งหน้าเว็บ) ลิงก์ที่ไม่มีใครเปิดหมดอายุใน 7 วัน

## ตั้งค่า Firebase (ทำครั้งเดียว)

โปรเจกต์ `your-project-id` ใน [Firebase Console](https://console.firebase.google.com/project/your-project-id):

1. **Realtime Database** อยู่ที่ region Singapore:
   `https://your-project-id-default-rtdb.asia-southeast1.firebasedatabase.app` (ตั้งไว้ใน
   [`src/firebase-config.js`](src/firebase-config.js) แล้ว ถ้าย้ายฐานข้อมูล แก้ที่ไฟล์นั้น
   หรือตั้ง repository variable `FIREBASE_DATABASE_URL` ใน Settings → Secrets and variables → Actions → Variables)
2. **Authentication** → Get started → Sign-in method → เปิด **Anonymous**
   (ใช้ระบุเครื่อง เพื่อให้ลิงก์เชิญใช้ได้ครั้งเดียวจริง ผู้ใช้ไม่ต้องสมัครอะไร)
3. **Realtime Database → Rules** → วางเนื้อหาจาก [`database.rules.json`](database.rules.json) แล้วกด Publish
   หรือใช้ CLI: `npx firebase-tools deploy --only database`

## Deploy บน GitHub Pages

ทุกครั้งที่ push เข้า `main` GitHub Actions จะรันเทสต์ build และ deploy ให้อัตโนมัติ
ครั้งแรกต้องตั้ง **Settings → Pages → Source: GitHub Actions**

## พัฒนาบนเครื่อง

```bash
npm install
npm run dev                         # ใช้ Firebase จริง
VITE_BACKEND=local npm run dev      # ไม่ต่อเน็ต: เก็บข้อมูลใน localStorage
npm test                            # unit tests (PromptPay payload, การหาร, การโอน)
npm run build
```

โหมด `local` ให้แต่ละแท็บเป็นคนละ "เครื่อง" ลองลิงก์เชิญได้โดยเปิดลิงก์ในแท็บใหม่

## โครงสร้าง

```
src/
  lib/promptpay.js        สร้าง payload EMVCo ของพร้อมเพย์ + CRC16 (ทดสอบเทียบกับ promptpay-qr)
  lib/money.js            เงินเก็บเป็นสตางค์ (integer) กันปัญหาทศนิยม
  lib/split.js            คำนวณยอดแต่ละคนและรายการโอน
  lib/backend/firebase.js Firebase RTDB + Anonymous Auth + ลิงก์เชิญ
  lib/backend/local.js    backend จำลองสำหรับ dev
  components/             หน้าจอ (Svelte 5)
database.rules.json       security rules
```

ข้อมูลใน RTDB:

```
sessions/{billId}   meta, access/{uid}, members, items, payments, invites (สถานะลิงก์)
invites/{token}     { sid, createdBy, expiresAt, usedBy, usedAt }
```

## ความปลอดภัยโดยย่อ

- อ่าน/เขียนบิลได้เฉพาะ uid ที่อยู่ใน `access` ของบิลนั้น
- uid จะเข้า `access` ได้ก็ต่อเมื่อเป็นคนที่ `usedBy` ของลิงก์เชิญเท่านั้น และ `usedBy` เขียนได้ครั้งเดียวก่อนหมดอายุ
- หลังลิงก์ถูกใช้ คนอื่นอ่านลิงก์นั้นไม่ได้อีก
- ถ้าล้างข้อมูลเบราว์เซอร์ เครื่องนั้นจะเสียสิทธิ์เข้าบิล ขอลิงก์ใหม่จากคนในบิลได้
- QR พร้อมเพย์เป็นแค่ข้อมูลบัญชีปลายทาง ผู้จ่ายควรตรวจชื่อผู้รับในแอปธนาคารก่อนยืนยันทุกครั้ง

Design อ้างอิง [Framer DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/framer/DESIGN.md)
และแนวทาง motion จาก [Motion UI Design](https://github.com/chaconnewu/awesome-augmented/blob/master/awesomes/motion-ui-design.md)
ฟอนต์ Inter + Anuphan (self-hosted ผ่าน Fontsource)
