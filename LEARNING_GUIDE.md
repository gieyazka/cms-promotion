# 📘 คู่มือเรียนรู้โครงสร้างโปรเจกต์ CMS Promotion

โปรเจกต์นี้ถูกออกแบบมาเพื่อเป็นระบบจัดการเนื้อหา (CMS) ที่ยืดหยุ่น โดยเน้นการส่งข้อมูลไปยังหลาย Platform (Omnichannel) ทั้ง Web และ Mobile (Flutter)

## 🏗️ 1. สถาปัตยกรรม (Architecture)

```text
[ Next.js Frontend ] <--> [ Next.js API Routes ] <--> [ JSON Data Storage ]
        |                         |
        v                         |
[ Tiptap Editor ]                 +--------------> [ Flutter App ]
        |                                          (Consumer via JSON)
        v
[ Cloudinary Storage ]
(Image Assets)
```

## 🧩 2. ส่วนประกอบสำคัญ

### 🖋️ Tiptap Editor (`src/components/TiptapEditor.tsx`)
เราใช้ **Tiptap** เพราะมันเป็น "Headless Editor" หมายความว่าเราสามารถควบคุม UI ได้ทั้งหมด 100% โดยที่ Tiptap จัดการเรื่อง Logic ของการแก้ไขเนื้อหาให้
- **JSON Output**: ต่างจาก Editor ทั่วไปที่มักจะให้ค่าเป็น HTML, Tiptap ให้ค่าเป็น **JSON (ProseMirror Node Tree)** ซึ่งเหมาะสมที่สุดสำหรับการนำไปวาด Native UI ใน Flutter
- **Extensions**: เรามีการเพิ่ม Extension สำหรับรูปภาพ (`StarterKit`, `Image`, `Link`)

### ☁️ Cloudinary Upload
ใน `TiptapEditor.tsx` มีฟังก์ชัน `addImage` ที่ทำหน้าที่:
1. รับไฟล์จากผู้ใช้
2. ยิง API ตรงไปที่ Cloudinary (Client-side upload)
3. นำ URL ที่ได้กลับมาแทรกในเนื้อหาเป็น `<img src="...">` (ใน JSON จะเป็น Node ประเภท image)

### 💾 Backend & API (`src/app/api/`)
- **FileSystem Storage**: เพื่อความง่าย เราใช้ `fs/promises` ในการอ่าน/เขียนไฟล์ `data/promotions.json`
- **Dynamic Routes**: โฟลเดอร์ `[id]` ช่วยให้เราสร้าง API ที่รับ Parameter ได้ เช่น `/api/promotions/123`

## 🔄 3. เส้นทางของข้อมูล (Data Flow)

1.  **Creation**: ผู้ใช้พิมพ์ใน Tiptap -> Editor แปลงเป็น JSON -> ส่งไปที่ API `POST /api/promotions`
2.  **Storage**: API บันทึก JSON ลงไฟล์ `promotions.json`
3.  **Consumption (Web)**: หน้ารายละเอียดดึง JSON มาแล้วใช้ฟังก์ชัน `generateHTML()` เพื่อแปลงเป็น HTML และแสดงผลด้วย Tailwind Typography (`prose`)
4.  **Consumption (Mobile)**: Flutter ดึง JSON ผ่าน API เดียวกัน และนำไป Parse เป็น Widget ของตัวเอง

## 📱 4. ทำไมต้อง JSON? (Tiptap JSON vs HTML)

| คุณสมบัติ | HTML | Tiptap JSON |
| :--- | :--- | :--- |
| **ความง่าย (Web)** | ง่ายมาก (ใช้ `innerHTML`) | ต้องแปลงก่อนแสดงผล |
| **ความยืดหยุ่น (Mobile)** | ยาก (ต้อง parse HTML tag) | **ง่าย** (เป็น Tree structure ชัดเจน) |
| **Semantic** | ต่ำ (เน้นการแสดงผล) | **สูง** (เน้นความหมายของข้อมูล) |

## 🚀 5. คำแนะนำสำหรับการพัฒนาต่อ
- **Database**: เมื่อโปรเจกต์ใหญ่ขึ้น ควรเปลี่ยนจากไฟล์ JSON เป็น **Supabase (PostgreSQL)** หรือ **MongoDB**
- **Authentication**: เพิ่ม **NextAuth.js** เพื่อจำกัดสิทธิ์ผู้ที่สามารถเข้ามาแก้ไขโปรโมชั่น
- **Validation**: ใช้ **Zod** ในการตรวจสอบโครงสร้าง JSON ก่อนบันทึกลงไฟล์/ฐานข้อมูล

---
*จัดทำเพื่อการเรียนรู้และต่อยอดระบบ CMS Promotion อย่างยั่งยืน* 🌟
