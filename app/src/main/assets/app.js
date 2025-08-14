// Auto PIN (123456) + encrypted storage (AES-GCM), no prompt
const FIXED_PIN = '123456';
const SEC_KEY = 'mv3pro_secure_v2';
const SEC_META = 'mv3pro_meta_v2';
let state = { hours: [], forms: [] };

function b64e(arr){return btoa(String.fromCharCode(...new Uint8Array(arr)));}
function b64d(str){return Uint8Array.from(atob(str), c=>c.charCodeAt(0));}

async function deriveKey(pin, salt){
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations:120000, hash:'SHA-256' }, keyMaterial, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
}
async function secureSave(){
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  let meta = localStorage.getItem(SEC_META);
  let salt;
  if(!meta){ salt = crypto.getRandomValues(new Uint8Array(16)); localStorage.setItem(SEC_META, b64e(salt)); }
  else { salt = b64d(meta); }
  const key = await deriveKey(FIXED_PIN, salt);
  const data = enc.encode(JSON.stringify(state));
  const cipher = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, data);
  const payload = JSON.stringify({iv: b64e(iv), ct: b64e(cipher)});
  localStorage.setItem(SEC_KEY, payload);
}
async function secureLoad(){
  const payload = localStorage.getItem(SEC_KEY);
  const meta = localStorage.getItem(SEC_META);
  if(!payload || !meta){ await secureSave(); return; }
  try{
    const {iv, ct} = JSON.parse(payload);
    const key = await deriveKey(FIXED_PIN, b64d(meta));
    const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv: b64d(iv)}, key, b64d(ct));
    state = JSON.parse(new TextDecoder().decode(plain));
  }catch(e){ await secureSave(); }
}

function uid(){ return Math.random().toString(36).slice(2,10); }
function parseHM(s){ const [h,m]=s.split(':').map(Number); return h*60+m; }

function setupTabs(){
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabs = document.querySelectorAll('.tab');
  tabButtons.forEach(btn => btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  }));
  tabButtons[0].classList.add('active');
}

function setupHours(){
  const form = document.getElementById('hoursForm');
  const body = document.querySelector('#hoursTable tbody');
  const total = document.getElementById('hoursTotal');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('hDate').value;
    const start = document.getElementById('hStart').value;
    const end = document.getElementById('hEnd').value;
    const br = parseInt(document.getElementById('hBreak').value || '0', 10);
    const note = document.getElementById('hNote').value.trim();
    if(!date || !start || !end) return;
    let minutes = parseHM(end) - parseHM(start) - br;
    if(minutes < 0) minutes = 0;
    const entry = { id: uid(), date, start, end, breakMin: br, note, totalHours: +(minutes/60).toFixed(2) };
    state.hours.push(entry);
    await secureSave();
    renderHours(body, total);
    form.reset();
  });

  body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-id]'); if(!btn) return;
    const id = btn.getAttribute('data-id');
    const idx = state.hours.findIndex(x=>x.id===id);
    if(idx>=0){ state.hours.splice(idx,1); await secureSave(); renderHours(body, total); }
  });

  renderHours(body, total);
}
function renderHours(body, total){
  body.innerHTML='';
  const byMonth = {};
  state.hours.sort((a,b)=> (a.date<b.date?-1:1)).forEach(h => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${h.date}</td><td>${h.start}</td><td>${h.end}</td><td>${h.breakMin} min</td><td>${h.totalHours.toFixed(2)} h</td><td>${h.note||''}</td><td><button data-id="${h.id}" class="danger">Supprimer</button></td>`;
    body.appendChild(tr);
    const ym = h.date.slice(0,7); byMonth[ym] = (byMonth[ym]||0) + h.totalHours;
  });
  const today = new Date(); const td = today.toISOString().slice(0,10); const ymNow = td.slice(0,7);
  const totalToday = state.hours.filter(h=>h.date===td).reduce((s,h)=>s+h.totalHours,0);
  const totalMonth = +(byMonth[ymNow]||0).toFixed(2);
  total.textContent = `Total: ${totalToday.toFixed(2)} h aujourd’hui • ${totalMonth.toFixed(2)} h ce mois (${ymNow})`;
}

function setupForms(){
  const form = document.getElementById('poseForm');
  const body = document.querySelector('#poseTable tbody');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const room = document.getElementById('room').value;
    const poseType = document.getElementById('poseType').value;
    const cement = document.getElementById('cement').value.trim();
    const silicone = document.getElementById('silicone').value.trim();
    const aluProfile = document.getElementById('aluProfile').value;
    const plinthes = document.getElementById('plinthes').value;
    const ceiling = document.getElementById('ceiling').value;
    const note = document.getElementById('poseNote').value.trim();
    const rec = { id: uid(), room, poseType, cement, silicone, aluProfile, plinthes, ceiling, note };
    state.forms.push(rec);
    await secureSave();
    renderForms(body);
    form.reset();
  });
  body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-id]'); if(!btn) return;
    const id = btn.getAttribute('data-id');
    const idx = state.forms.findIndex(x=>x.id===id);
    if(idx>=0){ state.forms.splice(idx,1); await secureSave(); renderForms(body); }
  });
  renderForms(body);
}
function renderForms(body){
  body.innerHTML='';
  state.forms.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${f.room}</td><td>${f.poseType}</td><td>${f.cement||''}</td><td>${f.silicone||''}</td><td>${f.aluProfile}</td><td>${f.plinthes}</td><td>${f.ceiling}</td><td>${f.note||''}</td><td><button data-id="${f.id}" class="danger">Supprimer</button></td>`;
    body.appendChild(tr);
  });
}

function setupExportImport(){
  document.getElementById('btnExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `mv3pro_export_${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById('fileImport').addEventListener('change', (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try{
        const obj = JSON.parse(reader.result);
        if(obj && obj.hours && obj.forms){
          state.hours = obj.hours; state.forms = obj.forms;
          await secureSave();
          document.querySelector('#hoursTable tbody').innerHTML='';
          document.querySelector('#poseTable tbody').innerHTML='';
          setupHours(); setupForms();
          alert('Import terminé.');
        } else { alert('Fichier invalide.'); }
      }catch(err){ alert('Erreur import: ' + err); }
    };
    reader.readAsText(file);
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  await secureLoad();
  setupTabs();
  setupHours();
  setupForms();
  setupExportImport();
});
