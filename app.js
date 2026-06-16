// ================= STATE =================
const state = {
  screen: 'dashboard',
  selectedId: 'AD-2026-0481',
  inputMode: 'link',
  linkValue: '',
  fileLoaded: false,
  fileText: '',
  imageBase64: '',
  imageMediaType: 'image/jpeg',
  analyzing: false,
  analyzeError: '',
  aiResult: null,
  viewAnalysis: null,
  caseCounts: { all:24, pending:7, review:5, referred:9, cleared:3 },
  progress: 0,
  handoffAgencies: [],
  handoffNote: '',
  handoffSent: false,
  caseFilter: 'all',
  showAddContext: false,
  draftType: 'law',
  draftTitle: '',
  draftBody: '',
  contextItems: [
    { id:1, type:'law', title:'พ.ร.บ.อาหาร พ.ศ. 2522 — หมวดการโฆษณา', body:'มาตรา 40–41 ว่าด้วยการห้ามโฆษณาคุณประโยชน์ คุณภาพ หรือสรรพคุณเกินจริง และการอ้างรักษาโรคสำหรับผลิตภัณฑ์อาหาร', meta:'อัปเดต 1 มิ.ย. 2026', active:true },
    { id:2, type:'banned', title:'คำต้องห้าม — กลุ่มอาหารเสริม', body:'รักษาหายขาด · ลดน้ำหนัก X กก. ใน Y วัน · เห็นผล 100% · ปลอดภัยไร้ผลข้างเคียง · อย. รับรอง (เกินจริง) · รักษาเบาหวาน/มะเร็ง', meta:'128 คำ · อัปเดต 8 มิ.ย.', active:true },
    { id:3, type:'rule', title:'เกณฑ์ให้คะแนนความเสี่ยงภายใน อย.', body:'หลักเกณฑ์การให้ Risk Score 0–100 ตามประเภทการอ้างสรรพคุณ ความรุนแรง และผลกระทบต่อผู้บริโภค', meta:'v3.2 · อัปเดต 5 มิ.ย.', active:true },
    { id:4, type:'whitelist', title:'เลขสารบบอาหาร อย. ที่รับรองแล้ว', body:'ฐานข้อมูลเลข อย. และแบรนด์ที่ผ่านการขึ้นทะเบียนถูกต้อง ใช้ตรวจการแอบอ้างเครื่องหมายรับรอง', meta:'1,240 รายการ', active:true },
    { id:5, type:'doc', title:'ประกาศกระทรวงสาธารณสุข ฉบับที่ 293', body:'รายการสรรพคุณที่ห้ามแสดงบนฉลากและสื่อโฆษณาผลิตภัณฑ์เสริมอาหาร (เอกสารแนบ PDF)', meta:'PDF · 14 หน้า', active:false },
  ],
};

const navDef = [
  { key:'dashboard', th:'แดชบอร์ด',      en:'Dashboard',     icon:'▦' },
  { key:'upload',    th:'ตรวจสอบใหม่',    en:'New Check',     icon:'＋' },
  { key:'result',    th:'ผลวิเคราะห์ AI', en:'AI Analysis',   icon:'◎' },
  { key:'cases',     th:'ฐานข้อมูลเคส',   en:'Case Database', icon:'▤', badge:'24' },
  { key:'context',   th:'บริบท AI',       en:'AI Context',    icon:'✦' },
  { key:'handoff',   th:'ส่งต่อหน่วยงาน', en:'Referral',      icon:'➤' },
];

const titles = {
  dashboard: ['แดชบอร์ดภาพรวม', 'Overview Dashboard · ศูนย์เฝ้าระวังโฆษณา'],
  upload:    ['ตรวจสอบรายการใหม่', 'New Verification · วาง URL / อัปโหลดไฟล์ / ภาพ'],
  result:    ['ผลการวิเคราะห์ด้วย AI', 'AI Analysis Report · AD-2026-0481'],
  cases:     ['ฐานข้อมูลเคส', 'Case Database · 24 records'],
  context:   ['บริบท & ฐานความรู้ AI', 'AI Context & Knowledge Base'],
  handoff:   ['ส่งต่อหน่วยงานที่เกี่ยวข้อง', 'Inter-agency Referral'],
};

const ctxTypes = {
  law:       { label:'กฎหมาย/ประกาศ', icon:'§', color:'#2563a8', bg:'#e7f0fb', bd:'#cfe0f5' },
  banned:    { label:'คำต้องห้าม',     icon:'⊘', color:'#c0392b', bg:'#fdecea', bd:'#f5c6bf' },
  rule:      { label:'กฎเกณฑ์ภายใน',   icon:'◆', color:'#157347', bg:'#e9f4ee', bd:'#c9e6d4' },
  whitelist: { label:'รายการอนุญาต',   icon:'✓', color:'#6b7d75', bg:'#eef2f0', bd:'#dde5e0' },
  doc:       { label:'เอกสารอ้างอิง',   icon:'▤', color:'#6b39b8', bg:'#f0e9fb', bd:'#ddccf3' },
};

// Loaded from the database (/api/cases) at startup; this is the offline fallback.
let allCases = [
  { id:'AD-2026-0481', title:'อาหารเสริมลดน้ำหนัก "SlimX Pro Detox"', brand:'SlimX', source:'shopee.co.th/slimx-pro', channel:'Shopee', type:'image', risk:'high', riskTh:'เสี่ยงสูง', status:'pending', statusTh:'รอตรวจสอบ', date:'14 มิ.ย.', violations:3, agency:'อย.', score:92 },
  { id:'AD-2026-0479', title:'เซรั่มหน้าใส "GlowMax" ลดฝ้าใน 3 วัน', brand:'GlowMax', source:'facebook.com/glowmax.th', channel:'Facebook', type:'link', risk:'high', riskTh:'เสี่ยงสูง', status:'review', statusTh:'กำลังตรวจ', date:'14 มิ.ย.', violations:4, agency:'อย.', score:88 },
  { id:'AD-2026-0476', title:'คอร์สเทรดทำเงิน "รวยเร็ว 300%/เดือน"', brand:'FX Master', source:'tiktok.com/@fxmaster', channel:'TikTok', type:'link', risk:'high', riskTh:'เสี่ยงสูง', status:'referred', statusTh:'ส่งต่อแล้ว', date:'13 มิ.ย.', violations:5, agency:'กลต./DSI', score:95 },
  { id:'AD-2026-0470', title:'เครื่องกรองน้ำ "PureLife" รักษาโรคได้', brand:'PureLife', source:'lazada.co.th/purelife', channel:'Lazada', type:'image', risk:'medium', riskTh:'ปานกลาง', status:'pending', statusTh:'รอตรวจสอบ', date:'13 มิ.ย.', violations:2, agency:'สคบ.', score:64 },
  { id:'AD-2026-0468', title:'แพ็กเกจเน็ตมือถือ "ไม่อั้นจริง" 4G', brand:'NetFast', source:'netfast.co.th/promo', channel:'Website', type:'link', risk:'medium', riskTh:'ปานกลาง', status:'review', statusTh:'กำลังตรวจ', date:'12 มิ.ย.', violations:2, agency:'กสทช.', score:58 },
  { id:'AD-2026-0463', title:'กาแฟควบคุมน้ำหนัก "FitCoffee"', brand:'FitCoffee', source:'instagram.com/fitcoffee', channel:'Instagram', type:'image', risk:'medium', riskTh:'ปานกลาง', status:'cleared', statusTh:'ปิดเคส', date:'12 มิ.ย.', violations:1, agency:'อย.', score:46 },
  { id:'AD-2026-0459', title:'ประกันสุขภาพ "คุ้มครองทันที 100%"', brand:'SureCare', source:'surecare.co.th', channel:'Website', type:'file', risk:'low', riskTh:'เสี่ยงต่ำ', status:'cleared', statusTh:'ปิดเคส', date:'11 มิ.ย.', violations:1, agency:'คปภ.', score:28 },
  { id:'AD-2026-0455', title:'ครีมกันแดด "UV Shield SPF100"', brand:'UV Shield', source:'shopee.co.th/uvshield', channel:'Shopee', type:'image', risk:'clear', riskTh:'ไม่พบ', status:'cleared', statusTh:'ปิดเคส', date:'10 มิ.ย.', violations:0, agency:'-', score:8 },
];

// ================= HELPERS =================
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function riskBadge(risk){
  const m = {
    high:   'background:#fdecea;color:#c0392b;border:1px solid #f5c6bf;',
    medium: 'background:#fdf4e3;color:#a9760e;border:1px solid #f3e0b5;',
    low:    'background:#eaf4ee;color:#2c7a4f;border:1px solid #c9e6d4;',
    clear:  'background:#eef2f0;color:#6b7d75;border:1px solid #dde5e0;',
  };
  return 'display:inline-flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:600;padding:3px 11px;border-radius:20px;white-space:nowrap;' + (m[risk]||m.clear);
}
function statusBadge(status){
  const m = {
    pending:  'background:#fdf4e3;color:#a9760e;',
    review:   'background:#e7f0fb;color:#2563a8;',
    referred: 'background:#f0e9fb;color:#6b39b8;',
    cleared:  'background:#eef2f0;color:#6b7d75;',
  };
  return 'display:inline-flex;align-items:center;font-size:11px;font-weight:600;padding:3px 9px;border-radius:7px;white-space:nowrap;' + (m[status]||m.cleared);
}

// ================= ACTIONS =================
const app = {
  setState(patch){ Object.assign(state, patch); render(); },
  go(screen){ state.screen = screen; state.handoffSent = false; render(); scrollTop(); },

  // ---- data loaders (DB-backed) ----
  async loadCases(){
    try {
      const r = await fetch('/api/cases?filter=' + encodeURIComponent(state.caseFilter));
      if(!r.ok) return;
      const d = await r.json();
      allCases = d.cases; state.caseCounts = d.counts; render();
    } catch { /* offline — keep fallback data */ }
  },
  async loadContext(){
    try {
      const r = await fetch('/api/context');
      if(!r.ok) return;
      const d = await r.json();
      state.contextItems = d.items; render();
    } catch { /* offline — keep fallback data */ }
  },

  async openCase(id){
    state.screen='result'; state.selectedId=id; state.viewAnalysis=null; render(); scrollTop();
    try {
      const r = await fetch('/api/cases/' + encodeURIComponent(id));
      if(r.ok){ const c = await r.json(); state.viewAnalysis = c.analysis || null; render(); }
    } catch { /* keep static mock */ }
  },
  setMode(mode){ this.setState({ inputMode: mode }); },
  setExample(v){ this.setState({ linkValue: v }); },

  // Real file picker — reads the chosen file so we can send it to the API
  pickFile(){ document.getElementById('realFileInput')?.click(); },
  onFileChosen(input){
    const file = input.files && input.files[0];
    if(!file) return;
    const reader = new FileReader();
    if(state.inputMode === 'image'){
      reader.onload = () => {
        const dataUrl = String(reader.result);
        state.imageBase64 = dataUrl.split(',')[1] || '';
        state.imageMediaType = file.type || 'image/jpeg';
        state.fileName = file.name; state.fileMetaReal = Math.round(file.size/1024) + ' KB';
        state.fileLoaded = true; render();
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        state.fileText = String(reader.result).slice(0, 20000);
        state.fileName = file.name; state.fileMetaReal = Math.round(file.size/1024) + ' KB';
        state.fileLoaded = true; render();
      };
      reader.readAsText(file);
    }
  },

  analyze(){
    if(state.analyzing) return;
    state.analyzing = true; state.progress = 0; state.analyzeError = ''; state._done = false; state.aiResult = null; render();

    // animate progress toward 90% while the request is in flight
    const tick = () => {
      const cap = state._done ? 100 : 90;
      state.progress = Math.min(cap, state.progress + (state.progress < 70 ? 7 : 3));
      render();
      if(state.progress < 100){ this._t = setTimeout(tick, 180); }
      else { setTimeout(()=>{
        state.analyzing = false;
        if(state.aiResult){
          state.screen = 'result';
          state.selectedId = state.aiResult.caseId || 'AI';
          state.viewAnalysis = state.aiResult;
          this.loadCases();
        }
        render(); scrollTop();
      }, 350); }
    };
    this._t = setTimeout(tick, 200);

    const context = state.contextItems.filter(c=>c.active).map(c=>c.title);
    const payload = {
      mode: state.inputMode,
      url: state.inputMode === 'link' ? ('https://' + state.linkValue) : '',
      text: state.inputMode === 'file' ? state.fileText : '',
      imageBase64: state.inputMode === 'image' ? state.imageBase64 : '',
      imageMediaType: state.imageMediaType,
      context,
    };

    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async r => { const d = await r.json(); if(!r.ok) throw new Error(d.error || ('HTTP ' + r.status)); return d; })
      .then(result => { state.aiResult = result; state._done = true; })
      .catch(err => {
        state._done = true; state.aiResult = null; state.analyzeError = err.message || 'เกิดข้อผิดพลาด';
        clearTimeout(this._t);
        state.analyzing = false; state.progress = 0; render();
        alert('วิเคราะห์ไม่สำเร็จ: ' + state.analyzeError + '\n\n(ตรวจสอบว่ารันผ่าน server.js และตั้งค่า ANTHROPIC_API_KEY แล้ว)');
      });
  },
  setFilter(f){ state.caseFilter = f; render(); this.loadCases(); },
  toggleAgency(key){
    const has = state.handoffAgencies.includes(key);
    state.handoffAgencies = has ? state.handoffAgencies.filter(k=>k!==key) : [...state.handoffAgencies, key];
    render();
  },
  async send(){
    if(state.handoffAgencies.length === 0) return;
    const id = state.selectedId;
    try {
      const r = await fetch('/api/cases/' + encodeURIComponent(id) + '/refer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agencies: state.handoffAgencies, note: state.handoffNote }),
      });
      if(!r.ok){ const d = await r.json().catch(()=>({})); throw new Error(d.error || ('HTTP ' + r.status)); }
      this.loadCases();
    } catch(err){ /* still show success in the prototype, but log */ console.warn('refer failed:', err.message); }
    state.handoffSent = true; render(); scrollTop();
  },
  resetHandoff(){ this.setState({ handoffSent:false, handoffAgencies:[], handoffNote:'' }); },
  openAddContext(){ this.setState({ showAddContext:true, draftType:'law', draftTitle:'', draftBody:'' }); },
  closeAddContext(){ this.setState({ showAddContext:false }); },
  setDraftType(k){ this.setState({ draftType:k }); },
  async saveContext(){
    if(!state.draftTitle.trim()) return;
    const meta = 'เพิ่มเมื่อ ' + new Date().toLocaleDateString('th-TH',{day:'numeric',month:'short'});
    const payload = { type: state.draftType, title: state.draftTitle.trim(), body: state.draftBody.trim() || '—', meta };
    state.showAddContext = false; state.screen = 'context'; render(); scrollTop();
    try {
      const r = await fetch('/api/context', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if(r.ok){ const item = await r.json(); state.contextItems = [{...item, active: !!item.active}, ...state.contextItems]; render(); }
    } catch { /* offline — add locally */
      state.contextItems = [{ id: Date.now(), ...payload, active:true }, ...state.contextItems]; render();
    }
  },
  async toggleContext(id){
    state.contextItems = state.contextItems.map(c => c.id===id ? {...c, active:!c.active} : c);
    render();
    try { await fetch('/api/context/' + id + '/toggle', { method:'PATCH' }); } catch { /* optimistic */ }
  },
  refreshSaveBtn(){
    const btn = document.getElementById('saveCtxBtn');
    if(!btn) return;
    const canSave = state.draftTitle.trim().length > 0;
    btn.style.cursor = canSave ? 'pointer' : 'not-allowed';
    btn.style.background = canSave ? '#157347' : '#cdd8d2';
    btn.style.boxShadow = canSave ? '0 2px 8px rgba(21,115,71,.3)' : 'none';
  },
};

function scrollTop(){ requestAnimationFrame(()=>{ const m=document.querySelector('main'); if(m) m.scrollTop=0; }); }

// ================= SCREENS =================
function dashboardHTML(){
  const stats = [
    { label:'เคสทั้งหมด · Total', value:'1,284', delta:'+18%', sub:'เดือนนี้ · this month', accent:'#2f9e6a' },
    { label:'รอตรวจสอบ · Pending', value:'47', delta:'+12', sub:'ต้องดำเนินการ', accent:'#e0a92e' },
    { label:'เสี่ยงสูง · High risk', value:'31', delta:'+6', sub:'พบความผิดชัดเจน', accent:'#d64545' },
    { label:'ส่งต่อแล้ว · Referred', value:'208', delta:'+9%', sub:'ไปยังหน่วยงาน', accent:'#6b39b8' },
  ];
  const chart = [
    { day:'จ.', high:34, mid:30, safe:46 },{ day:'อ.', high:28, mid:38, safe:52 },
    { day:'พ.', high:44, mid:34, safe:40 },{ day:'พฤ.', high:52, mid:28, safe:48 },
    { day:'ศ.', high:38, mid:42, safe:56 },{ day:'ส.', high:22, mid:24, safe:38 },
    { day:'อา.', high:18, mid:20, safe:30 },
  ];
  const categories = [
    { name:'อาหารเสริม / ลดน้ำหนัก', count:'412', pct:100, color:'#d64545' },
    { name:'เครื่องสำอาง / สกินแคร์', count:'318', pct:77, color:'#e0a92e' },
    { name:'การเงิน / ลงทุน', count:'201', pct:49, color:'#6b39b8' },
    { name:'โทรคมนาคม', count:'147', pct:36, color:'#2563a8' },
    { name:'เครื่องมือแพทย์', count:'94', pct:23, color:'#2f9e6a' },
  ];
  const recent = allCases.slice(0,5);
  return `<div style="max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px;">
      ${stats.map(s=>`<div style="background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:18px;position:relative;overflow:hidden;">
        <div style="font-size:12px;color:#7d8e86;font-weight:500;margin-bottom:10px;">${s.label}</div>
        <div style="display:flex;align-items:flex-end;gap:8px;">
          <div style="font-size:32px;font-weight:700;color:#16241d;line-height:1;font-family:'IBM Plex Mono',monospace;">${s.value}</div>
          <div style="font-size:12px;font-weight:600;font-family:'IBM Plex Mono',monospace;color:${s.accent};">${s.delta}</div>
        </div>
        <div style="font-size:11px;color:#9aa8a1;margin-top:6px;">${s.sub}</div>
        <div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:${s.accent};"></div>
      </div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:16px;margin-bottom:18px;">
      <div style="background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
          <div>
            <div style="font-size:14px;font-weight:600;color:#16241d;">ปริมาณการตรวจสอบรายสัปดาห์</div>
            <div style="font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;">Weekly detection volume</div>
          </div>
          <div style="display:flex;gap:14px;font-size:11px;color:#7d8e86;">
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:9px;height:9px;border-radius:2px;background:#d64545;"></span>เสี่ยงสูง</span>
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:9px;height:9px;border-radius:2px;background:#e0a92e;"></span>ปานกลาง</span>
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:9px;height:9px;border-radius:2px;background:#2f9e6a;"></span>ปลอดภัย</span>
          </div>
        </div>
        <div style="display:flex;align-items:flex-end;gap:14px;height:170px;padding-top:10px;">
          ${chart.map(d=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%;justify-content:flex-end;">
            <div style="width:100%;max-width:34px;display:flex;flex-direction:column;border-radius:5px;overflow:hidden;">
              <div style="height:${d.high}px;background:#d64545;"></div>
              <div style="height:${d.mid}px;background:#e0a92e;"></div>
              <div style="height:${d.safe}px;background:#2f9e6a;"></div>
            </div>
            <div style="font-size:10.5px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;">${d.day}</div>
          </div>`).join('')}
        </div>
      </div>
      <div style="background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:20px;">
        <div style="font-size:14px;font-weight:600;color:#16241d;margin-bottom:2px;">หมวดสินค้าที่พบบ่อย</div>
        <div style="font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;margin-bottom:16px;">Top flagged categories</div>
        <div style="display:flex;flex-direction:column;gap:14px;">
          ${categories.map(c=>`<div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;">
              <span style="color:#39473f;font-weight:500;">${c.name}</span>
              <span style="color:#7d8e86;font-family:'IBM Plex Mono',monospace;">${c.count}</span>
            </div>
            <div style="height:7px;background:#eef2f0;border-radius:4px;overflow:hidden;">
              <div style="width:${c.pct}%;height:100%;background:${c.color};border-radius:4px;animation:barGrow .8s ease;"></div>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="hscroll" style="background:#fff;border:1px solid #e2e9e5;border-radius:13px;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #eef2f0;">
        <div style="font-size:14px;font-weight:600;color:#16241d;">เคสล่าสุด · Recent cases</div>
        <button class="h-soft" onclick="app.go('cases')" style="background:none;border:1px solid #d8e2dc;border-radius:8px;padding:7px 13px;font-family:inherit;font-size:12px;color:#157347;font-weight:600;cursor:pointer;">ดูทั้งหมด →</button>
      </div>
      ${recent.map(c=>`<div class="h-soft2 wide-row" onclick="app.openCase('${c.id}')" style="display:grid;grid-template-columns:90px 1fr 130px 110px 90px;gap:14px;align-items:center;padding:13px 20px;border-bottom:1px solid #f3f6f4;cursor:pointer;">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#7d8e86;">${c.id}</span>
        <div style="min-width:0;">
          <div style="font-size:13.5px;font-weight:500;color:#16241d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.title)}</div>
          <div style="font-size:11px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.source}</div>
        </div>
        <span style="${riskBadge(c.risk)}">${c.riskTh}</span>
        <span style="font-size:12px;color:#7d8e86;">${c.date}</span>
        <span style="${statusBadge(c.status)}">${c.statusTh}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

function uploadHTML(){
  const modeDefs = [
    { key:'link',  th:'ลิงก์ URL',   en:'Website link', icon:'🔗' },
    { key:'file',  th:'อัปโหลดไฟล์', en:'PDF / Doc',    icon:'📄' },
    { key:'image', th:'รูปภาพ',       en:'Image / Ad',   icon:'🖼' },
  ];
  const modeBtn = m => 'display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 10px;border-radius:11px;cursor:pointer;font-family:inherit;transition:all .15s;' +
    (state.inputMode===m.key ? 'background:#e9f4ee;border:1.5px solid #2f9e6a;color:#157347;' : 'background:#f7faf8;border:1.5px solid #e2e9e5;color:#5a6b63;');
  const examples = ['slimx-pro-detox','glowmax.th/serum','fxmaster-course'];
  const scopeActive = 'display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:500;padding:6px 12px;border-radius:8px;background:#e9f4ee;color:#2c7a4f;border:1px solid #c9e6d4;';
  const scopeOff = 'display:inline-flex;align-items:center;font-size:11.5px;font-weight:500;padding:6px 12px;border-radius:8px;background:#f1f5f3;color:#9aa8a1;border:1px dashed #d8e2dc;cursor:pointer;';
  const scopeTags = [
    { label:'✓ ข้อความโฆษณา', on:true },{ label:'✓ รูปภาพ / ฉลาก', on:true },
    { label:'✓ สรรพคุณเกินจริง', on:true },{ label:'✓ มาตรากฎหมาย', on:true },
    { label:'+ คอมเมนต์ผู้ใช้', on:false },
  ];
  const isImage = state.inputMode === 'image';
  const isDrop = state.inputMode === 'file' || state.inputMode === 'image';
  return `<div style="max-width:820px;margin:0 auto;animation:fadeUp .4s ease;">
    <div style="background:#fff;border:1px solid #e2e9e5;border-radius:14px;padding:28px;">
      <div style="font-size:17px;font-weight:600;color:#16241d;margin-bottom:4px;">ส่งข้อมูลเพื่อตรวจสอบ</div>
      <div style="font-size:12.5px;color:#7d8e86;margin-bottom:22px;">เลือกแหล่งข้อมูล — ระบบ AI จะวิเคราะห์เนื้อหาโฆษณาเทียบกับกฎหมายและประกาศที่เกี่ยวข้อง</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px;">
        ${modeDefs.map(m=>`<button onclick="app.setMode('${m.key}')" style="${modeBtn(m)}">
          <span style="font-size:22px;line-height:1;">${m.icon}</span>
          <span style="font-size:13.5px;font-weight:600;">${m.th}</span>
          <span style="font-size:10.5px;opacity:.7;font-family:'IBM Plex Mono',monospace;">${m.en}</span>
        </button>`).join('')}
      </div>
      ${state.inputMode==='link' ? `<div style="margin-bottom:18px;">
        <label style="font-size:12px;font-weight:600;color:#39473f;display:block;margin-bottom:8px;">URL ของโฆษณา / โพสต์ / หน้าเว็บ</label>
        <div class="fw" style="display:flex;align-items:center;gap:10px;background:#f7faf8;border:1.5px solid #d8e2dc;border-radius:10px;padding:3px 4px 3px 14px;">
          <span style="color:#9aa8a1;font-family:'IBM Plex Mono',monospace;font-size:13px;">https://</span>
          <input value="${esc(state.linkValue)}" oninput="state.linkValue=this.value" placeholder="shopee.co.th/slimx-pro-detox" style="flex:1;border:none;background:none;outline:none;font-family:'IBM Plex Mono',monospace;font-size:13px;padding:11px 0;color:#16241d;" />
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <span style="font-size:11px;color:#9aa8a1;align-self:center;">ตัวอย่าง:</span>
          ${examples.map(ex=>`<button class="h-chip" onclick="app.setExample('${ex}')" style="background:#eef4f1;border:1px solid #dce6e0;border-radius:7px;padding:5px 11px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#3d6b54;cursor:pointer;">${ex}</button>`).join('')}
        </div>
      </div>` : ''}
      ${isDrop ? `<div class="h-drop" style="border:2px dashed #cdded4;border-radius:12px;background:#f7faf8;padding:42px 24px;text-align:center;margin-bottom:18px;cursor:pointer;">
        <div style="width:58px;height:58px;border-radius:14px;background:#e6f1ea;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 14px;">${isImage?'🖼':'📄'}</div>
        <div style="font-size:14px;font-weight:600;color:#16241d;margin-bottom:5px;">${isImage?'ลากรูปโฆษณามาวาง หรือเลือกไฟล์':'ลากไฟล์เอกสารมาวาง หรือเลือกไฟล์'}</div>
        <div style="font-size:12px;color:#7d8e86;margin-bottom:16px;">${isImage?'รองรับ JPG, PNG, WEBP · สูงสุด 10 MB':'รองรับ TXT, MD, CSV (อ่านข้อความ) · PDF/DOCX แนะนำวางข้อความในโหมดลิงก์'}</div>
        <input type="file" id="realFileInput" accept="${isImage?'image/*':'.txt,.md,.csv,.json,text/*'}" style="display:none" onchange="app.onFileChosen(this)" />
        <button onclick="app.pickFile()" style="background:#fff;border:1px solid #d8e2dc;border-radius:9px;padding:9px 18px;font-family:inherit;font-size:12.5px;font-weight:600;color:#157347;cursor:pointer;">เลือกไฟล์…</button>
      </div>
      ${state.fileLoaded ? `<div style="display:flex;align-items:center;gap:12px;background:#eef4f1;border:1px solid #d8e6de;border-radius:10px;padding:12px 14px;margin-bottom:18px;">
        <div style="width:40px;height:40px;border-radius:8px;background:#2f9e6a;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;">${isImage?'🖼':'📄'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;color:#16241d;">${esc(state.fileName || (isImage?'slimx_ad_banner.jpg':'document.txt'))}</div>
          <div style="font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;">${state.fileMetaReal || (isImage?'1280×720 · 248 KB':'TXT · 12 KB')}</div>
        </div>
        <span style="color:#2c7a4f;font-size:18px;">✓</span>
      </div>` : ''}` : ''}
      <div style="border-top:1px solid #eef2f0;padding-top:18px;margin-top:4px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;">
          <div style="font-size:12px;font-weight:600;color:#39473f;">ขอบเขตการตรวจ · Detection scope</div>
          <button class="h-chip" onclick="app.openAddContext()" style="display:flex;align-items:center;gap:6px;background:#eef4f1;border:1px solid #cfe0d6;border-radius:8px;padding:6px 12px;font-family:inherit;font-size:11.5px;font-weight:600;color:#157347;cursor:pointer;">✦ เพิ่มบริบทให้ AI</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:9px;">
          ${scopeTags.map(t=>`<span style="${t.on?scopeActive:scopeOff}">${t.label}</span>`).join('')}
        </div>
      </div>
      <button class="h-dark" onclick="app.analyze()" style="display:flex;align-items:center;justify-content:center;gap:9px;width:100%;margin-top:22px;background:#157347;color:#fff;border:none;border-radius:11px;padding:15px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 3px 10px rgba(21,115,71,.3);">
        <span style="font-size:17px;">◎</span> วิเคราะห์ด้วย AI · Run AI Analysis
      </button>
    </div>
  </div>`;
}

function analyzingOverlayHTML(){
  if(!state.analyzing) return '';
  const stepDefs = [
    { label:'ดึงเนื้อหาและข้อความจากแหล่งข้อมูล', th:30 },
    { label:'วิเคราะห์ภาพ / ฉลาก ด้วย Vision AI', th:55 },
    { label:'ตรวจสรรพคุณเทียบฐานข้อมูลกฎหมาย', th:80 },
    { label:'สรุปความเสี่ยงและจัดทำรายงาน', th:100 },
  ];
  const p = state.progress;
  return `<div style="position:fixed;inset:0;background:rgba(10,30,22,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:50;">
    <div style="background:#fff;border-radius:16px;padding:34px;width:440px;box-shadow:0 24px 60px rgba(0,0,0,.3);animation:fadeUp .3s ease;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px;">
        <div style="width:46px;height:46px;border-radius:11px;border:3px solid #e6f1ea;border-top-color:#2f9e6a;animation:spin 1s linear infinite;"></div>
        <div>
          <div style="font-size:16px;font-weight:700;color:#16241d;">กำลังวิเคราะห์ด้วย AI</div>
          <div style="font-size:12px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;">AdGuard Engine v3.2 · GPT-vision</div>
        </div>
      </div>
      <div style="height:8px;background:#eef2f0;border-radius:5px;overflow:hidden;margin-bottom:8px;">
        <div style="width:${p}%;height:100%;background:linear-gradient(90deg,#2f9e6a,#157347);border-radius:5px;transition:width .3s ease;"></div>
      </div>
      <div style="text-align:right;font-size:11px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;margin-bottom:18px;">${p}%</div>
      <div style="display:flex;flex-direction:column;gap:9px;">
        ${stepDefs.map(st=>{
          const done = p >= st.th;
          const active = p >= (st.th-25) && !done;
          const dim = done?'color:#16241d;':(active?'color:#39473f;':'color:#c2ccc6;');
          const dotStyle = 'width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;' +
            (done?'background:#2f9e6a;color:#fff;':(active?'background:#fdf4e3;color:#a9760e;animation:pulse 1s infinite;':'background:#f1f5f3;color:#c2ccc6;'));
          return `<div style="display:flex;align-items:center;gap:10px;font-size:12.5px;${dim}"><span style="${dotStyle}">${done?'✓':'○'}</span><span>${st.label}</span></div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function resultHTML(){
  const ai = state.viewAnalysis || null;
  const dimColor = pct => pct>=66 ? '#d64545' : (pct>=33 ? '#e0a92e' : '#2c7a4f');

  const base = allCases.find(c=>c.id===state.selectedId) || allCases[0];
  const rc = ai
    ? { id: state.selectedId || 'AI-LIVE', risk: ai.riskLevel, riskTh: ai.riskTh, title: ai.title, source: ai.source, channel: ai.channel, score: ai.riskScore, date:'วันนี้' }
    : base;
  const catVal       = ai ? ai.category : 'อาหารเสริม';
  const confidence   = ai ? ai.confidence : 96;
  const verdictTitle = ai ? ai.verdictTitle : 'พบการโฆษณาเกินจริง — เข้าข่ายความผิดชัดเจน';
  const verdictSummary = ai ? ai.verdictSummary : 'AI ตรวจพบข้อความโฆษณาที่อ้างสรรพคุณเกินจริง <b>4 รายการ</b> โดย 3 รายการเข้าข่ายความผิดตาม พ.ร.บ.อาหาร พ.ศ. 2522 และการแอบอ้างเครื่องหมาย อย. ควรพิจารณาส่งต่อให้สำนักงานคณะกรรมการอาหารและยาดำเนินการ';
  const ringColor    = dimColor(rc.score);
  const scoreRing = 'position:absolute;inset:0;border-radius:50%;background:conic-gradient('+ringColor+' 0 '+rc.score+'%, #f0e3e1 '+rc.score+'% 100%);';

  const mark = (color,bg) => 'background:'+bg+';color:'+color+';border-radius:4px;padding:1px 3px;font-weight:600;box-decoration-break:clone;-webkit-box-decoration-break:clone;';
  const seg = (t,sup,sev) => {
    let style='color:#39473f;', supStyle='display:none;';
    if(sev==='high'){ style=mark('#9e2b1e','#fbd9d3'); supStyle="font-size:10px;color:#c0392b;font-weight:700;margin-left:1px;font-family:'IBM Plex Mono',monospace;"; }
    else if(sev==='medium'){ style=mark('#8a5d08','#fbeccb'); supStyle="font-size:10px;color:#a9760e;font-weight:700;margin-left:1px;font-family:'IBM Plex Mono',monospace;"; }
    return `<span style="${style}">${t}<sup style="${supStyle}">${sup||''}</sup></span>`;
  };
  const segments = ai
    ? `<span style="color:#39473f;white-space:pre-wrap;">${esc(ai.extractedText)}</span>`
    : [
    seg('🔥 SlimX Pro Detox สุดยอดนวัตกรรมจากธรรมชาติ ','',null),
    seg('ลดน้ำหนัก 10 กก. ใน 7 วัน','1','high'),
    seg(' รับรองเห็นผลจริง สูตรเข้มข้นช่วย ','',null),
    seg('รักษาเบาหวาน ความดัน ไขมันในเลือดให้หายขาด','2','high'),
    seg(' ดื่มแล้ว ','',null),
    seg('เห็นผลทันที ไม่ต้องอดอาหาร ไม่ต้องออกกำลังกาย','3','medium'),
    seg(' ผ่านการ ','',null),
    seg('รับรองจาก อย. ปลอดภัย 100% ไร้ผลข้างเคียง','4','high'),
    seg(' สั่งซื้อด่วน! ของมีจำนวนจำกัด 🛒','',null),
  ].join('');
  const pinAt = (n,top,left,sev) => `<div style="position:absolute;top:${top};left:${left};width:24px;height:24px;border-radius:50%;background:${sev==='medium'?'#e0a92e':'#d64545'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;font-family:'IBM Plex Mono',monospace;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff;">${n}</div>`;
  const pins = ai ? '' : [pinAt(1,'30%','22%','high'),pinAt(2,'54%','60%','high'),pinAt(3,'70%','35%','medium'),pinAt(4,'40%','78%','high')].join('');
  const riskDims = ai
    ? ai.riskDims.map(r=>({ name:r.name, pct:r.pct, label:r.label, color:dimColor(r.pct) }))
    : [
    { name:'อ้างสรรพคุณเกินจริง', pct:95, label:'95', color:'#d64545' },
    { name:'อ้างรักษาโรค (ต้องห้าม)', pct:90, label:'90', color:'#d64545' },
    { name:'แอบอ้างการรับรอง อย.', pct:88, label:'88', color:'#d64545' },
    { name:'ความน่าเชื่อถือหลักฐาน', pct:24, label:'ต่ำ', color:'#e0a92e' },
  ];
  const findings = ai ? ai.findings : [
    'อ้างผลลัพธ์เชิงปริมาณที่เป็นไปไม่ได้ทางการแพทย์ (ลด 10 กก./7 วัน)',
    'ผลิตภัณฑ์อาหารอ้างสรรพคุณรักษาโรคเฉพาะ ซึ่งกฎหมายห้ามเด็ดขาด',
    'แอบอ้างเครื่องหมาย อย. โดยเลขที่ อย. บนฉลากไม่ตรงกับฐานข้อมูล',
  ];
  const sevHigh = 'display:inline-flex;align-items:center;font-size:11px;font-weight:700;padding:3px 11px;border-radius:20px;background:#fdecea;color:#c0392b;border:1px solid #f5c6bf;';
  const sevMed = 'display:inline-flex;align-items:center;font-size:11px;font-weight:700;padding:3px 11px;border-radius:20px;background:#fdf4e3;color:#a9760e;border:1px solid #f3e0b5;';
  const numHigh = "width:34px;height:34px;border-radius:9px;background:#fdecea;color:#c0392b;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;font-family:'IBM Plex Mono',monospace;";
  const numMed = "width:34px;height:34px;border-radius:9px;background:#fdf4e3;color:#a9760e;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;font-family:'IBM Plex Mono',monospace;";
  const violations = (ai
    ? ai.violations.map((v,i)=>({ n:i+1, sev:v.severity, tag:v.tag, claim:v.claim, reason:v.reason, advice:v.advice, laws:v.laws }))
    : [
    { n:1, sev:'high', tag:'การโฆษณาคุณประโยชน์เกินจริง', claim:'ลดน้ำหนัก 10 กก. ใน 7 วัน',
      reason:'อ้างผลการลดน้ำหนักเชิงปริมาณที่เกินจริงและไม่มีหลักฐานทางวิทยาศาสตร์รองรับ เข้าข่ายโฆษณาหลอกลวงผู้บริโภค',
      advice:'ระงับการเผยแพร่ทันที และเรียกหลักฐานอ้างอิงผลการทดสอบจากผู้ประกอบการ',
      laws:['พ.ร.บ.อาหาร 2522 ม.40','พ.ร.บ.คุ้มครองผู้บริโภค ม.22'] },
    { n:2, sev:'high', tag:'อาหารอ้างรักษาโรค (ต้องห้าม)', claim:'รักษาเบาหวาน ความดัน ไขมันในเลือดให้หายขาด',
      reason:'ผลิตภัณฑ์เสริมอาหารไม่สามารถอ้างสรรพคุณบำบัด บรรเทา หรือรักษาโรคได้ ถือเป็นข้อความต้องห้ามตามประกาศกระทรวงสาธารณสุข',
      advice:'ส่งเรื่องให้ อย. ออกคำสั่งระงับโฆษณาและพิจารณาโทษตามกฎหมาย',
      laws:['พ.ร.บ.อาหาร 2522 ม.41','ประกาศ สธ. (ฉบับที่ 293)'] },
    { n:3, sev:'medium', tag:'ข้อความชวนเชื่อเกินจริง', claim:'เห็นผลทันที ไม่ต้องอดอาหาร ไม่ต้องออกกำลังกาย',
      reason:'สร้างความเข้าใจผิดต่อผู้บริโภคเรื่องประสิทธิผลและวิธีใช้ ขัดกับหลักโภชนาการพื้นฐาน',
      advice:'ปรับแก้ข้อความให้มีคำเตือนและไม่รับประกันผลลัพธ์',
      laws:['พ.ร.บ.คุ้มครองผู้บริโภค ม.22'] },
    { n:4, sev:'high', tag:'แอบอ้างการรับรองหน่วยงาน', claim:'รับรองจาก อย. ปลอดภัย 100% ไร้ผลข้างเคียง',
      reason:'แอบอ้างเครื่องหมาย อย. และเลขสารบบอาหารที่ตรวจสอบแล้วไม่ตรงกับฐานข้อมูล ถือเป็นการให้ข้อมูลเท็จ',
      advice:'แจ้งความดำเนินคดีฐานปลอมแปลง/แอบอ้างเครื่องหมายราชการ และส่งต่อ อย.',
      laws:['พ.ร.บ.อาหาร 2522 ม.40','ประมวลกฎหมายอาญา ม.272'] },
  ]);
  return `<div style="max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;">
    <div style="background:#fff;border:1px solid #e2e9e5;border-radius:14px;padding:20px 22px;margin-bottom:16px;display:flex;align-items:center;gap:22px;">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:9px;margin-bottom:7px;">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:#7d8e86;background:#f1f5f3;padding:2px 9px;border-radius:6px;">${rc.id}</span>
          <span style="${riskBadge(rc.risk)}">⚠ ${rc.riskTh}</span>
          <span style="font-size:11px;color:#9aa8a1;">· วิเคราะห์เมื่อ ${rc.date} 2026 น.</span>
        </div>
        <div style="font-size:19px;font-weight:700;color:#16241d;margin-bottom:6px;">${esc(rc.title)}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:#3d6b54;">🔗 ${rc.source}</span>
          <span style="font-size:11px;color:#7d8e86;background:#eef4f1;border:1px solid #dce6e0;padding:2px 9px;border-radius:6px;">${esc(rc.channel)}</span>
          <span style="font-size:11px;color:#7d8e86;background:#eef4f1;border:1px solid #dce6e0;padding:2px 9px;border-radius:6px;">หมวด: ${esc(catVal)}</span>
        </div>
      </div>
      <div style="position:relative;width:104px;height:104px;flex-shrink:0;">
        <div style="${scoreRing}"></div>
        <div style="position:absolute;inset:9px;background:#fff;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="font-size:30px;font-weight:700;color:#c0392b;font-family:'IBM Plex Mono',monospace;line-height:1;">${rc.score}</div>
          <div style="font-size:9px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;letter-spacing:.5px;">RISK SCORE</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0;">
        <button class="h-dark" onclick="app.go('handoff')" style="display:flex;align-items:center;justify-content:center;gap:7px;background:#157347;color:#fff;border:none;border-radius:9px;padding:11px 18px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;box-shadow:0 2px 6px rgba(21,115,71,.3);">➤ ส่งต่อหน่วยงาน</button>
        <div style="display:flex;gap:8px;">
          <button class="h-soft" style="flex:1;background:#fff;border:1px solid #d8e2dc;border-radius:9px;padding:9px 12px;font-family:inherit;font-size:12px;font-weight:600;color:#39473f;cursor:pointer;">💾 บันทึก</button>
          <button class="h-soft" style="flex:1;background:#fff;border:1px solid #d8e2dc;border-radius:9px;padding:9px 12px;font-family:inherit;font-size:12px;font-weight:600;color:#39473f;cursor:pointer;">⤓ PDF</button>
        </div>
      </div>
    </div>
    <div style="background:linear-gradient(100deg,#fdecea,#fdf4f2);border:1px solid #f5c6bf;border-radius:13px;padding:18px 22px;margin-bottom:16px;display:flex;align-items:flex-start;gap:15px;">
      <div style="width:40px;height:40px;border-radius:10px;background:#c0392b;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;flex-shrink:0;">⚠</div>
      <div style="flex:1;">
        <div style="font-size:15px;font-weight:700;color:#9e2b1e;margin-bottom:4px;">${esc(verdictTitle)}</div>
        <div style="font-size:13px;color:#7a3329;line-height:1.6;">${ai ? esc(verdictSummary) : verdictSummary}</div>
      </div>
      <div style="text-align:center;flex-shrink:0;padding-left:12px;border-left:1px solid #f0cbc4;">
        <div style="font-size:12px;color:#9aa8a1;">ความเชื่อมั่น AI</div>
        <div style="font-size:24px;font-weight:700;color:#16241d;font-family:'IBM Plex Mono',monospace;">${confidence}%</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1.45fr 1fr;gap:16px;margin-bottom:16px;">
      <div style="background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:20px;">
        <div style="font-size:13.5px;font-weight:600;color:#16241d;margin-bottom:3px;">เนื้อหาที่ตรวจสอบ · Analyzed content</div>
        <div style="font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;margin-bottom:14px;">Vision AI · OCR + claim extraction</div>
        <div style="position:relative;border-radius:11px;overflow:hidden;border:1px solid #e2e9e5;background-image:repeating-linear-gradient(135deg,#eef2f0 0 12px,#e7ede9 12px 24px);height:200px;margin-bottom:16px;">
          <div style="position:absolute;top:10px;left:12px;font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#8a988f;background:rgba(255,255,255,.75);padding:3px 8px;border-radius:5px;">${ai ? esc(state.fileName || rc.source || 'analyzed source') : 'AD BANNER · slimx_ad.jpg · 1280×720'}</div>
          ${pins}
          <div style="position:absolute;bottom:10px;right:12px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#8a988f;background:rgba(255,255,255,.75);padding:3px 8px;border-radius:5px;">📌 จุดที่ตรวจพบ</div>
        </div>
        <div style="font-size:11px;color:#7d8e86;font-weight:600;margin-bottom:8px;">ข้อความที่สกัดได้ · Extracted copy</div>
        <div style="font-size:14px;line-height:2.1;color:#39473f;background:#f9fbfa;border:1px solid #eef2f0;border-radius:10px;padding:16px;">${segments}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:20px;">
          <div style="font-size:13.5px;font-weight:600;color:#16241d;margin-bottom:14px;">มิติความเสี่ยง · Risk breakdown</div>
          <div style="display:flex;flex-direction:column;gap:13px;">
            ${riskDims.map(r=>`<div>
              <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;">
                <span style="color:#39473f;">${r.name}</span>
                <span style="color:${r.color};font-weight:600;font-family:'IBM Plex Mono',monospace;">${r.label}</span>
              </div>
              <div style="height:7px;background:#eef2f0;border-radius:4px;overflow:hidden;">
                <div style="width:${r.pct}%;height:100%;background:${r.color};border-radius:4px;animation:barGrow .7s ease;"></div>
              </div>
            </div>`).join('')}
          </div>
        </div>
        <div style="background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:20px;flex:1;">
          <div style="font-size:13.5px;font-weight:600;color:#16241d;margin-bottom:13px;">สรุปประเด็น · Key findings</div>
          <div style="display:flex;flex-direction:column;gap:11px;">
            ${findings.map(f=>`<div style="display:flex;gap:10px;align-items:flex-start;">
              <span style="color:#c0392b;font-size:14px;flex-shrink:0;line-height:1.5;">●</span>
              <span style="font-size:12.5px;color:#39473f;line-height:1.55;">${f}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
    <div style="background:#fff;border:1px solid #e2e9e5;border-radius:13px;overflow:hidden;">
      <div style="padding:18px 22px;border-bottom:1px solid #eef2f0;display:flex;align-items:center;gap:10px;">
        <span style="font-size:15px;font-weight:600;color:#16241d;">รายการความผิดที่ตรวจพบ</span>
        <span style="background:#fdecea;color:#c0392b;font-size:12px;font-weight:600;padding:2px 10px;border-radius:20px;">${violations.length} รายการ</span>
      </div>
      ${violations.map(v=>`<div style="padding:20px 22px;border-bottom:1px solid #f3f6f4;display:grid;grid-template-columns:34px 1fr;gap:16px;">
        <div style="${v.sev==='high'?numHigh:numMed}">${v.n}</div>
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
            <span style="${v.sev==='high'?sevHigh:sevMed}">${v.sev==='high'?'ความผิดร้ายแรง · HIGH':'ควรแก้ไข · MEDIUM'}</span>
            <span style="font-size:12px;color:#9aa8a1;">${v.tag}</span>
          </div>
          <div style="background:#fdf4f2;border-left:3px solid #d64545;border-radius:0 8px 8px 0;padding:11px 14px;margin-bottom:13px;">
            <div style="font-size:10.5px;color:#a9760e;font-weight:600;margin-bottom:3px;">ข้อความที่พบ</div>
            <div style="font-size:14px;color:#16241d;font-weight:600;font-style:italic;">“${v.claim}”</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div>
              <div style="font-size:11px;color:#7d8e86;font-weight:600;margin-bottom:5px;">⚖ เหตุผล / ความผิด</div>
              <div style="font-size:13px;color:#39473f;line-height:1.6;">${v.reason}</div>
            </div>
            <div>
              <div style="font-size:11px;color:#7d8e86;font-weight:600;margin-bottom:5px;">💡 คำแนะนำ</div>
              <div style="font-size:13px;color:#39473f;line-height:1.6;">${v.advice}</div>
            </div>
          </div>
          <div style="margin-top:13px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <span style="font-size:11px;color:#7d8e86;font-weight:600;">มาตราที่เกี่ยวข้อง:</span>
            ${v.laws.map(law=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:#2c5a8a;background:#e7f0fb;border:1px solid #cfe0f5;padding:4px 11px;border-radius:7px;">§ ${law}</span>`).join('')}
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

function casesHTML(){
  const cc = state.caseCounts || {};
  const filterDefs = [
    { key:'all', label:'ทั้งหมด', count:cc.all||0 },{ key:'pending', label:'รอตรวจสอบ', count:cc.pending||0 },
    { key:'review', label:'กำลังตรวจ', count:cc.review||0 },{ key:'referred', label:'ส่งต่อแล้ว', count:cc.referred||0 },
    { key:'cleared', label:'ปิดเคส', count:cc.cleared||0 },
  ];
  const typeDotColor = { link:'#2563a8', file:'#6b39b8', image:'#2f9e6a' };
  const filtered = state.caseFilter==='all' ? allCases : allCases.filter(c=>c.status===state.caseFilter);
  const cols = '104px 1fr 110px 90px 110px 70px 110px';
  return `<div style="max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
      ${filterDefs.map(f=>{
        const on = state.caseFilter===f.key;
        const btn = 'display:flex;align-items:center;gap:8px;border:1px solid '+(on?'#157347':'#d8e2dc')+';background:'+(on?'#157347':'#fff')+';color:'+(on?'#fff':'#39473f')+';border-radius:9px;padding:8px 14px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;';
        const cs = "font-family:'IBM Plex Mono',monospace;font-size:11px;padding:1px 7px;border-radius:9px;background:"+(on?'rgba(255,255,255,.22)':'#eef2f0')+";color:"+(on?'#fff':'#7d8e86')+";";
        return `<button onclick="app.setFilter('${f.key}')" style="${btn}">${f.label} <span style="${cs}">${f.count}</span></button>`;
      }).join('')}
      <div style="flex:1;"></div>
      <button class="h-soft" style="display:flex;align-items:center;gap:7px;background:#fff;border:1px solid #d8e2dc;border-radius:9px;padding:9px 14px;font-family:inherit;font-size:12.5px;font-weight:600;color:#39473f;cursor:pointer;">⤓ Export CSV</button>
    </div>
    <div class="hscroll" style="background:#fff;border:1px solid #e2e9e5;border-radius:13px;overflow:hidden;">
      <div class="wide-row" style="display:grid;grid-template-columns:${cols};gap:12px;padding:13px 20px;background:#f7faf8;border-bottom:1px solid #eef2f0;font-size:11px;font-weight:600;color:#7d8e86;letter-spacing:.3px;">
        <span>CASE ID</span><span>รายการโฆษณา</span><span>ช่องทาง</span><span>ระดับเสี่ยง</span><span>หน่วยงาน</span><span style="text-align:center;">ผิด</span><span>สถานะ</span>
      </div>
      ${filtered.map(c=>{
        const vcolor = c.violations>=3?'#c0392b':(c.violations>=1?'#a9760e':'#9aa8a1');
        return `<div class="h-soft2 wide-row" onclick="app.openCase('${c.id}')" style="display:grid;grid-template-columns:${cols};gap:12px;align-items:center;padding:14px 20px;border-bottom:1px solid #f3f6f4;cursor:pointer;">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#7d8e86;">${c.id}</span>
          <div style="min-width:0;">
            <div style="font-size:13px;font-weight:500;color:#16241d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.title)}</div>
            <div style="font-size:10.5px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.source}</div>
          </div>
          <span style="font-size:12px;color:#5a6b63;display:flex;align-items:center;gap:6px;"><span style="width:7px;height:7px;border-radius:50%;background:${typeDotColor[c.type]||'#9aa8a1'};display:inline-block;"></span>${c.channel}</span>
          <span style="${riskBadge(c.risk)}">${c.riskTh}</span>
          <span style="font-size:12px;color:#5a6b63;">${c.agency}</span>
          <span style="text-align:center;font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:${vcolor};">${c.violations}</span>
          <span style="${statusBadge(c.status)}">${c.statusTh}</span>
        </div>`;
      }).join('')}
      <div style="padding:14px 20px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#7d8e86;">
        <span>แสดง ${filtered.length} จาก ${(state.caseCounts && state.caseCounts.all) || filtered.length} เคส</span>
        <div style="display:flex;gap:6px;">
          <button style="width:32px;height:32px;border:1px solid #d8e2dc;background:#fff;border-radius:7px;color:#9aa8a1;cursor:pointer;">‹</button>
          <button style="width:32px;height:32px;border:1px solid #157347;background:#157347;border-radius:7px;color:#fff;cursor:pointer;font-weight:600;">1</button>
          <button style="width:32px;height:32px;border:1px solid #d8e2dc;background:#fff;border-radius:7px;color:#39473f;cursor:pointer;">2</button>
          <button style="width:32px;height:32px;border:1px solid #d8e2dc;background:#fff;border-radius:7px;color:#39473f;cursor:pointer;">3</button>
          <button style="width:32px;height:32px;border:1px solid #d8e2dc;background:#fff;border-radius:7px;color:#39473f;cursor:pointer;">›</button>
        </div>
      </div>
    </div>
  </div>`;
}

function handoffHTML(){
  if(state.handoffSent){
    return `<div style="max-width:880px;margin:0 auto;animation:fadeUp .4s ease;">
      <div style="background:#fff;border:1px solid #e2e9e5;border-radius:14px;padding:48px;text-align:center;">
        <div style="width:72px;height:72px;border-radius:50%;background:#e9f4ee;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 20px;color:#157347;">✓</div>
        <div style="font-size:20px;font-weight:700;color:#16241d;margin-bottom:8px;">ส่งต่อเรื่องเรียบร้อยแล้ว</div>
        <div style="font-size:13.5px;color:#7d8e86;line-height:1.7;max-width:480px;margin:0 auto 8px;">ระบบได้บันทึกการส่งต่อเคส <b style="font-family:'IBM Plex Mono',monospace;color:#16241d;">AD-2026-0481</b> ไปยังหน่วยงานที่เลือก พร้อมแนบรายงานการวิเคราะห์และหลักฐานทั้งหมด หน่วยงานจะได้รับการแจ้งเตือนผ่านระบบเชื่อมต่อภายใน 1 ชั่วโมง</div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:#9aa8a1;margin-bottom:24px;">เลขอ้างอิงการส่งต่อ · REF-2026-0481-A</div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button onclick="app.go('cases')" style="background:#157347;color:#fff;border:none;border-radius:9px;padding:11px 22px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">กลับสู่ฐานข้อมูลเคส</button>
          <button onclick="app.resetHandoff()" style="background:#fff;border:1px solid #d8e2dc;border-radius:9px;padding:11px 22px;font-family:inherit;font-size:13px;font-weight:600;color:#39473f;cursor:pointer;">ส่งต่ออีกหน่วยงาน</button>
        </div>
      </div>
    </div>`;
  }
  const agencyDefs = [
    { key:'fda', abbr:'อย.', name:'สำนักงานคณะกรรมการอาหารและยา', scope:'อาหาร · ยา · เครื่องสำอาง · เครื่องมือแพทย์' },
    { key:'ocpb', abbr:'สคบ.', name:'สำนักงานคุ้มครองผู้บริโภค', scope:'โฆษณาหลอกลวง · สัญญาไม่เป็นธรรม' },
    { key:'nbtc', abbr:'กสทช.', name:'สำนักงาน กสทช.', scope:'โทรคมนาคม · สื่อกระจายเสียง' },
    { key:'dsi', abbr:'DSI', name:'กรมสอบสวนคดีพิเศษ / ตำรวจ', scope:'คดีฉ้อโกง · อาชญากรรมทางเทคโนโลยี' },
    { key:'custom', abbr:'+', name:'กำหนดหน่วยงานเอง', scope:'ระบุหน่วยงานปลายทางอื่น ๆ' },
  ];
  const attachments = [
    'รายงานการวิเคราะห์ฉบับเต็ม (PDF) · AD-2026-0481',
    'ภาพหน้าจอโฆษณาต้นฉบับ + ภาพไฮไลต์จุดผิด',
    'ตารางมาตรากฎหมายที่เกี่ยวข้อง 4 รายการ',
  ];
  const nSel = state.handoffAgencies.length;
  const sendBtn = 'display:flex;align-items:center;justify-content:center;gap:8px;flex:1;border:none;border-radius:11px;padding:14px;font-family:inherit;font-size:14px;font-weight:600;cursor:'+(nSel>0?'pointer':'not-allowed')+';background:'+(nSel>0?'#157347':'#cdd8d2')+';color:#fff;'+(nSel>0?'box-shadow:0 3px 10px rgba(21,115,71,.3);':'');
  return `<div style="max-width:880px;margin:0 auto;animation:fadeUp .4s ease;">
    <div style="background:#0f3026;border-radius:13px;padding:18px 22px;margin-bottom:16px;display:flex;align-items:center;gap:16px;color:#fff;">
      <div style="width:46px;height:46px;border-radius:11px;background:#c0392b;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">⚠</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#7fae97;margin-bottom:3px;">AD-2026-0481 · เสี่ยงสูง · 4 ความผิด</div>
        <div style="font-size:15px;font-weight:600;">อาหารเสริมลดน้ำหนัก "SlimX Pro Detox"</div>
      </div>
      <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#7fae97;background:rgba(255,255,255,.08);padding:5px 11px;border-radius:7px;">RISK 92/100</span>
    </div>
    <div style="background:#fff;border:1px solid #e2e9e5;border-radius:14px;padding:26px;">
      <div style="font-size:16px;font-weight:600;color:#16241d;margin-bottom:4px;">เลือกหน่วยงานปลายทาง</div>
      <div style="font-size:12.5px;color:#7d8e86;margin-bottom:20px;">ระบบจะส่งรายงานการวิเคราะห์ หลักฐาน และมาตราที่เกี่ยวข้องผ่านช่องทางเชื่อมต่อระหว่างหน่วยงาน (e-Referral)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px;">
        ${agencyDefs.map(a=>{
          const on = state.handoffAgencies.includes(a.key);
          const btn = 'display:flex;align-items:center;gap:12px;border:1.5px solid '+(on?'#2f9e6a':'#e2e9e5')+';background:'+(on?'#f0f7f3':'#fff')+';border-radius:11px;padding:14px;font-family:inherit;cursor:pointer;text-align:left;transition:all .15s;';
          const ic = 'width:42px;height:42px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;background:'+(on?'#2f9e6a':'#eef4f1')+';color:'+(on?'#fff':'#3d6b54')+';';
          const ck = 'width:22px;height:22px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:'+(on?'#2f9e6a':'#f1f5f3')+';color:'+(on?'#fff':'transparent')+';border:1px solid '+(on?'#2f9e6a':'#e2e9e5')+';';
          return `<button onclick="app.toggleAgency('${a.key}')" style="${btn}">
            <div style="${ic}">${a.abbr}</div>
            <div style="flex:1;text-align:left;min-width:0;">
              <div style="font-size:13.5px;font-weight:600;color:#16241d;">${a.name}</div>
              <div style="font-size:11px;color:#7d8e86;line-height:1.4;">${a.scope}</div>
            </div>
            <span style="${ck}">✓</span>
          </button>`;
        }).join('')}
      </div>
      <div style="margin-bottom:20px;">
        <label style="font-size:12.5px;font-weight:600;color:#39473f;display:block;margin-bottom:8px;">ความเห็น / ข้อสั่งการเพิ่มเติม</label>
        <textarea oninput="state.handoffNote=this.value" placeholder="ระบุข้อสังเกตหรือข้อสั่งการถึงหน่วยงานปลายทาง…" style="width:100%;min-height:90px;border:1.5px solid #d8e2dc;border-radius:10px;padding:13px;font-family:inherit;font-size:13px;color:#16241d;resize:vertical;outline:none;line-height:1.6;">${esc(state.handoffNote)}</textarea>
      </div>
      <div style="background:#f7faf8;border:1px solid #eef2f0;border-radius:10px;padding:14px 16px;margin-bottom:22px;">
        <div style="font-size:12px;font-weight:600;color:#39473f;margin-bottom:10px;">📎 เอกสารแนบอัตโนมัติ</div>
        <div style="display:flex;flex-direction:column;gap:7px;">
          ${attachments.map(at=>`<div style="display:flex;align-items:center;gap:9px;font-size:12.5px;color:#5a6b63;"><span style="color:#2c7a4f;">✓</span>${at}</div>`).join('')}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <button onclick="app.send()" style="${sendBtn}">➤ ส่งต่อไปยัง ${nSel} หน่วยงาน</button>
        <button onclick="app.go('result')" style="background:none;border:none;font-family:inherit;font-size:13px;color:#7d8e86;cursor:pointer;text-decoration:underline;">← กลับไปดูผลวิเคราะห์</button>
      </div>
    </div>
  </div>`;
}

function contextHTML(){
  const items = state.contextItems;
  const activeCount = items.filter(c=>c.active).length;
  const ctxStats = [
    { value:String(items.length), label:'รายการบริบททั้งหมด' },
    { value:String(activeCount), label:'กำลังใช้งาน · active' },
    { value:String(items.filter(c=>c.type==='banned').length), label:'ชุดคำต้องห้าม' },
    { value:String(items.filter(c=>c.type==='law'||c.type==='doc').length), label:'อ้างอิงกฎหมาย' },
  ];
  return `<div style="max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;">
    <div style="background:linear-gradient(100deg,#0f3026,#16432f);border-radius:14px;padding:22px 24px;margin-bottom:18px;display:flex;align-items:center;gap:18px;color:#fff;">
      <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">✦</div>
      <div style="flex:1;">
        <div style="font-size:16px;font-weight:700;margin-bottom:4px;">ฐานความรู้และบริบทสำหรับ AI</div>
        <div style="font-size:12.5px;color:#bcd6c8;line-height:1.6;">เพิ่มกฎหมาย ประกาศ กฎเกณฑ์ภายใน หรือรายการคำต้องห้าม เพื่อให้ AI ใช้เป็นบริบทประกอบการวิเคราะห์โฆษณาในอนาคต — ยิ่งมีบริบทมาก ผลวิเคราะห์ยิ่งแม่นยำและอ้างอิงได้</div>
      </div>
      <button class="h-green" onclick="app.openAddContext()" style="display:flex;align-items:center;gap:8px;background:#2f9e6a;color:#fff;border:none;border-radius:10px;padding:12px 20px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.25);">＋ เพิ่มบริบท</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;">
      ${ctxStats.map(cs=>`<div style="background:#fff;border:1px solid #e2e9e5;border-radius:11px;padding:14px 16px;">
        <div style="font-size:24px;font-weight:700;color:#16241d;font-family:'IBM Plex Mono',monospace;line-height:1;">${cs.value}</div>
        <div style="font-size:11.5px;color:#7d8e86;margin-top:5px;">${cs.label}</div>
      </div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      ${items.map(c=>{
        const tp = ctxTypes[c.type] || ctxTypes.law;
        const ic = 'width:40px;height:40px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;background:'+tp.bg+';color:'+tp.color+';';
        const badge = 'display:inline-flex;align-items:center;font-size:10.5px;font-weight:600;padding:2px 9px;border-radius:6px;background:'+tp.bg+';color:'+tp.color+';border:1px solid '+tp.bd+';';
        const tog = 'position:relative;width:40px;height:23px;border-radius:13px;border:none;cursor:pointer;flex-shrink:0;transition:background .2s;background:'+(c.active?'#2f9e6a':'#cdd8d2')+';';
        const knob = 'position:absolute;top:3px;left:'+(c.active?'20px':'3px')+';width:17px;height:17px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 2px rgba(0,0,0,.2);';
        const stStyle = 'font-size:11px;font-weight:600;color:'+(c.active?'#2c7a4f':'#9aa8a1')+';';
        return `<div style="background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:18px;display:flex;flex-direction:column;gap:11px;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="${ic}">${tp.icon}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;"><span style="${badge}">${tp.label}</span></div>
              <div style="font-size:14px;font-weight:600;color:#16241d;line-height:1.35;">${esc(c.title)}</div>
            </div>
            <button onclick="app.toggleContext(${c.id})" style="${tog}"><span style="${knob}"></span></button>
          </div>
          <div style="font-size:12.5px;color:#5a6b63;line-height:1.6;">${esc(c.body)}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f3f6f4;padding-top:10px;margin-top:auto;">
            <span style="font-size:11px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;">${c.meta}</span>
            <span style="${stStyle}">${c.active?'● ใช้งานอยู่':'○ ปิดใช้งาน'}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function addContextModalHTML(){
  if(!state.showAddContext) return '';
  const canSave = state.draftTitle.trim().length > 0;
  const saveStyle = 'flex:1;border:none;border-radius:10px;padding:13px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:'+(canSave?'pointer':'not-allowed')+';background:'+(canSave?'#157347':'#cdd8d2')+';color:#fff;'+(canSave?'box-shadow:0 2px 8px rgba(21,115,71,.3);':'');
  return `<div onclick="app.closeAddContext()" style="position:fixed;inset:0;background:rgba(10,30,22,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:60;padding:24px;">
    <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;width:560px;max-width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.3);animation:fadeUp .3s ease;">
      <div style="padding:22px 24px;border-bottom:1px solid #eef2f0;display:flex;align-items:center;gap:12px;">
        <div style="width:38px;height:38px;border-radius:10px;background:#e9f4ee;display:flex;align-items:center;justify-content:center;font-size:19px;color:#157347;">✦</div>
        <div style="flex:1;">
          <div style="font-size:16px;font-weight:700;color:#16241d;">เพิ่มบริบทให้ AI</div>
          <div style="font-size:11.5px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;">New AI context entry</div>
        </div>
        <button onclick="app.closeAddContext()" style="background:none;border:none;font-size:22px;color:#9aa8a1;cursor:pointer;line-height:1;">×</button>
      </div>
      <div style="padding:24px;">
        <div style="font-size:12.5px;font-weight:600;color:#39473f;margin-bottom:9px;">ประเภทบริบท</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:20px;">
          ${Object.keys(ctxTypes).map(k=>{
            const tp = ctxTypes[k]; const on = state.draftType===k;
            const st = 'display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 6px;border-radius:10px;cursor:pointer;font-family:inherit;transition:all .15s;border:1.5px solid '+(on?tp.color:'#e2e9e5')+';background:'+(on?tp.bg:'#fff')+';color:'+(on?tp.color:'#5a6b63')+';';
            return `<button onclick="app.setDraftType('${k}')" style="${st}"><span style="font-size:17px;">${tp.icon}</span><span style="font-size:11.5px;font-weight:600;">${tp.label}</span></button>`;
          }).join('')}
        </div>
        <div style="margin-bottom:16px;">
          <label style="font-size:12.5px;font-weight:600;color:#39473f;display:block;margin-bottom:8px;">หัวข้อ</label>
          <input class="fc" value="${esc(state.draftTitle)}" oninput="state.draftTitle=this.value;app.refreshSaveBtn()" placeholder="เช่น คำต้องห้ามกลุ่มเครื่องสำอาง" style="width:100%;border:1.5px solid #d8e2dc;border-radius:10px;padding:11px 13px;font-family:inherit;font-size:13px;color:#16241d;outline:none;" />
        </div>
        <div style="margin-bottom:18px;">
          <label style="font-size:12.5px;font-weight:600;color:#39473f;display:block;margin-bottom:8px;">เนื้อหา / รายละเอียด</label>
          <textarea oninput="state.draftBody=this.value" placeholder="ระบุข้อความ กฎเกณฑ์ มาตรา หรือรายการคำที่ต้องการให้ AI ใช้เป็นบริบท…" style="width:100%;min-height:110px;border:1.5px solid #d8e2dc;border-radius:10px;padding:13px;font-family:inherit;font-size:13px;color:#16241d;resize:vertical;outline:none;line-height:1.6;">${esc(state.draftBody)}</textarea>
        </div>
        <div style="display:flex;align-items:center;gap:10px;background:#f7faf8;border:1px solid #eef2f0;border-radius:10px;padding:12px 14px;margin-bottom:22px;">
          <span style="font-size:16px;">📎</span>
          <span style="font-size:12px;color:#7d8e86;flex:1;">หรือแนบไฟล์เอกสาร (PDF / DOCX / CSV)</span>
          <button style="background:#fff;border:1px solid #d8e2dc;border-radius:8px;padding:7px 13px;font-family:inherit;font-size:11.5px;font-weight:600;color:#157347;cursor:pointer;">เลือกไฟล์</button>
        </div>
        <div style="display:flex;gap:10px;">
          <button id="saveCtxBtn" onclick="app.saveContext()" style="${saveStyle}">บันทึกบริบท</button>
          <button onclick="app.closeAddContext()" style="background:#fff;border:1px solid #d8e2dc;border-radius:10px;padding:13px 22px;font-family:inherit;font-size:13.5px;font-weight:600;color:#39473f;cursor:pointer;">ยกเลิก</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ================= SHELL / RENDER =================
function render(){
  const t = titles[state.screen] || ['',''];
  const nav = navDef.map(n=>{
    const active = n.key === state.screen;
    const btn = 'display:flex;align-items:center;gap:11px;width:100%;border:none;cursor:pointer;padding:9px 12px;border-radius:9px;font-family:inherit;transition:background .15s;' +
      (active ? 'background:#2f9e6a;color:#fff;' : 'background:transparent;color:#a8c4b6;');
    const ic = 'width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;' + (active?'color:#fff;':'color:#5c8a72;');
    return `<button class="nav-btn" onclick="app.go('${n.key}')" style="${btn}">
      <span style="${ic}">${n.icon}</span>
      <span class="nav-label" style="flex:1;text-align:left;line-height:1.1;">
        <span style="display:block;font-size:13.5px;font-weight:500;">${n.th}</span>
        <span style="display:block;font-size:9.5px;opacity:.6;font-family:'IBM Plex Mono',monospace;">${n.en}</span>
      </span>
      ${n.badge ? `<span class="nav-badge" style="background:#d64545;color:#fff;font-size:10px;font-weight:600;padding:1px 7px;border-radius:9px;font-family:'IBM Plex Mono',monospace;">${n.badge}</span>` : ''}
    </button>`;
  }).join('');

  let body = '';
  if(state.screen==='dashboard') body = dashboardHTML();
  else if(state.screen==='upload') body = uploadHTML();
  else if(state.screen==='result') body = resultHTML();
  else if(state.screen==='cases') body = casesHTML();
  else if(state.screen==='context') body = contextHTML();
  else if(state.screen==='handoff') body = handoffHTML();

  document.getElementById('root').innerHTML = `
    <aside class="sidebar" style="width:248px;flex-shrink:0;background:#0f3026;display:flex;flex-direction:column;color:#cfe0d8;">
      <div class="brand" style="padding:22px 20px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,.08);">
        <div style="width:38px;height:38px;border-radius:9px;background:#2f9e6a;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:20px;flex-shrink:0;box-shadow:0 2px 8px rgba(47,158,106,.4);">⚖</div>
        <div class="brand-text" style="line-height:1.15;">
          <div style="font-weight:700;font-size:17px;color:#fff;letter-spacing:.2px;">AdGuard</div>
          <div style="font-size:10.5px;color:#7fae97;font-family:'IBM Plex Mono',monospace;letter-spacing:.5px;">FALSE-AD DETECTION</div>
        </div>
      </div>
      <nav class="sidebar-nav" style="padding:14px 12px;display:flex;flex-direction:column;gap:3px;flex:1;">
        <div class="menu-label" style="font-size:10px;font-weight:600;color:#5c8a72;letter-spacing:1.2px;padding:8px 12px 6px;">เมนูหลัก · MENU</div>
        ${nav}
      </nav>
      <div class="sidebar-user" style="padding:14px;border-top:1px solid rgba(255,255,255,.08);">
        <div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:9px;background:rgba(255,255,255,.05);">
          <div style="width:34px;height:34px;border-radius:50%;background:#2f9e6a;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:14px;">ส</div>
          <div style="flex:1;line-height:1.2;min-width:0;">
            <div style="font-size:12.5px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">สมหญิง ตรวจการณ์</div>
            <div style="font-size:10px;color:#7fae97;">เจ้าหน้าที่ อย.</div>
          </div>
          <span style="color:#5c8a72;font-size:15px;">⚙</span>
        </div>
      </div>
    </aside>
    <div style="flex:1;display:flex;flex-direction:column;min-width:0;">
      <header class="topbar" style="height:62px;flex-shrink:0;background:#fff;border-bottom:1px solid #e2e9e5;display:flex;align-items:center;padding:0 26px;gap:18px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:16px;font-weight:600;color:#16241d;line-height:1.1;">${t[0]}</div>
          <div class="topbar-sub" style="font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;">${t[1]}</div>
        </div>
        <div class="topbar-search" style="display:flex;align-items:center;gap:9px;background:#f1f5f3;border:1px solid #e2e9e5;border-radius:9px;padding:8px 13px;width:300px;">
          <span style="color:#9aa8a1;font-size:14px;">🔍</span>
          <input placeholder="ค้นหาเคส, แบรนด์, URL…" style="border:none;background:none;outline:none;font-family:inherit;font-size:13px;flex:1;color:#16241d;" />
        </div>
        <button class="h-dark topbar-cta" onclick="app.go('upload')" style="display:flex;align-items:center;gap:7px;background:#157347;color:#fff;border:none;border-radius:9px;padding:10px 16px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 1px 3px rgba(21,115,71,.3);">
          <span style="font-size:15px;line-height:1;">＋</span> <span class="topbar-cta-text">ตรวจสอบใหม่</span>
        </button>
      </header>
      <main class="main-scroll" style="flex:1;overflow-y:auto;padding:26px;">
        ${body}
        ${analyzingOverlayHTML()}
        ${addContextModalHTML()}
      </main>
    </div>`;
}

render();

// Load persisted data from the database (falls back to seed data if offline)
app.loadCases();
app.loadContext();
