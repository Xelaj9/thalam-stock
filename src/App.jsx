import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

const UNITS = ["ขวด", "กระป๋อง", "แพ็ค", "ลัง", "ลิตร"];

const C = {
  bg0:"#0a0a0a",bg1:"#111111",bg2:"#1a1a1a",bg3:"#222222",
  green:"#00ff88",greenDim:"#00cc6a",greenDark:"#003d1f",
  border:"#1f1f1f",borderGreen:"#00ff8844",
  text:"#e8e8e8",textMuted:"#666",textDim:"#444",
  red:"#ff4444",redBg:"#1a0000",redBorder:"#ff444433",
  amber:"#ffaa00",amberBg:"#1a0f00",
};

const glow = (c=C.green)=>({boxShadow:`0 0 12px ${c}22`});
const statusOf = p => p.current_stock<=0?"empty":p.current_stock<=p.alert_threshold?"alert":p.current_stock<p.min_stock?"low":"ok";
const STATUS = {
  ok:   {label:"ปกติ",      bg:"#001a0a",text:"#00ff88",border:"#00ff8844"},
  low:  {label:"ใกล้หมด",  bg:"#1a0f00",text:"#ffaa00",border:"#ffaa0044"},
  alert:{label:"แจ้งเตือน",bg:"#1a0500",text:"#ff6600",border:"#ff660044"},
  empty:{label:"หมดแล้ว",  bg:"#1a0000",text:"#ff4444",border:"#ff444444"},
};

const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0a;color:#e8e8e8;font-family:'Courier New',monospace}
input,select,button{font-family:'Courier New',monospace}
input,select{background:#1a1a1a;color:#e8e8e8;border:1px solid #1f1f1f;border-radius:8px;padding:9px 12px;font-size:14px;width:100%;outline:none}
input:focus,select:focus{border-color:#00ff8844}
option{background:#1a1a1a}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:#111}
::-webkit-scrollbar-thumb{background:#00ff8833;border-radius:4px}
.app{padding:1rem;max-width:960px;margin:0 auto;min-height:100vh}
.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid #00ff8844;flex-wrap:wrap;gap:10px}
.header-left{display:flex;align-items:center;gap:12px}
.logo-box{width:42px;height:42px;border-radius:10px;border:1px solid #00ff8844;background:#003d1f;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.h-title{font-size:20px;font-weight:700;color:#00ff88;letter-spacing:3px;text-shadow:0 0 20px #00ff8888}
.h-sub{font-size:10px;color:#666;letter-spacing:2px;text-transform:uppercase}
.h-btns{display:flex;gap:8px;flex-wrap:wrap}
.tabs{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.tab-btn{background:transparent;color:#666;border:1px solid #1f1f1f;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:13px;font-weight:600;letter-spacing:.5px;display:flex;align-items:center;gap:6px;white-space:nowrap;font-family:'Courier New',monospace}
.tab-btn.active{background:#003d1f;color:#00ff88;border-color:#00ff8844;box-shadow:0 0 10px #00ff8822}
.red-badge{background:#ff4444;color:#fff;border-radius:10px;font-size:10px;padding:1px 6px;font-weight:700}
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.stat-card{background:#111;border:1px solid #1f1f1f;border-radius:10px;padding:12px 14px}
.stat-lbl{font-size:10px;color:#666;margin-bottom:6px;letter-spacing:1px;text-transform:uppercase}
.stat-val{font-size:26px;font-weight:700}
.alert-box{background:#111;border:1px solid #ff660033;border-left:3px solid #ff6600;border-radius:12px;padding:14px 16px;margin-bottom:16px}
.alert-ttl{font-size:12px;font-weight:700;color:#ff6600;margin-bottom:10px;letter-spacing:1px;display:flex;align-items:center;gap:8px}
.alert-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #1f1f1f;flex-wrap:wrap;gap:4px}
.alert-total{margin-top:10px;text-align:right;font-size:14px;font-weight:700;color:#ff4444}
.box{background:#111;border:1px solid #1f1f1f;border-radius:12px;padding:14px 16px;margin-bottom:14px}
.sec-title{font-size:12px;font-weight:700;color:#00ff88;letter-spacing:1px;text-transform:uppercase;margin-bottom:14px}
.stock-row{margin-bottom:14px}
.stock-row-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;flex-wrap:wrap;gap:4px}
.toolbar{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.toolbar input{flex:1 1 180px;width:auto}
.toolbar select{width:auto;flex:0 0 auto}
.s-card{background:#111;border-radius:12px;padding:14px 16px;margin-bottom:10px}
.s-card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap;gap:8px}
.s-name{font-weight:600;font-size:15px}
.s-meta{font-size:11px;color:#666;margin-top:3px}
.i-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}
.i-cell{background:#1a1a1a;border-radius:8px;padding:8px 10px}
.i-lbl{color:#666;font-size:9px;margin-bottom:3px;letter-spacing:1px;text-transform:uppercase}
.i-val{font-weight:700;font-size:20px}
.i-unit{font-size:11px;font-weight:400}
.i-sub{font-size:11px;margin-top:2px}
.adj-row{display:flex;align-items:center;gap:6px;margin-top:10px;flex-wrap:wrap}
.adj-lbl{font-size:10px;color:#666;letter-spacing:.5px;text-transform:uppercase}

/* Category tab */
.cat-add-row{display:flex;gap:8px;margin-bottom:16px}
.cat-add-row input{flex:1}
.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.cat-card{background:#111;border:1px solid #1f1f1f;border-radius:10px;padding:12px 14px}
.cat-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cat-name{font-size:14px;font-weight:600;flex:1}
.cat-count{font-size:11px;color:#666;background:#1a1a1a;border-radius:6px;padding:2px 8px;white-space:nowrap}
.cat-edit-input{background:#0a0a0a;color:#e8e8e8;border:1px solid #00ff8844;border-radius:6px;padding:5px 8px;font-size:13px;font-family:'Courier New',monospace;outline:none;width:100%;margin-top:10px}
.cat-edit-btns{display:flex;gap:6px;margin-top:8px}

.settings-wrap{max-width:520px}
.settings-box{background:#111;border:1px solid #00ff8844;border-radius:12px;padding:1.25rem;margin-bottom:14px}
.f-lbl{display:block;font-size:11px;color:#00cc6a;margin-bottom:5px;font-weight:600;letter-spacing:.8px;text-transform:uppercase}
.f-wrap{margin-bottom:14px}
.step-row{display:flex;gap:10px;margin-bottom:10px}
.step-n{width:22px;height:22px;border-radius:50%;background:#003d1f;border:1px solid #00ff8844;color:#00ff88;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
.tg-log{margin-top:14px;background:#111;border:1px solid #1f1f1f;border-radius:10px;padding:12px 16px}

.bot-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:#111;border-top:1px solid #00ff8822;padding:6px 0 10px;z-index:100}
.bot-nav-in{display:flex;justify-content:space-around}
.bnav{background:transparent;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 8px;color:#666;font-size:10px;font-family:'Courier New',monospace;position:relative}
.bnav.active{color:#00ff88}
.bnav svg{width:20px;height:20px}

.loading-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px}
.dot{width:8px;height:8px;border-radius:50%;background:#00ff88;animation:pulse 1s infinite}
@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}

@media(max-width:600px){
  .app{padding:.75rem .75rem 80px}
  .h-title{font-size:16px;letter-spacing:2px}
  .h-sub{display:none}
  .h-btns .gbtn span{display:none}
  .stat-grid{grid-template-columns:repeat(2,1fr)}
  .stat-val{font-size:20px}
  .tabs{display:none}
  .bot-nav{display:block}
  .i-grid{grid-template-columns:repeat(2,1fr)}
  .toolbar select{width:100%;flex:1 1 100%}
  .settings-wrap{max-width:100%}
  .alert-row{flex-direction:column;align-items:flex-start}
  .cat-grid{grid-template-columns:1fr 1fr}
}
@media(min-width:601px) and (max-width:900px){
  .stat-grid{grid-template-columns:repeat(2,1fr)}
  .i-grid{grid-template-columns:repeat(2,1fr)}
}

.gbtn{background:transparent;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-family:'Courier New',monospace}
.gbtn:disabled{opacity:.5;cursor:not-allowed}
.gbtn-g{color:#00ff88;border:1px solid #00ff88;box-shadow:0 0 8px #00ff8822}
.gbtn-o{color:#ff6600;border:1px solid #ff6600;box-shadow:0 0 8px #ff660022}
.gbtn-ghost{background:transparent;border:1px solid #1f1f1f;border-radius:7px;padding:5px 10px;cursor:pointer;font-size:12px;color:#666;font-family:'Courier New',monospace}
.gbtn-del{background:transparent;border:1px solid #ff444433;border-radius:7px;padding:5px 10px;cursor:pointer;font-size:12px;color:#ff4444;font-family:'Courier New',monospace}
.gbtn-sm{background:transparent;border-radius:6px;padding:4px 9px;cursor:pointer;font-size:11px;font-weight:600;font-family:'Courier New',monospace}
.gbtn-sm-g{color:#00ff88;border:1px solid #00ff8844}
.gbtn-sm-r{color:#ff4444;border:1px solid #ff444433}
.gbtn-sm-o{color:#ff6600;border:1px solid #ff660044}
.adj-btn{height:28px;min-width:28px;border-radius:6px;border:1px solid #1f1f1f;background:transparent;cursor:pointer;font-size:13px;padding:0 8px;font-weight:700;font-family:'Courier New',monospace}
.adj-p{color:#00ff88}.adj-m{color:#ff4444}
.adj-c{color:#666;font-size:11px;height:28px;border-radius:6px;border:1px solid #1f1f1f;background:transparent;cursor:pointer;padding:0 10px;font-family:'Courier New',monospace}
.save-btn{background:#003d1f;border:1px solid #00ff8844;border-radius:8px;padding:9px 18px;cursor:pointer;font-size:13px;color:#00ff88;font-weight:700;font-family:'Courier New',monospace}
.cancel-btn{background:transparent;border:1px solid #1f1f1f;border-radius:8px;padding:9px 18px;cursor:pointer;font-size:13px;color:#666;font-family:'Courier New',monospace}
.badge{border-radius:20px;padding:2px 10px;font-size:11px;font-weight:600;white-space:nowrap;border-width:1px;border-style:solid}
.bar-wrap{background:#222;border-radius:4px;height:5px;overflow:hidden}
.bar-fill{height:100%;border-radius:4px;transition:width .4s}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px}
.modal{background:#111;border-radius:14px;border:1px solid #00ff8844;padding:1.5rem;width:100%;max-width:480px;max-height:90vh;overflow-y:auto}
.modal-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.modal-title{font-size:17px;font-weight:600;color:#00ff88;letter-spacing:1px}
.modal-x{background:none;border:none;cursor:pointer;font-size:22px;color:#666;line-height:1}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.row-end{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
.toast{position:fixed;bottom:80px;right:16px;border-radius:10px;padding:12px 20px;font-size:13px;font-weight:700;z-index:9999;max-width:300px}
@media(min-width:601px){.toast{bottom:24px;right:24px}}
`;

function Badge({status}){const s=STATUS[status];return <span className="badge" style={{background:s.bg,color:s.text,borderColor:s.border}}>{s.label}</span>;}
function Bar({current,min,threshold}){const pct=Math.min(100,(current/min)*100);const color=current<=0?C.red:current<=threshold?"#ff6600":current<min?C.amber:C.green;return <div className="bar-wrap"><div className="bar-fill" style={{width:`${pct}%`,background:color,boxShadow:`0 0 6px ${color}88`}}/></div>;}
function GBtn({onClick,disabled,children,v="g"}){return <button onClick={onClick} disabled={disabled} className={`gbtn gbtn-${v}`}>{children}</button>;}
function Field({label,children}){return <div className="f-wrap"><label className="f-lbl">{label}</label>{children}</div>;}
function Modal({title,onClose,children}){return <div className="modal-bg"><div className="modal"><div className="modal-top"><span className="modal-title">{title}</span><button className="modal-x" onClick={onClose}>×</button></div>{children}</div></div>;}

export default function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({shop_name:"THALAM",bot_token:"",chat_id:""});
  const [settingsId, setSettingsId] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [toast, setToast] = useState(null);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [tgLog, setTgLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState("");
  const [editCatId, setEditCatId] = useState(null);
  const [editCatName, setEditCatName] = useState("");

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const [{data:pr},{data:ca},{data:se}] = await Promise.all([
        supabase.from("products").select("*").order("name"),
        supabase.from("categories").select("*").order("name"),
        supabase.from("settings").select("*").limit(1),
      ]);
      if(pr) setProducts(pr);
      if(ca) setCategories(ca);
      if(se?.length>0){setSettings(se[0]);setSettingsId(se[0].id);}
      setLoading(false);
    })();
  },[]);

  const showToast=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  // ── CATEGORY CRUD ──────────────────────────────
  const addCat = async () => {
    const name = newCat.trim();
    if(!name) return;
    if(categories.find(c=>c.name===name)){showToast("มีหมวดหมู่นี้แล้ว","err");return;}
    const {data} = await supabase.from("categories").insert({name}).select().single();
    if(data){setCategories(prev=>[...prev,data].sort((a,b)=>a.name.localeCompare(b.name,"th")));setNewCat("");showToast("เพิ่มสำเร็จ ✓");}
  };

  const saveCat = async (id) => {
    const name = editCatName.trim();
    if(!name) return;
    const oldName = categories.find(c=>c.id===id)?.name;
    const {data} = await supabase.from("categories").update({name}).eq("id",id).select().single();
    if(data){
      setCategories(prev=>prev.map(c=>c.id===id?data:c).sort((a,b)=>a.name.localeCompare(b.name,"th")));
      // อัปเดตสินค้าที่ใช้หมวดนี้
      if(oldName && oldName!==name){
        await supabase.from("products").update({category:name}).eq("category",oldName);
        setProducts(prev=>prev.map(p=>p.category===oldName?{...p,category:name}:p));
      }
      setEditCatId(null);setEditCatName("");showToast("แก้ไขสำเร็จ ✓");
    }
  };

  const delCat = async (id, name) => {
    const inUse = products.filter(p=>p.category===name).length;
    if(inUse>0){showToast(`ใช้งานอยู่ ${inUse} สินค้า ลบไม่ได้`,"err");return;}
    if(!window.confirm(`ลบหมวดหมู่ "${name}"?`)) return;
    await supabase.from("categories").delete().eq("id",id);
    setCategories(prev=>prev.filter(c=>c.id!==id));
    showToast("ลบสำเร็จ ✓");
  };

  // ── PRODUCT CRUD ───────────────────────────────
  const openAdd = () => {
    setForm({name:"",category:categories[0]?.name||"",unit:UNITS[0],current_stock:"",min_stock:"",alert_threshold:"",unit_price:""});
    setEditId(null);setModal("product");
  };
  const openEdit = p => {setForm({...p});setEditId(p.id);setModal("product");};

  const saveProduct = async () => {
    if(!form.name||form.current_stock===""||!form.min_stock||!form.alert_threshold||!form.unit_price){showToast("กรุณากรอกข้อมูลให้ครบ","err");return;}
    const payload={name:form.name,category:form.category,unit:form.unit,current_stock:+form.current_stock,min_stock:+form.min_stock,alert_threshold:+form.alert_threshold,unit_price:+form.unit_price};
    if(editId){
      const {data}=await supabase.from("products").update(payload).eq("id",editId).select().single();
      if(data){setProducts(prev=>prev.map(p=>p.id===editId?data:p));showToast("แก้ไขสำเร็จ ✓");}
    } else {
      const {data}=await supabase.from("products").insert(payload).select().single();
      if(data){setProducts(prev=>[...prev,data]);showToast("เพิ่มสินค้าสำเร็จ ✓");}
    }
    setModal(null);
  };

  const delProduct = async id => {
    if(!window.confirm("ต้องการลบสินค้านี้?")) return;
    await supabase.from("products").delete().eq("id",id);
    setProducts(prev=>prev.filter(p=>p.id!==id));
    showToast("ลบสำเร็จ ✓");
  };

  const adjStock = async (id, delta) => {
    const p = products.find(x=>x.id===id);
    const newStock = Math.max(0, p.current_stock+delta);
    const {data} = await supabase.from("products").update({current_stock:newStock}).eq("id",id).select().single();
    if(data) setProducts(prev=>prev.map(x=>x.id===id?data:x));
  };

  // ── SETTINGS ───────────────────────────────────
  const saveSettingsDB = useCallback(async s => {
    setSettings(s);
    if(settingsId) await supabase.from("settings").update(s).eq("id",settingsId);
    else {const {data}=await supabase.from("settings").insert(s).select().single();if(data)setSettingsId(data.id);}
  },[settingsId]);

  // ── TELEGRAM ───────────────────────────────────
  const sendTG = async (text, label="") => {
    if(!settings.bot_token||!settings.chat_id){showToast("กรุณาตั้งค่า Bot Token และ Chat ID ก่อน","err");return false;}
    try{
      const res=await fetch(`https://api.telegram.org/bot${settings.bot_token}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:settings.chat_id,text,parse_mode:"HTML"})});
      const d=await res.json();
      if(d.ok){setTgLog(p=>[{time:new Date().toLocaleTimeString("th-TH"),label,ok:true},...p.slice(0,9)]);return true;}
      showToast("Telegram: "+(d.description||"error"),"err");return false;
    } catch(e){showToast("Error: "+e.message,"err");return false;}
  };

  const buildAlertMsg = items => {
    let msg=`🏪 <b>${settings.shop_name||"THALAM"} STOCK ALERT</b>\n📅 ${new Date().toLocaleString("th-TH")}\n━━━━━━━━━━━━━━━━━━━\n⚠️ <b>รายการสต็อกต่ำกว่ากำหนด</b>\n\n`;
    let total=0;
    items.forEach(p=>{const need=p.min_stock-p.current_stock,cost=need*p.unit_price;total+=cost;msg+=`${p.current_stock<=0?"🔴":"🟠"} <b>${p.name}</b>\n   เหลือ: ${p.current_stock} | ขั้นต่ำ: ${p.min_stock} ${p.unit}\n   ต้องซื้อ: <b>${need} ${p.unit}</b> = <b>฿${cost.toLocaleString("th-TH")}</b>\n\n`;});
    return msg+`━━━━━━━━━━━━━━━━━━━\n💰 <b>รวมที่ต้องเตรียม: ฿${total.toLocaleString("th-TH")}</b>`;
  };

  const buildReportMsg = () => {
    let msg=`🏪 <b>${settings.shop_name||"THALAM"} STOCK REPORT</b>\n📅 ${new Date().toLocaleString("th-TH")}\n━━━━━━━━━━━━━━━━━━━\n\n`;
    const groups={};products.forEach(p=>{if(!groups[p.category])groups[p.category]=[];groups[p.category].push(p);});
    Object.entries(groups).forEach(([cat,items])=>{msg+=`📦 <b>${cat}</b>\n`;items.forEach(p=>{const st=statusOf(p);msg+=`  ${st==="ok"?"✅":st==="low"?"🟡":st==="alert"?"🟠":"🔴"} ${p.name}: ${p.current_stock}/${p.min_stock} ${p.unit}\n`;});msg+="\n";});
    return msg+`━━━━━━━━━━━━━━━━━━━\n📊 ปกติ ${products.filter(p=>statusOf(p)==="ok").length} | ต้องซื้อ ${products.filter(p=>statusOf(p)!=="ok").length} รายการ`;
  };

  const handleAlert=async()=>{setSending(true);const items=products.filter(p=>statusOf(p)!=="ok");if(!items.length){showToast("สต็อกทุกรายการปกติ ✓");setSending(false);return;}if(await sendTG(buildAlertMsg(items),"แจ้งเตือนสต็อกต่ำ"))showToast(`ส่งแจ้งเตือน ${items.length} รายการสำเร็จ ✓`);setSending(false);};
  const handleReport=async()=>{setSending(true);if(await sendTG(buildReportMsg(),"รายงานสต็อก"))showToast("ส่งรายงานสำเร็จ ✓");setSending(false);};

  const alerts=products.filter(p=>statusOf(p)!=="ok");
  const totalCost=alerts.reduce((s,p)=>s+Math.max(0,p.min_stock-p.current_stock)*p.unit_price,0);
  const filtered=products.filter(p=>{
    const mf=filter==="all"||statusOf(p)===filter||(filter==="alert"&&["alert","empty"].includes(statusOf(p)));
    return mf&&(p.name.toLowerCase().includes(search.toLowerCase())||p.category.toLowerCase().includes(search.toLowerCase()));
  });

  const IcoHome=()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  const IcoBox=()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
  const IcoCat=()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
  const IcoSet=()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;

  if(loading) return (
    <>
      <style>{css}</style>
      <div className="loading-screen">
        <div style={{color:C.green,fontSize:18,fontWeight:700,letterSpacing:3}}>THALAM STOCK</div>
        <div style={{display:"flex",gap:8}}>{[0,150,300].map(d=><div key={d} className="dot" style={{animationDelay:`${d}ms`}}/>)}</div>
        <div style={{fontSize:12,color:C.textMuted,letterSpacing:1}}>กำลังโหลดข้อมูล...</div>
      </div>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* Header */}
        <div className="header">
          <div className="header-left">
            <div className="logo-box" style={glow()}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div>
              <div className="h-title">THALAM STOCK</div>
              <div className="h-sub">ระบบจัดการสต็อกเครื่องดื่ม</div>
            </div>
          </div>
          <div className="h-btns">
            <GBtn onClick={handleAlert} disabled={sending} v="o">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              <span>แจ้งเตือน ({alerts.length})</span>
            </GBtn>
            <GBtn onClick={handleReport} disabled={sending} v="g">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/></svg>
              <span>รายงาน</span>
            </GBtn>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="tabs">
          {[["dashboard","แดชบอร์ด",0],["stock","จัดการสต็อก",alerts.length],["categories","หมวดหมู่",0],["settings","ตั้งค่า",0]].map(([id,label,cnt])=>(
            <button key={id} className={`tab-btn${tab===id?" active":""}`} onClick={()=>setTab(id)}>
              {label}{cnt>0&&<span className="red-badge">{cnt}</span>}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(
          <div>
            <div className="stat-grid">
              {[
                {label:"สินค้าทั้งหมด",value:products.length,color:C.green},
                {label:"ต้องสั่งซื้อ",value:alerts.length,color:alerts.length>0?"#ff6600":C.green},
                {label:"งบต้องเตรียม",value:`฿${totalCost.toLocaleString("th-TH")}`,color:totalCost>0?C.red:C.green,sm:true},
                {label:"สต็อกปกติ",value:products.filter(p=>statusOf(p)==="ok").length,color:C.green},
              ].map((c,i)=>(
                <div key={i} className="stat-card" style={{borderTop:`2px solid ${c.color}`}}>
                  <div className="stat-lbl">{c.label}</div>
                  <div className="stat-val" style={{fontSize:c.sm?16:undefined,color:c.color,textShadow:`0 0 15px ${c.color}66`}}>{c.value}</div>
                </div>
              ))}
            </div>
            {alerts.length>0&&(
              <div className="alert-box">
                <div className="alert-ttl">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  รายการที่ต้องสั่งซื้อ
                </div>
                {alerts.map(p=>{const need=Math.max(0,p.min_stock-p.current_stock);return(
                  <div key={p.id} className="alert-row">
                    <div><span style={{fontWeight:600,fontSize:14}}>{p.name}</span><span style={{fontSize:11,color:C.textMuted,marginLeft:8}}>{p.category}</span></div>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                      <span style={{fontSize:12,color:C.textMuted}}>{p.current_stock}/{p.min_stock} {p.unit}</span>
                      <span style={{fontSize:13,fontWeight:700,color:"#ff6600"}}>+{need} = ฿{(need*p.unit_price).toLocaleString("th-TH")}</span>
                    </div>
                  </div>
                );})}
                <div className="alert-total">รวม: ฿{totalCost.toLocaleString("th-TH")}</div>
              </div>
            )}
            <div className="box">
              <div className="sec-title">ภาพรวมสต็อก</div>
              {products.slice().sort((a,b)=>(a.current_stock/a.min_stock)-(b.current_stock/b.min_stock)).map(p=>(
                <div key={p.id} className="stock-row">
                  <div className="stock-row-top">
                    <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:14}}>{p.name}</span><Badge status={statusOf(p)}/></div>
                    <span style={{fontSize:11,color:C.textMuted}}>{p.current_stock}/{p.min_stock}</span>
                  </div>
                  <Bar current={p.current_stock} min={p.min_stock} threshold={p.alert_threshold}/>
                </div>
              ))}
            </div>
            {tgLog.length>0&&(
              <div className="tg-log">
                <div style={{fontSize:10,fontWeight:700,marginBottom:8,color:C.textMuted,letterSpacing:2,textTransform:"uppercase"}}>ประวัติการส่ง Telegram</div>
                {tgLog.map((l,i)=><div key={i} style={{fontSize:12,color:l.ok?C.green:C.red,display:"flex",gap:10,padding:"3px 0"}}><span style={{color:C.textDim}}>{l.time}</span><span>{l.ok?"✓":"✗"} {l.label}</span></div>)}
              </div>
            )}
          </div>
        )}

        {/* ── STOCK ── */}
        {tab==="stock"&&(
          <div>
            <div className="toolbar">
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาสินค้า..."/>
              <select value={filter} onChange={e=>setFilter(e.target.value)}>
                <option value="all">ทั้งหมด</option>
                <option value="alert">แจ้งเตือน/หมด</option>
                <option value="low">ใกล้หมด</option>
                <option value="ok">ปกติ</option>
              </select>
              <GBtn onClick={openAdd} v="g">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                เพิ่มสินค้า
              </GBtn>
            </div>
            {filtered.map(p=>{
              const st=statusOf(p),s=STATUS[st],need=Math.max(0,p.min_stock-p.current_stock);
              return(
                <div key={p.id} className="s-card" style={{border:`1px solid ${st!=="ok"?s.border:C.border}`,borderLeft:`3px solid ${s.text}`}}>
                  <div className="s-card-top">
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}><span className="s-name">{p.name}</span><Badge status={st}/></div>
                      <div className="s-meta">{p.category} · ฿{p.unit_price.toLocaleString("th-TH")}/{p.unit}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button className="gbtn-ghost" onClick={()=>openEdit(p)}>แก้ไข</button>
                      <button className="gbtn-del" onClick={()=>delProduct(p.id)}>ลบ</button>
                    </div>
                  </div>
                  <div className="i-grid">
                    <div className="i-cell">
                      <div className="i-lbl">สต็อกคงเหลือ</div>
                      <div className="i-val" style={{color:s.text,textShadow:`0 0 10px ${s.text}66`}}>{p.current_stock} <span className="i-unit">{p.unit}</span></div>
                    </div>
                    <div className="i-cell">
                      <div className="i-lbl">ขั้นต่ำ / แจ้งเตือน</div>
                      <div style={{fontWeight:600,fontSize:15}}>{p.min_stock} / {p.alert_threshold}</div>
                      <div className="i-sub" style={{color:C.textMuted}}>{p.unit}</div>
                    </div>
                    {need>0&&(
                      <div className="i-cell" style={{background:C.amberBg,border:`1px solid ${C.amber}33`}}>
                        <div className="i-lbl" style={{color:C.amber}}>ต้องซื้อเพิ่ม</div>
                        <div style={{fontWeight:700,fontSize:15,color:C.amber}}>{need} {p.unit}</div>
                        <div className="i-sub" style={{color:C.amber}}>฿{(need*p.unit_price).toLocaleString("th-TH")}</div>
                      </div>
                    )}
                  </div>
                  <Bar current={p.current_stock} min={p.min_stock} threshold={p.alert_threshold}/>
                  <div className="adj-row">
                    <span className="adj-lbl">ปรับสต็อก:</span>
                    <button className="adj-btn adj-m" onClick={()=>adjStock(p.id,-1)}>−</button>
                    <button className="adj-btn adj-p" onClick={()=>adjStock(p.id,1)}>+</button>
                    <button className="adj-btn adj-p" onClick={()=>adjStock(p.id,6)}>+6</button>
                    <button className="adj-btn adj-p" onClick={()=>adjStock(p.id,12)}>+12</button>
                    <button className="adj-c" onClick={()=>{const v=prompt(`ปรับสต็อก ${p.name} (ใส่ติดลบเพื่อลด)`);if(v&&!isNaN(+v))adjStock(p.id,+v);}}>กำหนดเอง</button>
                  </div>
                </div>
              );
            })}
            {filtered.length===0&&<div style={{textAlign:"center",color:C.textMuted,padding:"2rem",fontSize:14}}>ไม่พบสินค้า</div>}
          </div>
        )}

        {/* ── CATEGORIES ── */}
        {tab==="categories"&&(
          <div>
            <div className="box">
              <div className="sec-title">จัดการหมวดหมู่</div>
              {/* Add new */}
              <div className="cat-add-row">
                <input value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCat()} placeholder="ชื่อหมวดหมู่ใหม่..." />
                <GBtn onClick={addCat} v="g">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  เพิ่ม
                </GBtn>
              </div>
              {/* Grid */}
              <div className="cat-grid">
                {categories.map(c=>{
                  const cnt=products.filter(p=>p.category===c.name).length;
                  const isEditing=editCatId===c.id;
                  return(
                    <div key={c.id} className="cat-card" style={{borderLeft:`3px solid ${C.borderGreen}`}}>
                      <div className="cat-card-top">
                        {!isEditing?(
                          <>
                            <span className="cat-name">{c.name}</span>
                            <span className="cat-count">{cnt} รายการ</span>
                          </>
                        ):(
                          <span className="cat-name" style={{color:C.green}}>{c.name}</span>
                        )}
                      </div>
                      {!isEditing?(
                        <div style={{display:"flex",gap:6,marginTop:10}}>
                          <button className="gbtn-sm gbtn-sm-g" style={{flex:1}} onClick={()=>{setEditCatId(c.id);setEditCatName(c.name);}}>แก้ไข</button>
                          <button className="gbtn-sm gbtn-sm-r" style={{flex:1}} onClick={()=>delCat(c.id,c.name)}>ลบ</button>
                        </div>
                      ):(
                        <>
                          <input className="cat-edit-input" value={editCatName} onChange={e=>setEditCatName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveCat(c.id);if(e.key==="Escape"){setEditCatId(null);setEditCatName("");}}} autoFocus/>
                          <div className="cat-edit-btns">
                            <button className="gbtn-sm gbtn-sm-g" style={{flex:1}} onClick={()=>saveCat(c.id)}>บันทึก</button>
                            <button className="gbtn-sm gbtn-sm-r" style={{flex:1}} onClick={()=>{setEditCatId(null);setEditCatName("");}}>ยกเลิก</button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {categories.length===0&&<div style={{textAlign:"center",color:C.textMuted,padding:"1rem",fontSize:14}}>ยังไม่มีหมวดหมู่</div>}
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab==="settings"&&(
          <div className="settings-wrap">
            <div className="settings-box" style={glow()}>
              <div style={{fontSize:12,fontWeight:700,marginBottom:16,color:C.green,letterSpacing:2,textTransform:"uppercase",display:"flex",alignItems:"center",gap:8}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#229ED9" strokeWidth="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                ตั้งค่า Telegram Bot
              </div>
              <Field label="ชื่อร้าน"><input value={settings.shop_name} onChange={e=>saveSettingsDB({...settings,shop_name:e.target.value})} placeholder="THALAM"/></Field>
              <Field label="Bot Token"><input type="password" value={settings.bot_token} onChange={e=>saveSettingsDB({...settings,bot_token:e.target.value})} placeholder="xxxxxxxxxx:AAAA..."/></Field>
              <Field label="Chat ID"><input value={settings.chat_id} onChange={e=>saveSettingsDB({...settings,chat_id:e.target.value})} placeholder="-100xxxxxxxxxx หรือ @username"/></Field>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <GBtn onClick={handleAlert} disabled={sending} v="o">ทดสอบแจ้งเตือน</GBtn>
                <GBtn onClick={handleReport} disabled={sending} v="g">ทดสอบรายงาน</GBtn>
              </div>
            </div>
            <div className="box">
              <div className="sec-title">วิธีตั้งค่า Telegram</div>
              {[["1","สร้างบอทกับ @BotFather แล้วรับ Bot Token"],["2","เพิ่มบอทเข้ากลุ่มหรือแชทที่ต้องการรับแจ้งเตือน"],["3","เปิด https://api.telegram.org/bot{TOKEN}/getUpdates เพื่อดู Chat ID"],["4","กรอก Bot Token และ Chat ID แล้วกดทดสอบ"]].map(([n,t])=>(
                <div key={n} className="step-row">
                  <div className="step-n">{n}</div>
                  <p style={{margin:0,fontSize:13,color:C.textMuted,lineHeight:1.6}}>{t}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav mobile */}
      <nav className="bot-nav">
        <div className="bot-nav-in">
          {[["dashboard","หน้าหลัก",<IcoHome/>],["stock","สต็อก",<IcoBox/>],["categories","หมวดหมู่",<IcoCat/>],["settings","ตั้งค่า",<IcoSet/>]].map(([id,label,icon])=>(
            <button key={id} className={`bnav${tab===id?" active":""}`} onClick={()=>setTab(id)}>
              {icon}{label}
              {id==="stock"&&alerts.length>0&&<span className="red-badge" style={{position:"absolute",marginTop:-28,marginLeft:12,fontSize:9,padding:"0 4px"}}>{alerts.length}</span>}
            </button>
          ))}
        </div>
      </nav>

      {/* Modal - Product */}
      {modal==="product"&&(
        <Modal title={editId?"แก้ไขสินค้า":"เพิ่มสินค้าใหม่"} onClose={()=>setModal(null)}>
          <Field label="ชื่อสินค้า"><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} placeholder="ชื่อเครื่องดื่ม"/></Field>
          <div className="grid2">
            <Field label="หมวดหมู่">
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                {categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="หน่วย">
              <select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
                {UNITS.map(u=><option key={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid2">
            <Field label="สต็อกคงเหลือ"><input type="number" min="0" value={form.current_stock} onChange={e=>setForm({...form,current_stock:e.target.value})} placeholder="0"/></Field>
            <Field label="ขั้นต่ำที่ต้องมี"><input type="number" min="1" value={form.min_stock} onChange={e=>setForm({...form,min_stock:e.target.value})} placeholder="24"/></Field>
          </div>
          <div className="grid2">
            <Field label="แจ้งเตือนเมื่อต่ำกว่า"><input type="number" min="1" value={form.alert_threshold} onChange={e=>setForm({...form,alert_threshold:e.target.value})} placeholder="12"/></Field>
            <Field label="ราคา/หน่วย (บาท)"><input type="number" min="0" value={form.unit_price} onChange={e=>setForm({...form,unit_price:e.target.value})} placeholder="65"/></Field>
          </div>
          <div className="row-end">
            <button className="cancel-btn" onClick={()=>setModal(null)}>ยกเลิก</button>
            <button className="save-btn" onClick={saveProduct}>{editId?"บันทึก":"เพิ่มสินค้า"}</button>
          </div>
        </Modal>
      )}

      {toast&&(
        <div className="toast" style={{background:toast.type==="err"?C.redBg:C.greenDark,border:`1px solid ${toast.type==="err"?C.red:C.green}`,color:toast.type==="err"?C.red:C.green,...glow(toast.type==="err"?C.red:C.green)}}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
