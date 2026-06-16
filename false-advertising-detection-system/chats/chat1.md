# ระบบตรวจสอบข้อมูลด้วย AI

_Started 2026-06-15 06:47 UTC_

---

## User

ต้องการสร้างระบบตรวจสอบข้อมูล 
โดย input สามารถเป็นได้ทั้ง website file ภาพ 
เพื่อวิเคาะห์และสรุปว่าข้อมูลใน link นั้นๆ ด้วย AI ว่ามีการโฆษณาเกินจริงหรือไหม มีความผิดอย่างไร
ผลลัพท์ที่ได้จะถูกบันทึกลง database และมีการทำรายการ
รองรับการการเชี่อมต่อไปยังหน่วยงานที่เกี่ยวข้อง

## Assistant

ก่อนเริ่มออกแบบ ผมขอถามรายละเอียดสักหน่อยครับ เพื่อให้ได้งานที่ตรงกับสิ่งที่คุณต้องการจริงๆ (ตอนนี้โปรเจกต์ยังว่างเปล่าและยังไม่มี design system แนบมา)

_[tool: questions_v2]_

## User

Questions answered:
- design_context: ยังไม่มี ให้เริ่มใหม่ทั้งหมด
- user_type: ประชาชนทั่วไปที่อยากร้องเรียน, เจ้าหน้าที่หน่วยงานรัฐ (เช่น อย./สคบ.), ทีมตรวจสอบ/compliance ภายในองค์กร, ผู้ดูแลแพลตฟอร์ม/marketplace
- vibe: ทางการ น่าเชื่อถือ แบบหน่วยงานรัฐ
- color: เขียว-เทา (อย./สาธารณสุข)
- language: ไทย + อังกฤษปนกัน
- core_screens: หน้าอัปโหลด/วาง input (link, ไฟล์, ภาพ), หน้าผลวิเคราะห์ AI ทีละรายการ (ชี้จุดที่ผิด), Dashboard ภาพรวมสถิติ, ตารางรายการเคสทั้งหมด (database), หน้าส่งต่อ/เชื่อมหน่วยงานที่เกี่ยวข้อง
- analysis_detail: ละเอียด: ไฮไลต์จุดผิด + อ้างอิงมาตรากฎหมาย + คำแนะนำ
- agencies: อย. (อาหารและยา), สคบ. (คุ้มครองผู้บริโภค), กสทช., ตำรวจ/DSI, กำหนดเองได้
- variations: 2-3 แนวทางให้เลือก
- scope: ทำ flow หลักให้กดได้จริง (prototype)

## Assistant

เยี่ยมครับ ผมได้ข้อมูลครบแล้ว ขอสรุปแนวทางก่อนเริ่ม แล้วลงมือสร้างเลย:

**ระบบ:** AdGuard — ระบบตรวจจับโฆษณาเกินจริงด้วย AI (ทางการ, น่าเชื่อถือ, โทนเขียว-เทาแบบหน่วยงานรัฐ)
**Type:** IBM Plex Sans Thai + IBM Plex Mono · **ภาษา:** ไทย+อังกฤษปน
**5 หน้าหลัก กดได้จริง:** แดชบอร์ด → ตรวจสอบใหม่ (link/ไฟล์/ภาพ) → ผลวิเคราะห์ AI (ไฮไลต์จุดผิด+มาตรากฎหมาย+คำแนะนำ) → ฐานข้อมูลเคส → ส่งต่อหน่วยงาน (อย./สคบ./กสทช./DSI)

เริ่มจากโครงหลัก + แดชบอร์ดก่อน แล้วต่อหน้าอื่นทีละหน้าครับ

_[tool: update_todos]_

_[tool: dc_write]_

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: screenshot]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: eval_js]_

Content renders correctly in the live DOM (confirmed via DOM inspection — the screenshot tool is just failing to capture the streamed content; your live preview is fine). Moving on to build the remaining screens.

_[tool: update_todos]_

Now the New Check screen with the analyzing flow:

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: eval_js]_

_[tool: show_html]_

_[tool: eval_js]_

Fresh reload works — the earlier blank was stale hot-reload state. Let me capture the upload screen:

_[tool: save_screenshot]_

The screenshot tool can't capture the streamed DC fragments (a tooling limitation), but DOM inspection confirms content is live. Let me verify nav active-state updates correctly via DOM:

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

Nav active-state works correctly (inline styles update properly — verified via DOM; the screenshot tool just can't capture streamed DC fragments). Everything is live. Let me snip the debugging and continue building.

_[tool: snip]_

_[tool: snip]_

Now the centerpiece — the AI Analysis result screen with highlighted violations, legal references, and recommendations:

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: show_html]_

_[tool: eval_js]_

_[tool: get_webview_logs]_

Result screen renders cleanly. Let me complete the todos and build the remaining two screens — Case Database and Referral.

_[tool: update_todos]_

Now the Case Database and Referral screens:

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: grep]_

_[tool: show_html]_

_[tool: eval_js]_

_[tool: eval_js]_

Both render. Let me verify the interactive flows (agency select → send, and analyze) and check for console errors:

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: get_webview_logs]_

All flows work end-to-end, no console errors. Let me finalize.

_[tool: update_todos]_

_[tool: snip]_

_[tool: snip]_

เสร็จแล้วครับ ระบบ **AdGuard — ระบบตรวจจับโฆษณาเกินจริงด้วย AI** เป็น prototype ที่กดได้จริงทั้ง flow โทนเขียว-เทาแบบหน่วยงานรัฐ (อย./สาธารณสุข) ฟอนต์ IBM Plex Sans Thai ไทย+อังกฤษปนกัน

**5 หน้าหลักที่เชื่อมต่อกันจริง:**
- **แดชบอร์ด** — สถิติภาพรวม, กราฟรายสัปดาห์แยกระดับเสี่ยง, หมวดสินค้าที่พบบ่อย, เคสล่าสุด (คลิกเข้าดูผลได้)
- **ตรวจสอบใหม่** — สลับ input ได้ 3 แบบ (ลิงก์ URL / ไฟล์ / รูปภาพ) → กด "วิเคราะห์ด้วย AI" → overlay แสดงขั้นตอน AI ทำงาน → เด้งไปหน้าผล
- **ผลวิเคราะห์ AI** — ไฮไลต์ข้อความผิดในตัวโฆษณา (พร้อม pin บนภาพ), risk score, มิติความเสี่ยง, และ **รายการความผิดแต่ละข้อพร้อมอ้างอิงมาตรากฎหมาย + คำแนะนำ**
- **ฐานข้อมูลเคส** — ตารางพร้อม filter ตามสถานะ, คลิกแถวเข้าดูผล
- **ส่งต่อหน่วยงาน** — เลือกได้หลายหน่วยงาน (อย./สคบ./กสทช./DSI/กำหนดเอง) แนบหลักฐานอัตโนมัติ → ส่ง → หน้ายืนยันสำเร็จ

**หมายเหตุ:** เป็น prototype ที่ใช้ข้อมูลตัวอย่าง (mock) — การวิเคราะห์ AI และการเชื่อมต่อหน่วยงานเป็นการจำลอง flow ยังไม่ได้ต่อ backend/AI จริง

**ทำได้ต่อ:** ผมเสนอไว้ว่าจะทำ 2-3 แนวทาง layout ของหน้าผลวิเคราะห์ให้เลือก — บอกได้เลยครับว่าอยากให้ลองแนวไหน (เช่น แบบ split view เทียบข้อความ-กฎหมาย, หรือแบบ timeline ความผิด) หรืออยากปรับสี/เพิ่มหน้าไหนก่อน

_[tool: done]_

ส่งมอบเรียบร้อยแล้วครับ — เปิดหน้า AdGuard ให้คุณดูแล้ว ไม่มี error ระบบกำลังตรวจสอบความเรียบร้อยในพื้นหลังอยู่ ลองคลิกดูแต่ละหน้าและทดสอบ flow ตรวจสอบ→ส่งต่อได้เลยครับ แล้วบอกผมได้ว่าอยากปรับหรือเพิ่มอะไร

## User

ต้องการให้เพิ่มปุ่ม ที่สามารถใส่ข้อมูลเพิ่มเพื่อ add context ให้ ai ในอนาคตด้วยครับ

## Assistant

จะเพิ่มเมนู **"บริบท AI" (AI Context)** — หน้าจัดการฐานความรู้ที่ AI ใช้ประกอบการวิเคราะห์ พร้อมปุ่ม **"＋ เพิ่มบริบท"** ที่เปิดฟอร์มกรอกข้อมูล (กฎหมาย / กฎเกณฑ์ภายใน / คำต้องห้าม / เอกสารอ้างอิง) เพิ่มเข้าไปได้จริง และมีปุ่มลัดบนหน้าตรวจสอบด้วยครับ

ขอดูจุดเชื่อมท้าย template ก่อน:

_[tool: grep]_

_[tool: read_file]_

Now adding the AI Context screen + add-context modal:

_[tool: dc_html_str_replace]_

Now a shortcut button on the upload screen too:

_[tool: dc_html_str_replace]_

Now the logic — nav item, state, methods, and render data:

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: show_html]_

_[tool: eval_js]_

_[tool: get_webview_logs]_

All works, no errors. Let me verify the toggle and the upload-screen shortcut:

_[tool: eval_js]_

เพิ่มเรียบร้อยแล้วครับ ✦

เพิ่ม **เมนู "บริบท AI" (AI Context)** เป็นหน้าใหม่ และมีปุ่ม **"＋ เพิ่มบริบท"** ที่ใช้งานได้จริง:

- **ปุ่มเพิ่มบริบท** เปิดฟอร์มกรอกข้อมูล — เลือกประเภทได้ 5 แบบ (กฎหมาย/ประกาศ · คำต้องห้าม · กฎเกณฑ์ภายใน · รายการอนุญาต · เอกสารอ้างอิง), ใส่หัวข้อ, เนื้อหา หรือแนบไฟล์ → กดบันทึกแล้วการ์ดใหม่จะเด้งขึ้นบนสุดทันที
- **หน้าบริบท AI** แสดงสถิติ + การ์ดบริบทที่มีอยู่ (กฎหมาย, ชุดคำต้องห้าม, เกณฑ์ให้คะแนน, เลข อย. ที่รับรอง ฯลฯ) แต่ละการ์ด **เปิด/ปิดการใช้งานได้** ด้วย toggle
- **ปุ่มลัด "✦ เพิ่มบริบทให้ AI"** บนหน้าตรวจสอบใหม่ด้วย เพื่อให้เพิ่มบริบทได้ระหว่างทำงาน

แนวคิดคือข้อมูลที่เพิ่มจะกลายเป็น "ฐานความรู้" ที่ AI ดึงไปใช้ประกอบการวิเคราะห์โฆษณาในอนาคต ยิ่งมีบริบทมาก ผลยิ่งแม่นยำและอ้างอิงมาตราได้ตรงขึ้น

*(ยังเป็น prototype — ข้อมูลที่เพิ่มเก็บในหน่วยความจำของหน้า ยังไม่ได้ต่อ database/AI จริง)*

บอกได้เลยครับถ้าอยากให้บริบทที่เพิ่มไปโผล่เป็น "อ้างอิงที่ใช้" ในหน้าผลวิเคราะห์ด้วย หรืออยากปรับอย่างอื่นเพิ่ม

_[tool: done]_

เปิดให้ดูแล้วครับ ไม่มี error — ลองกดเมนู "บริบท AI" แล้วทดสอบปุ่มเพิ่มบริบทได้เลย มีอะไรให้ปรับเพิ่มบอกได้ครับ

## User

Save as standalone HTML: AdGuard.dc.html

## Assistant

I'll export AdGuard as a standalone HTML file. Let me first check the source for any code-referenced resources, then add a thumbnail.

_[tool: grep]_

No code-referenced assets — only `support.js`, Google Fonts (both HTML attributes the bundler handles automatically), and the `.jpg`/`.pdf` strings are just display labels, not real files. No Claude API. So I only need to add the thumbnail, then bundle.

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: super_inline_html]_

All assets resolved cleanly. Let me verify the bundled file works offline:

_[tool: show_html]_

_[tool: eval_js]_

_[tool: get_webview_logs]_

Works offline — 6 nav items, dashboard renders, fonts embedded, no errors. Here's your standalone file:

_[tool: present_fs_item_for_download]_

เรียบร้อยครับ ✅ ไฟล์ **AdGuard** แบบ standalone (383KB) ทำงานได้ครบทุกหน้าแบบออฟไลน์ — ฟอนต์ฝังในไฟล์แล้ว เปิดได้เลยโดยไม่ต้องต่อเน็ต ดาวน์โหลดจากการ์ดด้านบนได้เลยครับ

## User

ขอ link share project นี้หน่อยครับ

## Assistant

ผมไม่สามารถสร้างลิงก์แชร์โปรเจกต์ได้โดยตรงครับ — การแชร์โปรเจกต์ให้คนอื่นเข้ามาดู/แก้ไข ต้องใช้ปุ่ม **Share** บนแถบเครื่องมือของแอป (มุมขวาบน) ซึ่งจะให้คุณตั้งสิทธิ์และคัดลอกลิงก์ได้เอง

แต่ถ้าคุณแค่อยากได้ **ลิงก์ชั่วคราวสำหรับให้คนอื่นเปิดดูตัวงาน** (ไฟล์ standalone ที่เพิ่ง export) ผมสร้างให้ได้ครับ — เป็นลิงก์อายุสั้นประมาณ 1 ชั่วโมง เปิดดูได้แบบสมบูรณ์เพราะไฟล์รวมทุกอย่างไว้ในตัวแล้ว

ให้ผมสร้างลิงก์ชั่วคราวนั้นไหมครับ? หรือถ้าต้องการแชร์ทั้งโปรเจกต์แบบถาวร แนะนำให้ใช้ปุ่ม Share ในแอปครับ

