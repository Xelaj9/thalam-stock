import { useState, useEffect, useCallback } from "react";

const SK = "thalam-products";
const SS = "thalam-settings";

const DEFAULT_PRODUCTS = [
  { id: 1, name: "ไฮเนเก้น", category: "เบียร์", unit: "ขวด", currentStock: 48, minStock: 60, alertThreshold: 24, unitPrice: 65 },
  { id: 2, name: "ช้าง", category: "เบียร์", unit: "ขวด", currentStock: 12, minStock: 72, alertThreshold: 24, unitPrice: 55 },
  { id: 3, name: "แจ็ค แดเนียลส์", category: "วิสกี้", unit: "ขวด", currentStock: 5, minStock: 12, alertThreshold: 4, unitPrice: 1200 },
  { id: 4, name: "รูเลต", category: "วอดก้า", unit: "ขวด", currentStock: 8, minStock: 10, alertThreshold: 3, unitPrice: 380 },
  { id: 5, name: "โค้ก", category: "มิกเซอร์", unit: "กระป๋อง", currentStock: 120, minStock: 150, alertThreshold: 60, unitPrice: 20 },
];

const DEFAULT_SETTINGS = { botToken: "", chatId: "", shopName: "THALAM" };
const CATEGORIES = ["เบียร์", "ไวน์", "วิสกี้", "วอดก้า", "รัม", "จิน", "เตกีล่า", "มิกเซอร์", "อื่นๆ"];
const UNITS = ["ขวด", "กระป๋อง", "แพ็ค", "ลัง", "ลิตร"];

const C = {
  bg0: "#0a0a0a", bg1: "#111111", bg2: "#1a1a1a", bg3: "#222222",
  green: "#00ff88", greenDim: "#00cc6a", greenDark: "#003d1f",
  border: "#1f1f1f", borderGreen: "#00ff8844",
  text: "#e8e8e8", textMuted: "#666", textDim: "#444",
  red: "#ff4444", redBg: "#1a0000", redBorder: "#ff444433",
  amber: "#ffaa00", amberBg: "#1a0f00",
};

const glow = (color = C.green) => ({ boxShadow: `0 0 12px ${color}22` });
const statusOf = (p) => p.currentStock <= 0 ? "empty" : p.currentStock <= p.alertThreshold ? "alert" : p.currentStock < p.minStock ? "low" : "ok";
const STATUS = {
  ok:    { label: "ปกติ",      bg: "#001a0a", text: "#00ff88", border: "#00ff8844" },
  low:   { label: "ใกล้หมด",  bg: "#1a0f00", text: "#ffaa00", border: "#ffaa0044" },
  alert: { label: "แจ้งเตือน", bg: "#1a0500", text: "#ff6600", border: "#ff660044" },
  empty: { label: "หมดแล้ว",  bg: "#1a0000", text: "#ff4444", border: "#ff444444" },
};

function Badge({ status }) {
  const s = STATUS[status];
  return <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function Bar({ current, min, threshold }) {
  const pct = Math.min(100, (current / min) * 100);
  const color = current <= 0 ? C.red : current <= threshold ? "#ff6600" : current < min ? C.amber : C.green;
  return (
    <div style={{ background: C.bg3, borderRadius: 4, height: 5, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s", boxShadow: `0 0 6px ${color}88` }} />
    </div>
  );
}

const baseInp = { width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg2, color: C.text, fontSize: 14, boxSizing: "border-box", fontFamily: "'Courier New', monospace" };

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: C.greenDim, marginBottom: 5, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

function GBtn({ onClick, disabled, children, color = C.green }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: "transparent", color, border: `1px solid ${color}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, letterSpacing: 0.5, opacity: disabled ? 0.5 : 1, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", boxShadow: `0 0 8px ${color}22`, fontFamily: "'Courier New', monospace" }}>
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: C.bg1, borderRadius: 14, border: `1px solid ${C.borderGreen}`, padding: "1.5rem", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", ...glow() }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: C.green, letterSpacing: 1 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.textMuted, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [toast, setToast] = useState(null);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [tgLog, setTgLog] = useState([]);

  // โหลดข้อมูลจาก localStorage
  useEffect(() => {
    const d = localStorage.getItem(SK);
    const s = localStorage.getItem(SS);
    setProducts(d ? JSON.parse(d) : DEFAULT_PRODUCTS);
    setSettings(s ? JSON.parse(s) : DEFAULT_SETTINGS);
  }, []);

  // บันทึกสินค้าลง localStorage
  const saveProducts = useCallback((p) => {
    setProducts(p);
    localStorage.setItem(SK, JSON.stringify(p));
  }, []);

  // บันทึก settings ลง localStorage
  const saveSettings = useCallback((s) => {
    setSettings(s);
    localStorage.setItem(SS, JSON.stringify(s));
  }, []);

  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const sendTG = async (text, label = "") => {
    if (!settings.botToken || !settings.chatId) { showToast("กรุณาตั้งค่า Bot Token และ Chat ID ก่อน", "err"); return false; }
    try {
      const res = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: settings.chatId, text, parse_mode: "HTML" }) });
      const d = await res.json();
      if (d.ok) { setTgLog(p => [{ time: new Date().toLocaleTimeString("th-TH"), label, ok: true }, ...p.slice(0, 9)]); return true; }
      setTgLog(p => [{ time: new Date().toLocaleTimeString("th-TH"), label: d.description || "ส่งไม่สำเร็จ", ok: false }, ...p.slice(0, 9)]);
      showToast("Telegram: " + (d.description || "error"), "err"); return false;
    } catch (e) { showToast("Error: " + e.message, "err"); return false; }
  };

  const buildAlertMsg = (items) => {
    let msg = `🏪 <b>${settings.shopName || "THALAM"} STOCK ALERT</b>\n📅 ${new Date().toLocaleString("th-TH")}\n━━━━━━━━━━━━━━━━━━━\n⚠️ <b>รายการสต็อกต่ำกว่ากำหนด</b>\n\n`;
    let total = 0;
    items.forEach(p => { const need = p.minStock - p.currentStock, cost = need * p.unitPrice; total += cost; msg += `${p.currentStock <= 0 ? "🔴" : "🟠"} <b>${p.name}</b>\n   เหลือ: ${p.currentStock} | ขั้นต่ำ: ${p.minStock} ${p.unit}\n   ต้องซื้อ: <b>${need} ${p.unit}</b> = <b>฿${cost.toLocaleString("th-TH")}</b>\n\n`; });
    return msg + `━━━━━━━━━━━━━━━━━━━\n💰 <b>รวมที่ต้องเตรียม: ฿${total.toLocaleString("th-TH")}</b>`;
  };

  const buildReportMsg = () => {
    let msg = `🏪 <b>${settings.shopName || "THALAM"} STOCK REPORT</b>\n📅 ${new Date().toLocaleString("th-TH")}\n━━━━━━━━━━━━━━━━━━━\n\n`;
    const groups = {};
    products.forEach(p => { if (!groups[p.category]) groups[p.category] = []; groups[p.category].push(p); });
    Object.entries(groups).forEach(([cat, items]) => { msg += `📦 <b>${cat}</b>\n`; items.forEach(p => { const st = statusOf(p); msg += `  ${st==="ok"?"✅":st==="low"?"🟡":st==="alert"?"🟠":"🔴"} ${p.name}: ${p.currentStock}/${p.minStock} ${p.unit}\n`; }); msg += "\n"; });
    return msg + `━━━━━━━━━━━━━━━━━━━\n📊 ปกติ ${products.filter(p=>statusOf(p)==="ok").length} | ต้องซื้อ ${products.filter(p=>statusOf(p)!=="ok").length} รายการ`;
  };

  const handleAlert = async () => { setSending(true); const items = products.filter(p => statusOf(p) !== "ok"); if (!items.length) { showToast("สต็อกทุกรายการปกติ ✓"); setSending(false); return; } if (await sendTG(buildAlertMsg(items), "แจ้งเตือนสต็อกต่ำ")) showToast(`ส่งแจ้งเตือน ${items.length} รายการสำเร็จ ✓`); setSending(false); };
  const handleReport = async () => { setSending(true); if (await sendTG(buildReportMsg(), "รายงานสต็อก")) showToast("ส่งรายงานสำเร็จ ✓"); setSending(false); };

  const openAdd = () => { setForm({ name: "", category: CATEGORIES[0], unit: UNITS[0], currentStock: "", minStock: "", alertThreshold: "", unitPrice: "" }); setEditId(null); setModal("product"); };
  const openEdit = (p) => { setForm({ ...p }); setEditId(p.id); setModal("product"); };
  const saveProduct = () => {
    if (!form.name || form.currentStock === "" || !form.minStock || !form.alertThreshold || !form.unitPrice) { showToast("กรุณากรอกข้อมูลให้ครบ", "err"); return; }
    const p = { ...form, currentStock: +form.currentStock, minStock: +form.minStock, alertThreshold: +form.alertThreshold, unitPrice: +form.unitPrice };
    if (editId) { saveProducts(products.map(x => x.id === editId ? { ...p, id: editId } : x)); showToast("แก้ไขสำเร็จ ✓"); }
    else { saveProducts([...products, { ...p, id: Date.now() }]); showToast("เพิ่มสินค้าสำเร็จ ✓"); }
    setModal(null);
  };
  const delProduct = (id) => { if (window.confirm("ต้องการลบสินค้านี้?")) { saveProducts(products.filter(x => x.id !== id)); showToast("ลบสำเร็จ ✓"); } };
  const adjStock = (id, d) => saveProducts(products.map(p => p.id === id ? { ...p, currentStock: Math.max(0, p.currentStock + d) } : p));

  const alerts = products.filter(p => statusOf(p) !== "ok");
  const totalCost = alerts.reduce((s, p) => s + Math.max(0, p.minStock - p.currentStock) * p.unitPrice, 0);
  const filtered = products.filter(p => {
    const mf = filter === "all" || statusOf(p) === filter || (filter === "alert" && ["alert","empty"].includes(statusOf(p)));
    return mf && (p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));
  });

  const TabBtn = ({ id, label, count = 0 }) => (
    <button onClick={() => setTab(id)} style={{ background: tab === id ? C.greenDark : "transparent", color: tab === id ? C.green : C.textMuted, border: `1px solid ${tab === id ? C.borderGreen : C.border}`, borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 6, boxShadow: tab === id ? `0 0 10px ${C.green}22` : "none", fontFamily: "'Courier New', monospace" }}>
      {label}
      {count > 0 && <span style={{ background: C.red, color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 6px", fontWeight: 700 }}>{count}</span>}
    </button>
  );

  return (
    <div style={{ fontFamily: "'Courier New', monospace", background: C.bg0, color: C.text, padding: "1rem", maxWidth: 900, margin: "0 auto", minHeight: "100vh" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10, paddingBottom: 16, borderBottom: `1px solid ${C.borderGreen}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${C.borderGreen}`, background: C.greenDark, display: "flex", alignItems: "center", justifyContent: "center", ...glow() }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.green, letterSpacing: 3, textShadow: `0 0 20px ${C.green}88` }}>THALAM STOCK</div>
            <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>ระบบจัดการสต็อกเครื่องดื่ม</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <GBtn onClick={handleAlert} disabled={sending} color="#ff6600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            แจ้งเตือน ({alerts.length})
          </GBtn>
          <GBtn onClick={handleReport} disabled={sending}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/></svg>
            รายงาน
          </GBtn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <TabBtn id="dashboard" label="แดชบอร์ด" />
        <TabBtn id="stock" label="จัดการสต็อก" count={alerts.length} />
        <TabBtn id="settings" label="ตั้งค่า" />
      </div>

      {tab === "dashboard" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
            {[
              { label: "สินค้าทั้งหมด", value: products.length, color: C.green },
              { label: "ต้องสั่งซื้อ", value: alerts.length, color: alerts.length > 0 ? "#ff6600" : C.green },
              { label: "งบต้องเตรียม", value: `฿${totalCost.toLocaleString("th-TH")}`, color: totalCost > 0 ? C.red : C.green, small: true },
              { label: "สต็อกปกติ", value: products.filter(p => statusOf(p) === "ok").length, color: C.green },
            ].map((c, i) => (
              <div key={i} style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", borderTop: `2px solid ${c.color}` }}>
                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>{c.label}</div>
                <div style={{ fontSize: c.small ? 17 : 28, fontWeight: 700, color: c.color, textShadow: `0 0 15px ${c.color}66` }}>{c.value}</div>
              </div>
            ))}
          </div>

          {alerts.length > 0 && (
            <div style={{ background: C.bg1, border: `1px solid #ff660033`, borderRadius: 12, padding: "14px 16px", marginBottom: 20, borderLeft: `3px solid #ff6600` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#ff6600", marginBottom: 10, letterSpacing: 1, display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                รายการที่ต้องสั่งซื้อ
              </div>
              {alerts.map(p => { const need = Math.max(0, p.minStock - p.currentStock); return (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", gap: 4 }}>
                  <div><span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span><span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>{p.category}</span></div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 12, color: C.textMuted, fontFamily: "monospace" }}>{p.currentStock}/{p.minStock} {p.unit}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#ff6600" }}>+{need} = ฿{(need * p.unitPrice).toLocaleString("th-TH")}</span>
                  </div>
                </div>
              ); })}
              <div style={{ marginTop: 10, textAlign: "right", fontSize: 14, fontWeight: 700, color: C.red }}>รวม: ฿{totalCost.toLocaleString("th-TH")}</div>
            </div>
          )}

          <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, color: C.green, letterSpacing: 1, textTransform: "uppercase" }}>ภาพรวมสต็อก</div>
            {products.slice().sort((a, b) => (a.currentStock/a.minStock) - (b.currentStock/b.minStock)).map(p => (
              <div key={p.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 14 }}>{p.name}</span><Badge status={statusOf(p)} /></div>
                  <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{p.currentStock}/{p.minStock}</span>
                </div>
                <Bar current={p.currentStock} min={p.minStock} threshold={p.alertThreshold} />
              </div>
            ))}
          </div>

          {tgLog.length > 0 && (
            <div style={{ marginTop: 14, background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 8, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>ประวัติการส่ง Telegram</div>
              {tgLog.map((l, i) => <div key={i} style={{ fontSize: 12, color: l.ok ? C.green : C.red, display: "flex", gap: 10, padding: "3px 0", fontFamily: "monospace" }}><span style={{ color: C.textDim }}>{l.time}</span><span>{l.ok ? "✓" : "✗"} {l.label}</span></div>)}
            </div>
          )}
        </div>
      )}

      {tab === "stock" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาสินค้า..." style={{ ...baseInp, width: "auto", flex: "1 1 180px" }} />
            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ ...baseInp, width: "auto" }}>
              <option value="all">ทั้งหมด</option><option value="alert">แจ้งเตือน/หมด</option><option value="low">ใกล้หมด</option><option value="ok">ปกติ</option>
            </select>
            <GBtn onClick={openAdd}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              เพิ่มสินค้า
            </GBtn>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map(p => {
              const st = statusOf(p), s = STATUS[st], need = Math.max(0, p.minStock - p.currentStock);
              return (
                <div key={p.id} style={{ background: C.bg1, border: `1px solid ${st !== "ok" ? s.border : C.border}`, borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${s.text}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}><span style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</span><Badge status={st} /></div>
                      <span style={{ fontSize: 11, color: C.textMuted }}>{p.category} · ฿{p.unitPrice.toLocaleString("th-TH")}/{p.unit}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(p)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: C.textMuted, fontFamily: "'Courier New', monospace" }}>แก้ไข</button>
                      <button onClick={() => delProduct(p.id)} style={{ background: "transparent", border: `1px solid ${C.redBorder}`, borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: C.red, fontFamily: "'Courier New', monospace" }}>ลบ</button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 10 }}>
                    <div style={{ background: C.bg2, borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ color: C.textMuted, fontSize: 9, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>สต็อกคงเหลือ</div>
                      <div style={{ fontWeight: 700, fontSize: 22, color: s.text, textShadow: `0 0 10px ${s.text}66` }}>{p.currentStock} <span style={{ fontSize: 11, fontWeight: 400 }}>{p.unit}</span></div>
                    </div>
                    <div style={{ background: C.bg2, borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ color: C.textMuted, fontSize: 9, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>ขั้นต่ำ / แจ้งเตือน</div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{p.minStock} / {p.alertThreshold} {p.unit}</div>
                    </div>
                    {need > 0 && (
                      <div style={{ background: C.amberBg, border: `1px solid ${C.amber}33`, borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ color: C.amber, fontSize: 9, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>ต้องซื้อเพิ่ม</div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: C.amber }}>{need} {p.unit}</div>
                        <div style={{ fontSize: 12, color: C.amber }}>฿{(need * p.unitPrice).toLocaleString("th-TH")}</div>
                      </div>
                    )}
                  </div>
                  <Bar current={p.currentStock} min={p.minStock} threshold={p.alertThreshold} />
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase" }}>ปรับสต็อก:</span>
                    {[[-1,"−"],[1,"+"],[6,"+6"],[12,"+12"]].map(([d, lbl]) => (
                      <button key={lbl} onClick={() => adjStock(p.id, d)} style={{ height: 26, minWidth: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 12, padding: "0 8px", color: d < 0 ? C.red : C.green, fontWeight: 700, fontFamily: "'Courier New', monospace" }}>{lbl}</button>
                    ))}
                    <button onClick={() => { const v = prompt(`ปรับสต็อก ${p.name} (ใส่เลขติดลบเพื่อลด)`); if (v && !isNaN(+v)) adjStock(p.id, +v); }} style={{ height: 26, borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 11, padding: "0 10px", color: C.textMuted, fontFamily: "'Courier New', monospace" }}>กำหนดเอง</button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div style={{ textAlign: "center", color: C.textMuted, padding: "2rem", fontSize: 14 }}>ไม่พบสินค้า</div>}
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ background: C.bg1, border: `1px solid ${C.borderGreen}`, borderRadius: 12, padding: "1.25rem", marginBottom: 16, ...glow() }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 16, color: C.green, letterSpacing: 2, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#229ED9" strokeWidth="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              ตั้งค่า Telegram Bot
            </div>
            <Field label="ชื่อร้าน"><input style={baseInp} value={settings.shopName} onChange={e => saveSettings({ ...settings, shopName: e.target.value })} placeholder="THALAM" /></Field>
            <Field label="Bot Token"><input style={baseInp} type="password" value={settings.botToken} onChange={e => saveSettings({ ...settings, botToken: e.target.value })} placeholder="xxxxxxxxxx:AAAA..." /></Field>
            <Field label="Chat ID"><input style={baseInp} value={settings.chatId} onChange={e => saveSettings({ ...settings, chatId: e.target.value })} placeholder="-100xxxxxxxxxx หรือ @username" /></Field>
            <div style={{ display: "flex", gap: 8 }}>
              <GBtn onClick={handleAlert} disabled={sending} color="#ff6600">ทดสอบแจ้งเตือน</GBtn>
              <GBtn onClick={handleReport} disabled={sending}>ทดสอบรายงาน</GBtn>
            </div>
          </div>
          <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: C.green, letterSpacing: 1, textTransform: "uppercase" }}>วิธีตั้งค่า</div>
            {[["1","สร้างบอทกับ @BotFather แล้วรับ Bot Token"],["2","เพิ่มบอทเข้ากลุ่มหรือแชทที่ต้องการรับแจ้งเตือน"],["3","เปิด https://api.telegram.org/bot{TOKEN}/getUpdates เพื่อดู Chat ID"],["4","กรอก Bot Token และ Chat ID แล้วกดทดสอบ"]].map(([n,t]) => (
              <div key={n} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.greenDark, border: `1px solid ${C.borderGreen}`, color: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{n}</div>
                <p style={{ margin: 0, fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal === "product" && (
        <Modal title={editId ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"} onClose={() => setModal(null)}>
          <Field label="ชื่อสินค้า"><input style={baseInp} value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ชื่อเครื่องดื่ม" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="หมวดหมู่"><select style={baseInp} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="หน่วย"><select style={baseInp} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="สต็อกคงเหลือ"><input style={baseInp} type="number" min="0" value={form.currentStock} onChange={e => setForm({ ...form, currentStock: e.target.value })} placeholder="0" /></Field>
            <Field label="ขั้นต่ำที่ต้องมี"><input style={baseInp} type="number" min="1" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} placeholder="24" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="แจ้งเตือนเมื่อต่ำกว่า"><input style={baseInp} type="number" min="1" value={form.alertThreshold} onChange={e => setForm({ ...form, alertThreshold: e.target.value })} placeholder="12" /></Field>
            <Field label="ราคา/หน่วย (บาท)"><input style={baseInp} type="number" min="0" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} placeholder="65" /></Field>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
            <button onClick={() => setModal(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, color: C.textMuted, fontFamily: "'Courier New', monospace" }}>ยกเลิก</button>
            <button onClick={saveProduct} style={{ background: C.greenDark, border: `1px solid ${C.borderGreen}`, borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, color: C.green, fontWeight: 700, letterSpacing: 0.5, fontFamily: "'Courier New', monospace", ...glow() }}>{editId ? "บันทึก" : "เพิ่มสินค้า"}</button>
          </div>
        </Modal>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "err" ? C.redBg : C.greenDark, border: `1px solid ${toast.type === "err" ? C.red : C.green}`, color: toast.type === "err" ? C.red : C.green, borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 700, zIndex: 9999, maxWidth: 320, letterSpacing: 0.5, ...glow(toast.type === "err" ? C.red : C.green) }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
