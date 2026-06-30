import { createContext, useContext, useReducer, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FALLBACK_CASES, FALLBACK_CONTEXT } from "./lib/data.js";
import { pathFor } from "./lib/routes.js";

const initialState = {
  // auth
  user: null,
  authChecked: false,
  authError: "",
  authBusy: false,
  screen: "dashboard",
  selectedId: "AD-2026-0481",
  // input / analyze
  inputMode: "link",
  linkValue: "",
  fileLoaded: false,
  fileName: "",
  fileMetaReal: "",
  fileText: "",
  imageBase64: "",
  imageMediaType: "image/jpeg",
  analyzing: false,
  progress: 0,
  analyzeError: "",
  aiResult: null,
  viewAnalysis: null,
  loadingCase: false,
  // cases
  cases: FALLBACK_CASES,
  caseCounts: { all: 24, pending: 7, review: 5, referred: 9, cleared: 3 },
  caseFilter: "all",
  // context
  contextItems: FALLBACK_CONTEXT,
  showAddContext: false,
  draftType: "law",
  draftTitle: "",
  draftBody: "",
  draftFile: null,
  draftFileError: "",
  contextSaving: false,
  // referral
  handoffAgencies: [],
  handoffNote: "",
  handoffSent: false,
  // user management
  users: [],
  usersLoading: false,
  usersError: "",
  // discovery leads (monitoring queue)
  leads: [],
  leadsLoading: false,
  leadsError: "",
  leadBusyId: null,
  discoveryRunning: false,
  discoveryError: "",
};

function reducer(state, action) {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.patch };
    default:
      return state;
  }
}

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const set = useCallback((patch) => dispatch({ type: "patch", patch }), []);
  const ref = useRef({ timer: null, done: false, result: null });
  const navigate = useNavigate();

  // ---- navigation ----
  const go = useCallback((screen) => { set({ handoffSent: false }); navigate(pathFor(screen)); }, [set, navigate]);

  // ---- data loaders ----
  const loadCases = useCallback(async (filter = state.caseFilter) => {
    try {
      const r = await fetch("/api/cases?filter=" + encodeURIComponent(filter));
      if (!r.ok) return;
      const d = await r.json();
      set({ cases: d.cases, caseCounts: d.counts });
    } catch { /* offline — keep fallback */ }
  }, [set, state.caseFilter]);

  const loadContext = useCallback(async () => {
    try {
      const r = await fetch("/api/context");
      if (!r.ok) return;
      const d = await r.json();
      set({ contextItems: d.items });
    } catch { /* offline */ }
  }, [set]);

  // Fetch a case's stored AI analysis into state (no navigation). Called by the
  // Result component for whatever :id is in the URL (so deep links work too).
  const ensureCase = useCallback(async (id) => {
    set({ selectedId: id, viewAnalysis: null, loadingCase: true });
    try {
      const r = await fetch("/api/cases/" + encodeURIComponent(id));
      if (r.ok) {
        const c = await r.json();
        set({
          viewAnalysis: c.analysis ? {
            ...c.analysis,
            model: c.model || null,
            latencyMs: c.latencyMs || null,
            promptTokens: c.promptTokens || null,
            completionTokens: c.completionTokens || null,
            expertRiskLevel: c.expertRiskLevel || null,
            expertVerdict: c.expertVerdict || null,
            officerOverride: !!c.officerOverride,
            expertViolationCount: c.expertViolationCount ?? null,
            inputHash: c.inputHash || null,
          } : null,
          loadingCase: false,
        });
      }
      else { set({ loadingCase: false }); }
    } catch { set({ loadingCase: false }); }
  }, [set]);

  const openCase = useCallback((id) => { navigate(pathFor("result") + "/" + encodeURIComponent(id)); }, [navigate]);

  const setFilter = useCallback((f) => { set({ caseFilter: f }); loadCases(f); }, [set, loadCases]);

  // ---- file picker ----
  const onFileChosen = useCallback((file, mode) => {
    if (!file) return;
    const reader = new FileReader();
    if (mode === "image") {
      reader.onload = () => {
        const dataUrl = String(reader.result);
        set({ imageBase64: dataUrl.split(",")[1] || "", imageMediaType: file.type || "image/jpeg",
          fileName: file.name, fileMetaReal: Math.round(file.size / 1024) + " KB", fileLoaded: true });
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        set({ fileText: String(reader.result).slice(0, 20000),
          fileName: file.name, fileMetaReal: Math.round(file.size / 1024) + " KB", fileLoaded: true });
      };
      reader.readAsText(file);
    }
  }, [set]);

  // ---- analyze (real Claude API call) ----
  const analyze = useCallback(async () => {
    const s = ref.current;
    if (state.analyzing) return;
    s.done = false; s.result = null;
    set({ analyzing: true, progress: 0, analyzeError: "", aiResult: null });

    let prog = 0;
    s.timer = setInterval(() => {
      prog = Math.min(s.done ? 100 : 90, prog + (prog < 70 ? 7 : 3));
      set({ progress: prog });
      if (prog >= 100) {
        clearInterval(s.timer); s.timer = null;
        setTimeout(() => {
          const result = s.result;
          if (result) {
            const id = result.caseId || "AI";
            set({
              analyzing: false, selectedId: id, aiResult: result,
              viewAnalysis: {
                ...result,
                model: result.model || null,
                latencyMs: result.latencyMs || null,
                promptTokens: result.promptTokens || null,
                completionTokens: result.completionTokens || null,
                expertRiskLevel: null, expertVerdict: null, officerOverride: false,
                expertViolationCount: null, inputHash: result.inputHash || null,
              },
            });
            navigate(pathFor("result") + "/" + encodeURIComponent(id));
            loadCases();
          } else {
            set({ analyzing: false });
          }
        }, 300);
      }
    }, 180);

    const context = state.contextItems.filter((c) => c.active).map((c) => ({ title: c.title, body: c.body }));
    const payload = {
      mode: state.inputMode,
      url: state.inputMode === "link" ? "https://" + state.linkValue : "",
      text: state.inputMode === "file" ? state.fileText : "",
      imageBase64: state.inputMode === "image" ? state.imageBase64 : "",
      imageMediaType: state.imageMediaType,
      context,
    };
    try {
      const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "HTTP " + r.status);
      s.result = d; s.done = true;
    } catch (err) {
      clearInterval(s.timer); s.timer = null;
      set({ analyzing: false, progress: 0, analyzeError: err.message });
      alert("วิเคราะห์ไม่สำเร็จ: " + err.message + "\n\n(ตรวจสอบว่ารันผ่าน server.js และตั้งค่า ANTHROPIC_API_KEY แล้ว)");
    }
  }, [set, navigate, state.analyzing, state.contextItems, state.inputMode, state.linkValue, state.fileText, state.imageBase64, state.imageMediaType, loadCases]);

  // ---- referral ----
  const toggleAgency = useCallback((key) => {
    const has = state.handoffAgencies.includes(key);
    set({ handoffAgencies: has ? state.handoffAgencies.filter((k) => k !== key) : [...state.handoffAgencies, key] });
  }, [set, state.handoffAgencies]);

  const send = useCallback(async () => {
    if (state.handoffAgencies.length === 0) return;
    try {
      const r = await fetch("/api/cases/" + encodeURIComponent(state.selectedId) + "/refer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencies: state.handoffAgencies, note: state.handoffNote }),
      });
      if (r.ok) loadCases();
    } catch { /* optimistic in prototype */ }
    set({ handoffSent: true });
  }, [set, state.handoffAgencies, state.handoffNote, state.selectedId, loadCases]);

  const resetHandoff = useCallback(() => set({ handoffSent: false, handoffAgencies: [], handoffNote: "" }), [set]);

  // ---- AI context ----
  const openAddContext = useCallback(() => set({ showAddContext: true, draftType: "law", draftTitle: "", draftBody: "", draftFile: null, draftFileError: "" }), [set]);
  const closeAddContext = useCallback(() => set({ showAddContext: false, draftFile: null, draftFileError: "" }), [set]);
  const setDraftFile = useCallback((file) => set({ draftFile: file, draftFileError: "" }), [set]);

  const saveContext = useCallback(async () => {
    if (state.draftFile) {
      set({ contextSaving: true, draftFileError: "" });
      const fd = new FormData();
      fd.append("file", state.draftFile);
      fd.append("type", state.draftType);
      if (state.draftTitle.trim()) fd.append("title", state.draftTitle.trim());
      try {
        const r = await fetch("/api/context/upload", { method: "POST", body: fd });
        const item = await r.json();
        if (!r.ok) { set({ contextSaving: false, draftFileError: item.error || "อัปโหลดไม่สำเร็จ" }); return; }
        set({ showAddContext: false, contextSaving: false, draftFile: null, contextItems: [{ ...item, active: !!item.active }, ...state.contextItems] });
        navigate(pathFor("context"));
      } catch {
        set({ contextSaving: false, draftFileError: "อัปโหลดไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ" });
      }
      return;
    }
    if (!state.draftTitle.trim()) return;
    const meta = "เพิ่มเมื่อ " + new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short" });
    const payload = { type: state.draftType, title: state.draftTitle.trim(), body: state.draftBody.trim() || "—", meta };
    set({ showAddContext: false });
    navigate(pathFor("context"));
    try {
      const r = await fetch("/api/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) { const item = await r.json(); set({ contextItems: [{ ...item, active: !!item.active }, ...state.contextItems] }); }
    } catch {
      set({ contextItems: [{ id: Date.now(), ...payload, active: true }, ...state.contextItems] });
    }
  }, [set, navigate, state.draftTitle, state.draftBody, state.draftType, state.draftFile, state.contextItems]);

  const deleteContext = useCallback(async (id) => {
    await fetch("/api/context/" + id, { method: "DELETE" });
    set({ contextItems: state.contextItems.filter((c) => c.id !== id) });
  }, [set, state.contextItems]);

  const attachContextFile = useCallback(async (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/context/" + id + "/upload", { method: "PATCH", body: fd });
    const item = await r.json();
    if (!r.ok) throw new Error(item.error || "อัปโหลดไม่สำเร็จ");
    set({ contextItems: state.contextItems.map((c) => (c.id === id ? { ...c, ...item } : c)) });
    return item;
  }, [set, state.contextItems]);

  const toggleContext = useCallback(async (id) => {
    set({ contextItems: state.contextItems.map((c) => (c.id === id ? { ...c, active: !c.active } : c)) });
    try { await fetch("/api/context/" + id + "/toggle", { method: "PATCH" }); } catch { /* optimistic */ }
  }, [set, state.contextItems]);

  // ---- auth ----
  const loadAppData = useCallback(() => { loadCases(); loadContext(); }, [loadCases, loadContext]);

  const checkAuth = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me");
      if (r.ok) { const d = await r.json(); set({ user: d.user, authChecked: true }); loadAppData(); return; }
    } catch { /* offline */ }
    set({ user: null, authChecked: true });
  }, [set, loadAppData]);

  const login = useCallback(async (email, password) => {
    set({ authBusy: true, authError: "" });
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "เข้าสู่ระบบไม่สำเร็จ");
      set({ user: d.user, authBusy: false, authError: "" });
      loadAppData();
    } catch (err) {
      set({ authBusy: false, authError: err.message });
    }
  }, [set, loadAppData]);

  const logout = useCallback(async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    set({ user: null });
    navigate("/");
  }, [set, navigate]);

  // ---- bootstrap ----
  useEffect(() => { checkAuth(); /* eslint-disable-next-line */ }, []);
  useEffect(() => () => { if (ref.current.timer) clearInterval(ref.current.timer); }, []);

  const setVerdict = useCallback(async (id, payload) => {
    await fetch("/api/cases/" + encodeURIComponent(id) + "/verdict", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    set({ viewAnalysis: state.viewAnalysis ? { ...state.viewAnalysis, ...payload } : null });
  }, [set, state.viewAnalysis]);

  const deleteCase = useCallback(async (id) => {
    await fetch("/api/cases/" + encodeURIComponent(id), { method: "DELETE" });
    loadCases(state.caseFilter);
  }, [loadCases, state.caseFilter]);

  const loadUsers = useCallback(async () => {
    set({ usersLoading: true, usersError: "" });
    try {
      const r = await fetch("/api/users");
      if (!r.ok) throw new Error((await r.json()).error || r.statusText);
      const d = await r.json();
      set({ users: d.users, usersLoading: false });
    } catch (e) { set({ usersError: e.message, usersLoading: false }); }
  }, [set]);

  const createUserAdmin = useCallback(async (payload) => {
    const r = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || r.statusText);
    set({ users: [...state.users, d] });
  }, [set, state.users]);

  const updateUserAdmin = useCallback(async (id, payload) => {
    const r = await fetch("/api/users/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || r.statusText);
    set({ users: state.users.map((u) => (u.id === id ? d : u)) });
  }, [set, state.users]);

  const deleteUserAdmin = useCallback(async (id) => {
    const r = await fetch("/api/users/" + id, { method: "DELETE" });
    if (!r.ok) { const d = await r.json(); throw new Error(d.error || r.statusText); }
    set({ users: state.users.filter((u) => u.id !== id) });
  }, [set, state.users]);

  const resetPasswordAdmin = useCallback(async (id, password) => {
    const r = await fetch("/api/users/" + id + "/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (!r.ok) { const d = await r.json(); throw new Error(d.error || r.statusText); }
  }, []);

  const loadLeads = useCallback(async (status) => {
    set({ leadsLoading: true, leadsError: "" });
    try {
      const qs = status && status !== "all" ? "?status=" + status : "";
      const r = await fetch("/api/leads" + qs);
      if (!r.ok) throw new Error((await r.json()).error || r.statusText);
      const d = await r.json();
      set({ leads: d.leads, leadsLoading: false });
    } catch (e) { set({ leadsError: e.message, leadsLoading: false }); }
  }, [set]);

  const createLead = useCallback(async (payload) => {
    const r = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || r.statusText);
    set({ leads: [d, ...state.leads] });
  }, [set, state.leads]);

  const discardLead = useCallback(async (id) => {
    set({ leadBusyId: id });
    try {
      const r = await fetch("/api/leads/" + id + "/discard", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || r.statusText);
      set({ leads: state.leads.map((l) => (l.id === id ? d : l)), leadBusyId: null });
    } catch (e) { set({ leadBusyId: null }); throw e; }
  }, [set, state.leads]);

  const deleteLead = useCallback(async (id) => {
    await fetch("/api/leads/" + id, { method: "DELETE" });
    set({ leads: state.leads.filter((l) => l.id !== id) });
  }, [set, state.leads]);

  const collectLead = useCallback(async (id) => {
    set({ leadBusyId: id });
    try {
      const r = await fetch("/api/leads/" + id + "/collect", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || r.statusText);
      set({ leads: state.leads.map((l) => (l.id === id ? d : l)), leadBusyId: null });
      return d;
    } catch (e) { set({ leadBusyId: null }); throw e; }
  }, [set, state.leads]);

  const promoteLead = useCallback(async (id) => {
    set({ leadBusyId: id });
    try {
      const r = await fetch("/api/leads/" + id + "/promote", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || r.statusText);
      set({ leads: state.leads.map((l) => (l.id === id ? d.lead : l)), leadBusyId: null });
      navigate(pathFor("result") + "/" + d.caseId);
      return d;
    } catch (e) { set({ leadBusyId: null }); throw e; }
  }, [set, state.leads, navigate]);

  const runDiscovery = useCallback(async () => {
    set({ discoveryRunning: true, discoveryError: "" });
    try {
      const r = await fetch("/api/discovery/run", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || r.statusText);
      set({ discoveryRunning: false });
      return d;
    } catch (e) { set({ discoveryRunning: false, discoveryError: e.message }); throw e; }
  }, [set]);

  const api = { state, set, go, loadCases, loadContext, openCase, ensureCase, setFilter, onFileChosen, analyze,
    toggleAgency, send, resetHandoff, openAddContext, closeAddContext, saveContext, toggleContext, setDraftFile, deleteContext, attachContextFile,
    checkAuth, login, logout, deleteCase, setVerdict,
    loadUsers, createUserAdmin, updateUserAdmin, deleteUserAdmin, resetPasswordAdmin,
    loadLeads, createLead, discardLead, deleteLead, promoteLead, runDiscovery, collectLead };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
