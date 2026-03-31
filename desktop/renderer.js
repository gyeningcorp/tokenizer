// ═══════════════════════════════════════════════════
// TOKENIZER DESKTOP v1.1 — renderer.js
// Single message + full conversation context tracking
// ═══════════════════════════════════════════════════

// ── TOKEN ENGINE ─────────────────────────────────────

const SINGLE_TOKENS = new Set([" the"," a"," an"," is"," are"," was"," were"," be"," been"," have"," has"," had"," do"," does"," did"," will"," would"," could"," should"," may"," might"," must"," can"," not"," no"," yes"," and"," or"," but"," if"," then"," else"," when"," where"," how"," what"," which"," who"," why"," this"," that"," in"," on"," at"," to"," for"," with"," from"," by"," of"," as"," into"," through"," about"," it"," its"," I"," you"," he"," she"," we"," they"," me"," him"," her"," us"," them"," my"," your"," his"," our"," their"," also"," just"," very"," most"," more"," some"," any"," all"," new"," good"]);
const WRE = /'s|'t|'re|'ve|'m|'ll|'d| ?\w+| ?[^\s\w]+|\s+/g;
const PU  = new Set(".,!?;:'\"-/\\@#$%&*+=<>|()[]{}~`^_");

const SCALE = {
  cl100k_base:1.00, o200k_base:0.87, claude:1.05, gemini:0.90,
  llama3:0.97, mistral:0.95, deepseek:1.10, grok:0.92,
};
const PRICING_INPUT = {
  cl100k_base:10.00, o200k_base:2.50, claude:3.00, gemini:1.25,
  llama3:0.59, mistral:0.30, deepseek:0.14, grok:5.00,
};
const CONTEXT_WINDOW = {
  cl100k_base:128000, o200k_base:128000, claude:200000,
  gemini:1000000, llama3:128000, mistral:128000, deepseek:128000, grok:131072, default:128000,
};
const ENERGY_WH_PER_1M = {
  o200k_base:4000, cl100k_base:8000, claude:3500, gemini:2000,
  llama3:5000, mistral:3000, deepseek:2500, grok:4500,
};
const GRID_INFO = [
  { key:"o200k_base", label:"GPT-4o",   color:"#10b981" },
  { key:"claude",     label:"Claude",   color:"#d97706" },
  { key:"gemini",     label:"Gemini",   color:"#8b5cf6" },
  { key:"llama3",     label:"LLaMA",    color:"#fbbf24" },
  { key:"deepseek",   label:"DeepSeek", color:"#4f8ef7" },
  { key:"mistral",    label:"Mistral",  color:"#f97316" },
];

function estCl100k(t) {
  if (!t) return 0;
  let n = 0;
  for (const c of (t.match(WRE)||[])) {
    if (SINGLE_TOKENS.has(c)) { n++; continue; }
    const s = c.trim();
    if (!s) { n+=(c.match(/\n/g)||[]).length; continue; }
    if (s.length===1&&PU.has(s)) { n++; continue; }
    const l=s.length;
    if(l<=5) n++; else if(l<=10) n+=/^[a-z]+$/.test(s)?1:2;
    else if(l<=15) n+=2; else if(l<=20) n+=3; else n+=Math.ceil(l/4);
  }
  return Math.max(t.trim()?1:0,n);
}

function countAll(t) {
  const base=estCl100k(t), r={};
  for(const[k,s]of Object.entries(SCALE)) r[k]=Math.max(t.trim()?1:0,Math.round(base*s));
  return r;
}

function tokForModel(t,model) { return countAll(t)[model]||0; }
function costForTok(n,model)  { return(n/1_000_000)*(PRICING_INPUT[model]||2.5); }

// ── SYLLABLE ENGINE ───────────────────────────────────

function countSyllables(word) {
  if(!word) return 0;
  word=word.toLowerCase().replace(/[^a-z]/g,"");
  if(!word) return 0;
  if(word.length<=3) return 1;
  word=word.replace(/e$/,"");
  const m=word.match(/[aeiouy]+/g);
  return Math.max(1,m?m.length:1);
}
function estimateWordTokens(word) {
  if(!word||!word.trim()) return 0;
  const w=word.trim(),l=w.length;
  if(l<=2) return 1;
  if(l<=4&&/^[a-z]+$/i.test(w)) return 1;
  if(/^[.,!?;:'"()\[\]{}\-]+$/.test(w)) return 1;
  if(/^\d+$/.test(w)) return Math.ceil(l/3);
  if(/[A-Z]/.test(w)&&/[a-z]/.test(w)) return Math.max(1,Math.ceil(l/3));
  const sy=countSyllables(w);
  if(sy===1&&l<=8) return 1; if(sy===2&&l<=10) return 2;
  if(sy===3) return 2; if(sy>=4) return Math.ceil(sy*0.8);
  return Math.max(1,Math.ceil(l/4));
}
function chipClass(toks,isPunct) {
  if(isPunct) return "tp";
  return["t1","t1","t2","t3","t4"][Math.min(toks,4)];
}

// ── ENERGY ────────────────────────────────────────────

const CO2_PER_KWH=0.386, SEARCH_WH=0.3;
function calcEnergy(n,model){
  const wh=(n/1_000_000)*(ENERGY_WH_PER_1M[model]||4000);
  return{wh,co2g:(wh/1000)*CO2_PER_KWH*1000,searches:wh/SEARCH_WH};
}
function fmtWh(wh){
  if(wh<0.001)return(wh*1e6).toFixed(4)+" μWh";
  if(wh<1)return(wh*1000).toFixed(3)+" mWh";
  if(wh<1000)return wh.toFixed(3)+" Wh";
  return(wh/1000).toFixed(4)+" kWh";
}
function fmtCo2(g){
  if(g<0.001)return(g*1e6).toFixed(2)+" μg";
  if(g<1)return(g*1000).toFixed(3)+" mg";
  if(g<1000)return g.toFixed(3)+" g";
  return(g/1000).toFixed(4)+" kg";
}
function fmtEquiv(wh,s){
  if(s<0.01)return"< 1/100 Google search";
  if(s<1){const frac=Math.round(1/s);return`1/${frac} of a Google search`;}
  if(s<10)return`≈ ${s.toFixed(1)} Google searches`;
  const sec=(wh/10)*3600;
  if(sec<60)return`LED bulb for ${sec.toFixed(0)}s`;
  if(sec<3600)return`LED bulb for ${(sec/60).toFixed(0)}min`;
  return`LED bulb for ${(sec/3600).toFixed(1)}hr`;
}

// ── STATE ─────────────────────────────────────────────

let currentModel = "o200k_base";
let currentMode  = "single";   // "single" | "convo"
let debTimer     = null;
let msgIdCounter = 0;

// Conversation: array of {id, role, text}
let messages = [];

// ── GRID ─────────────────────────────────────────────

function buildGrid() {
  const g=document.getElementById("model-grid");
  if(!g) return;
  g.innerHTML=GRID_INFO.map(gi=>`
    <div class="grid-item${gi.key===currentModel?" active":""}" id="gi-${gi.key}">
      <div class="grid-name">${gi.label}</div>
      <div class="grid-val" id="gv-${gi.key}" style="color:${gi.color}">0</div>
      <div class="grid-cost" id="gc-${gi.key}">—</div>
      <div class="grid-bar"><div class="grid-bar-fill" id="gb-${gi.key}" style="background:${gi.color};width:0%"></div></div>
    </div>`).join("");
}

// ── CONTEXT BAR UPDATE ────────────────────────────────

function updateCtxBar(usedTokens) {
  const max=CONTEXT_WINDOW[currentModel]||128000;
  const pct=Math.min(100,(usedTokens/max)*100);
  const fill=document.getElementById("ctx-fill");
  if(fill){fill.style.width=pct+"%";fill.style.background=pct<60?"#10b981":pct<85?"#f59e0b":"#ef4444";}
  const cu=document.getElementById("ctx-used");
  const cp=document.getElementById("ctx-pct");
  const cm=document.getElementById("ctx-max");
  const cr=document.getElementById("ctx-remaining");
  if(cu) cu.textContent=usedTokens>=1000?(usedTokens/1000).toFixed(1)+"k":usedTokens;
  if(cp) cp.textContent=pct.toFixed(1)+"%";
  if(cm) cm.textContent=(max/1000).toFixed(0)+"k";
  if(cr) cr.textContent=((max-usedTokens)/1000).toFixed(0)+"k remaining";
}

// ── GRID UPDATE ───────────────────────────────────────

function updateGrid(counts) {
  const mx=Math.max(...Object.values(counts),1);
  for(const gi of GRID_INFO){
    const v=counts[gi.key]||0;
    const c=costForTok(v,gi.key);
    const ve=document.getElementById(`gv-${gi.key}`);
    const gc=document.getElementById(`gc-${gi.key}`);
    const gb=document.getElementById(`gb-${gi.key}`);
    const gItem=document.getElementById(`gi-${gi.key}`);
    if(ve) ve.textContent=v.toLocaleString();
    if(gc) gc.textContent=v>0?`$${c.toFixed(5)}`:"—";
    if(gb) gb.style.width=(v/mx*100)+"%";
    if(gItem) gItem.classList.toggle("active",gi.key===currentModel);
  }
}

// ── CHIPS ─────────────────────────────────────────────

function renderChips(text) {
  const el=document.getElementById("chips");
  if(!el) return;
  if(!text||!text.trim()){
    el.innerHTML='<div class="chips-empty">Start typing to see token breakdown…</div>';
    const cc=document.getElementById("chips-count"); if(cc) cc.textContent="";
    return;
  }
  const chunks=(text.match(/\S+|\s+/g)||[]).filter(c=>c.trim());
  const cc=document.getElementById("chips-count");
  if(cc) cc.textContent=`${chunks.length} words`;
  el.innerHTML=chunks.slice(0,150).map(chunk=>{
    const toks=estimateWordTokens(chunk);
    const sy=countSyllables(chunk);
    const isPunct=/^[.,!?;:'"()\[\]{}\-]+$/.test(chunk);
    const cls=chipClass(toks,isPunct);
    const safe=chunk.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
    return`<div class="chip ${cls}" title="${toks} token${toks!==1?"s":""} · ${sy} syllable${sy!==1?"s":""}">
      <span class="chip-word">${safe}</span>
      <span class="chip-meta">${sy}syl·${toks}tok</span>
    </div>`;
  }).join("")+(chunks.length>150?`<div class="chips-empty">+${chunks.length-150} more…</div>`:"");
}

// ── SINGLE MODE UPDATE ────────────────────────────────

function updateSingle(text) {
  const counts=countAll(text);
  const n=counts[currentModel]||0;
  const isFree=currentModel==="llama3"||!PRICING_INPUT[currentModel];

  const mn=document.getElementById("main-num");
  if(mn) mn.textContent=n.toLocaleString();
  const mc=document.getElementById("main-cost");
  if(mc) mc.textContent=isFree?"$0.00 (local/free)":`$${costForTok(n,currentModel).toFixed(6)} input cost`;

  const cc=document.getElementById("char-count");
  if(cc) cc.textContent=`${text.length.toLocaleString()} chars`;

  updateCtxBar(n);
  updateGrid(counts);

  // Stats
  const sc=document.getElementById("s-chars");
  const sw=document.getElementById("s-words");
  const sr=document.getElementById("s-ratio");
  const sch=document.getElementById("s-cheapest");
  if(sc) sc.textContent=text.length.toLocaleString();
  if(sw) sw.textContent=text.trim()?text.trim().split(/\s+/).length.toLocaleString():"0";
  if(sr) sr.textContent=n>0?(text.length/n).toFixed(1):"—";
  if(sch&&n>0){
    const ch=GRID_INFO.reduce((b,gi)=>{const c=costForTok(counts[gi.key]||0,gi.key);return c<b.c?{gi,c}:b;},{gi:null,c:Infinity});
    if(ch.gi){sch.textContent=ch.gi.label;sch.style.color=ch.gi.color;}
  }

  // Energy
  if(n>0){
    const eng=calcEnergy(n,currentModel);
    const ew=document.getElementById("e-wh");
    const ec=document.getElementById("e-co2");
    const ee=document.getElementById("e-equiv");
    if(ew) ew.textContent=fmtWh(eng.wh);
    if(ec) ec.textContent=fmtCo2(eng.co2g);
    if(ee) ee.textContent=fmtEquiv(eng.wh,eng.searches);
  }

  renderChips(text);
  setStatus(n>0?`${n.toLocaleString()} tokens · ${text.length.toLocaleString()} chars`:"Ready — paste or type to begin", n>0?"#a78bfa":"#10b981");
}

// ── CONVERSATION MODE ─────────────────────────────────

function addMessage(role, text="") {
  const id=++msgIdCounter;
  messages.push({id,role,text});
  renderConvoMessages();
  // Focus the new textarea
  setTimeout(()=>{
    const ta=document.getElementById(`msg-ta-${id}`);
    if(ta) ta.focus();
  },50);
}

function removeMessage(id) {
  messages=messages.filter(m=>m.id!==id);
  renderConvoMessages();
  updateConvoStats();
}

function clearConvo() {
  messages=[];
  renderConvoMessages();
  updateConvoStats();
}

function onMsgInput(id, text) {
  const msg=messages.find(m=>m.id===id);
  if(msg) msg.text=text;
  clearTimeout(debTimer);
  debTimer=setTimeout(()=>updateConvoStats(),120);
}

function renderConvoMessages() {
  const container=document.getElementById("convo-messages");
  if(!container) return;
  if(!messages.length){
    container.innerHTML=`<div style="color:var(--muted);font-size:12px;text-align:center;padding:30px 0;opacity:0.6">
      No messages yet.<br>Click + User / + Assistant below to start building your conversation.
    </div>`;
    return;
  }
  container.innerHTML=messages.map(msg=>{
    const n=tokForModel(msg.text,currentModel);
    const cost=costForTok(n,currentModel);
    const roleName={system:"System",user:"User",assistant:"Assistant"}[msg.role]||msg.role;
    const placeholder={
      system:"System prompt — instructions, persona, context…",
      user:"User message…",
      assistant:"Assistant response…",
    }[msg.role]||"Message…";
    const safeText=msg.text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    return`<div class="msg-item role-${msg.role}" id="msg-${msg.id}">
      <div class="msg-header">
        <span class="role-badge">${roleName}</span>
        <span class="msg-tok-count"><strong>${n.toLocaleString()}</strong> tok</span>
        <span class="msg-cost">$${cost.toFixed(5)}</span>
        <button class="msg-delete" onclick="removeMessage(${msg.id})" title="Remove">✕</button>
      </div>
      <div class="msg-body">
        <textarea
          id="msg-ta-${msg.id}"
          placeholder="${placeholder}"
          oninput="onMsgInput(${msg.id},this.value)"
          style="height:${Math.max(60,Math.min(200,24+msg.text.split('\n').length*20))}px"
        >${safeText}</textarea>
      </div>
    </div>`;
  }).join("");
}

function updateConvoStats() {
  // Recalculate all token counts
  let totalTok=0, totalCost=0;
  const byRole={system:0,user:0,assistant:0};

  for(const msg of messages){
    const n=tokForModel(msg.text,currentModel);
    totalTok+=n;
    totalCost+=costForTok(n,currentModel);
    if(byRole[msg.role]!==undefined) byRole[msg.role]+=n;
  }

  // Update convo summary panel
  const tn=document.getElementById("convo-total-num");
  const tc=document.getElementById("convo-total-cost");
  const tm=document.getElementById("convo-msgs-count");
  if(tn) tn.textContent=totalTok.toLocaleString();
  if(tc) tc.textContent=`$${totalCost.toFixed(6)}`;
  if(tm) tm.textContent=`${messages.length} message${messages.length!==1?"s":""}`;
  for(const[role,tok]of Object.entries(byRole)){
    const el=document.getElementById(`cr-${role}`);
    if(el) el.textContent=tok.toLocaleString();
  }

  // Context bar uses total conversation
  updateCtxBar(totalTok);

  // Grid uses total conversation
  const totalCounts={};
  for(const[k]of Object.entries(SCALE)){
    totalCounts[k]=messages.reduce((s,m)=>s+(countAll(m.text)[k]||0),0);
  }
  updateGrid(totalCounts);

  // Stats
  const totalChars=messages.reduce((s,m)=>s+m.text.length,0);
  const totalWords=messages.reduce((s,m)=>s+(m.text.trim()?m.text.trim().split(/\s+/).length:0),0);
  const sc=document.getElementById("s-chars");
  const sw=document.getElementById("s-words");
  const sr=document.getElementById("s-ratio");
  if(sc) sc.textContent=totalChars.toLocaleString();
  if(sw) sw.textContent=totalWords.toLocaleString();
  if(sr) sr.textContent=totalTok>0?(totalChars/totalTok).toFixed(1):"—";

  // Energy
  if(totalTok>0){
    const eng=calcEnergy(totalTok,currentModel);
    const ew=document.getElementById("e-wh");
    const ec=document.getElementById("e-co2");
    const ee=document.getElementById("e-equiv");
    if(ew) ew.textContent=fmtWh(eng.wh);
    if(ec) ec.textContent=fmtCo2(eng.co2g);
    if(ee) ee.textContent=fmtEquiv(eng.wh,eng.searches);
  }

  // Char count in header
  const chc=document.getElementById("char-count");
  if(chc) chc.textContent=`${totalChars.toLocaleString()} chars`;

  // Re-render message headers with updated token counts
  renderConvoMessages();

  setStatus(
    totalTok>0?`${totalTok.toLocaleString()} total tokens · ${messages.length} messages`:"Conversation mode — add messages below",
    totalTok>0?"#a78bfa":"#10b981"
  );
}

// ── MODE SWITCH ───────────────────────────────────────

function setMode(mode) {
  currentMode=mode;
  const single=document.getElementById("mode-single");
  const convo=document.getElementById("mode-convo");
  const singleSummary=document.getElementById("single-summary");
  const convoSummary=document.getElementById("convo-summary");
  const btnS=document.getElementById("btn-single");
  const btnC=document.getElementById("btn-convo");

  if(mode==="single"){
    single.style.display="flex"; convo.style.display="none";
    singleSummary.style.display=""; convoSummary.style.display="none";
    btnS.classList.add("active"); btnC.classList.remove("active");
    const text=document.getElementById("input").value;
    if(text) updateSingle(text); else setStatus("Ready — paste or type to begin","#10b981");
  } else {
    single.style.display="none"; convo.style.display="flex";
    singleSummary.style.display="none"; convoSummary.style.display="";
    btnS.classList.remove("active"); btnC.classList.add("active");
    if(!messages.length) addMessage("system");
    else updateConvoStats();
  }
}

// ── TAB SWITCH ────────────────────────────────────────

function switchTab(name) {
  document.getElementById("tab-counter").style.display=name==="counter"?"":"none";
  document.getElementById("tab-local").style.display=name==="local"?"":"none";
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===name));
}

// ── MODEL SELECT ──────────────────────────────────────

function onModelChange() {
  currentModel=document.getElementById("model-select").value;
  if(currentMode==="single"){
    const text=document.getElementById("input").value;
    if(text) updateSingle(text);
  } else {
    updateConvoStats();
  }
}

// ── LOCAL MODEL ───────────────────────────────────────

function applyPreset(url,model){
  document.getElementById("local-url").value=url;
  document.getElementById("local-model").value=model;
}

async function testConnection(){
  const url=document.getElementById("local-url").value.trim();
  const model=document.getElementById("local-model").value.trim();
  const statusEl=document.getElementById("conn-status");
  statusEl.style.display="block"; statusEl.className="conn-status"; statusEl.textContent="Testing…";
  const result=await window.tokenizerAPI.testConnection({url,model});
  statusEl.className="conn-status "+(result.ok?"conn-ok":"conn-fail");
  statusEl.textContent=result.message;
  if(result.ok&&result.models&&result.models.length>0){
    const wrap=document.getElementById("model-list-wrap");
    const sel=document.getElementById("model-list");
    sel.innerHTML=result.models.map(m=>`<option value="${m}">${m}</option>`).join("");
    wrap.style.display="";
    document.getElementById("local-model").value=result.models[0];
  }
}

async function countLocal(){
  const url=document.getElementById("local-url").value.trim();
  const model=document.getElementById("local-model").value.trim();

  // In convo mode, count the full conversation text
  let text;
  if(currentMode==="convo"){
    text=messages.map(m=>`${m.role}: ${m.text}`).join("\n\n");
  } else {
    text=document.getElementById("input").value;
  }

  if(!text.trim()){document.getElementById("local-tok-badge").textContent="← type something first";return;}
  document.getElementById("local-tok-num").textContent="…";
  document.getElementById("local-tok-badge").textContent="counting…";
  const result=await window.tokenizerAPI.countTokensLocal({url,model,text});
  if(result.ok&&result.tokens!==null){
    document.getElementById("local-tok-num").textContent=result.tokens.toLocaleString();
    document.getElementById("local-tok-badge").textContent=`exact · ${model}`;
  } else {
    const est=estCl100k(text);
    document.getElementById("local-tok-num").textContent=est.toLocaleString();
    document.getElementById("local-tok-badge").textContent="estimated (API unavailable)";
  }
}

// ── STATUS ────────────────────────────────────────────

function setStatus(text,color){
  const st=document.getElementById("status-text");
  const dot=document.getElementById("status-dot");
  if(st) st.textContent=text;
  if(dot) dot.style.background=color||"#10b981";
}

// ── INPUT HANDLER ─────────────────────────────────────

document.getElementById("input").addEventListener("input",(e)=>{
  clearTimeout(debTimer);
  debTimer=setTimeout(()=>updateSingle(e.target.value),120);
});

// ── EXTENSION BRIDGE (live data from Chrome extension) ────────────

let bridgeSession = { inputTokens: 0, outputTokens: 0, cost: 0, calls: 0 };

if (window.tokenizerAPI && window.tokenizerAPI.onBridgeTokens) {
  window.tokenizerAPI.onBridgeTokens((data) => {
    bridgeSession.inputTokens += data.inputTokens || 0;
    bridgeSession.outputTokens += data.outputTokens || 0;
    bridgeSession.calls += 1;

    const inCost = (data.inputTokens / 1_000_000) * (PRICING_INPUT[currentModel] || 1);
    const outCost = (data.outputTokens / 1_000_000) * (PRICING_OUTPUT[currentModel] || 3);
    bridgeSession.cost += inCost + outCost;

    // Update live panel
    const liveIn = document.getElementById("live-input");
    const liveOut = document.getElementById("live-output");
    const liveCost = document.getElementById("live-cost");
    const liveCalls = document.getElementById("live-calls");
    const liveDot = document.getElementById("live-dot");

    if (liveIn) liveIn.textContent = bridgeSession.inputTokens.toLocaleString();
    if (liveOut) liveOut.textContent = bridgeSession.outputTokens.toLocaleString();
    if (liveCost) liveCost.textContent = "$" + bridgeSession.cost.toFixed(6);
    if (liveCalls) liveCalls.textContent = bridgeSession.calls + " call" + (bridgeSession.calls !== 1 ? "s" : "");
    if (liveDot) { liveDot.style.background = "#10b981"; setTimeout(() => liveDot.style.background = "#6ee7b7", 1000); }

    // Update energy for total bridge tokens
    const totalBridgeTok = bridgeSession.inputTokens + bridgeSession.outputTokens;
    if (totalBridgeTok > 0) {
      const eng = calcEnergy(totalBridgeTok, currentModel);
      const liveWh = document.getElementById("live-wh");
      const liveCo2 = document.getElementById("live-co2");
      if (liveWh) liveWh.textContent = fmtWh(eng.wh);
      if (liveCo2) liveCo2.textContent = fmtCo2(eng.co2g);
    }

    setStatus(`🔴 LIVE · ${bridgeSession.calls} API call${bridgeSession.calls!==1?"s":""} · ${(bridgeSession.inputTokens+bridgeSession.outputTokens).toLocaleString()} tokens`, "#ef4444");
  });
}

// ── INIT ──────────────────────────────────────────────

buildGrid();
setStatus("Ready — paste or type to begin","#10b981");
