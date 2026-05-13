'use strict';
/* ══════════════════════════════════════════════════════
   API
══════════════════════════════════════════════════════ */
const API = {
  async req(method, path, data) {
    const token = localStorage.getItem('fhub_token');
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (data)  opts.body = JSON.stringify(data);
    const r = await fetch(path, opts);
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Errore');
    return j;
  },
  get:  (p)    => API.req('GET',    p, null),
  post: (p, d) => API.req('POST',   p, d),
  put:  (p, d) => API.req('PUT',    p, d),
  del:  (p)    => API.req('DELETE', p, null),
};

/* ══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
const S = {
  user:       null,
  contacts:   [],
  categories: [],
  favorites:  [],
  view:       'dashboard',  // dashboard | favorites | profile
  catFilter:  'all',
  query:      '',
  sortKey:    'name',
  expandedId: null,
};

/* ══════════════════════════════════════════════════════
   COLORS / UTILS
══════════════════════════════════════════════════════ */
const COLORS = ['#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e','#f97316','#f59e0b','#84cc16','#22c55e','#10b981','#14b8a6','#06b6d4','#0ea5e9','#3b82f6','#2563eb'];
const CAT_EMOJI = {'Graphic Designer':'🎨','Social Media Manager':'📱','Videomaker':'🎬','Web Developer':'💻','Motion Designer':'✨','3D Artists':'🧊'};
const Q_LABEL  = {top:'Ottimo', mid:'Discreto', low:'Scarso', unknown:'N/D'};
const Q_ORD    = {top:0, mid:1, unknown:2, low:3};
const PREVIEW_MAP = {
  g2:['babba-01','babba-02','babba-03'],
  g3:['alek-01','alek-02','alek-03'],
  g6:['riccardo-01','riccardo-02','riccardo-03'],
  g11:['patrizia-01','patrizia-02','patrizia-03'],
  g12:['christian-1','christian-2','christian-3'],
  g13:['paolo-01','paolo-02','paolo-03'],
  g18:['marika-01','marika-02','marika-03'],
  g20:['mari-01','mari-02','mari-03'],
  w1:['stefania-1','stefania-2','stefania-3'],
};

function avatarColor(n){ let h=0; for(const c of (n||'')) h=((h<<5)-h)+c.charCodeAt(0)|0; return COLORS[Math.abs(h)%COLORS.length]; }
function initials(n){ return (n||'').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase(); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function catEmoji(c){ return CAT_EMOJI[c]||'•'; }

/* ══════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════ */
function toast(msg, type='info') {
  let wrap = document.getElementById('toast-wrap');
  if (!wrap) { wrap = el('div','toast-wrap'); wrap.id='toast-wrap'; document.body.appendChild(wrap); }
  const t = el('div', `toast ${type}`, msg);
  wrap.appendChild(t);
  requestAnimationFrame(() => { requestAnimationFrame(() => t.classList.add('show')); });
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2800);
}

/* ══════════════════════════════════════════════════════
   DOM HELPERS
══════════════════════════════════════════════════════ */
function el(tag, cls='', html='') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}
function $id(id) { return document.getElementById(id); }

/* ══════════════════════════════════════════════════════
   AUTH VIEWS
══════════════════════════════════════════════════════ */
function renderAuth(tab='login') {
  document.getElementById('app').innerHTML = `
<div class="auth-page">
  <div class="auth-box ${tab==='register'?'reg':''}">
    <div class="auth-logo">
      <div class="auth-logo-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
      <div><div class="auth-logo h1" style="font-size:17px;font-weight:800">Freelancer Hub</div><div style="font-size:11px;color:var(--tx3)">Network professionale</div></div>
    </div>
    <div class="auth-tabs">
      <button class="auth-tab ${tab==='login'?'on':''}" onclick="renderAuth('login')">Accedi</button>
      <button class="auth-tab ${tab==='register'?'on':''}" onclick="renderAuth('register')">Registrati</button>
    </div>
    <div id="auth-err" class="err-msg"></div>
    <div id="auth-ok"  class="ok-msg"></div>
    ${tab==='login' ? renderLoginForm() : renderRegisterForm()}
  </div>
</div>`;
}

function renderLoginForm() {
  return `
<div class="auth-form-title">Bentornato 👋</div>
<div class="auth-form-sub">Accedi al tuo account per vedere i profili.</div>
<div class="field"><label>Email</label><input id="l-email" type="email" placeholder="tuaemail@esempio.com" autocomplete="email"></div>
<div class="field"><label>Password</label><input id="l-pwd" type="password" placeholder="••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')doLogin()"></div>
<button class="btn-full primary" onclick="doLogin()">Accedi</button>`;
}

function renderRegisterForm() {
  return `
<div class="auth-form-title">Crea il tuo profilo ✨</div>
<div class="auth-form-sub">Registrati come freelancer per apparire nella dashboard.</div>
<div class="reg-section-title">Account</div>
<div class="field"><label>Nome completo *</label><input id="r-name" placeholder="Es. Mario Rossi"></div>
<div class="field-row">
  <div class="field"><label>Email *</label><input id="r-email" type="email" placeholder="email@esempio.com" autocomplete="email"></div>
  <div class="field"><label>Password *</label><input id="r-pwd" type="password" placeholder="Min. 6 caratteri" autocomplete="new-password"></div>
</div>
<div class="reg-section-title">Profilo professionale</div>
<div class="field"><label>Categoria *</label>
  <select id="r-cat">
    <option value="">— Seleziona —</option>
    <option>Graphic Designer</option><option>Social Media Manager</option>
    <option>Videomaker</option><option>Web Developer</option>
    <option>Motion Designer</option><option>3D Artists</option>
    <option value="__new__">+ Nuova categoria…</option>
  </select>
</div>
<div id="r-newcat-wrap" class="field" style="display:none"><label>Nome nuova categoria</label><input id="r-newcat" placeholder="Es. Fotografo"></div>
<div class="field"><label>Ruolo / Specializzazione</label><input id="r-role" placeholder="Es. Brand Identity · Print"></div>
<div class="field"><label>Bio</label><textarea id="r-bio" placeholder="Descrivi brevemente la tua esperienza e le tue competenze…"></textarea></div>
<div class="reg-section-title">Contatti & Tariffe</div>
<div class="field-row">
  <div class="field"><label>Telefono</label><input id="r-phone" type="tel" placeholder="+39 333 000 0000"></div>
  <div class="field"><label>Cessione (%)</label><input id="r-comm" placeholder="Es. 20% o 20–30%"></div>
</div>
<div id="r-links-wrap"></div>
<button class="btn-full" style="background:var(--s1);border:1.5px solid var(--bdr);color:var(--tx2);font-weight:600;padding:8px;font-size:12.5px;margin-bottom:14px;border-radius:var(--rads)" onclick="addRegLink()">+ Aggiungi link portfolio</button>
<button class="btn-full primary" onclick="doRegister()">Crea profilo</button>
<div class="auth-switch">Hai già un account? <a onclick="renderAuth('login')">Accedi</a></div>`;
}

let regLinkCount = 0;
function addRegLink() {
  const w = $id('r-links-wrap'); if (!w) return;
  const r = el('div','elink-row');
  r.style.marginBottom = '5px';
  r.innerHTML=`<input class="ef" style="flex:1;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" placeholder="Etichetta (es. 🎨 Behance)" id="rl-l-${regLinkCount}"><input class="ef" style="flex:1;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" placeholder="URL https://…" id="rl-u-${regLinkCount}"><button class="bxi" onclick="this.closest('.elink-row').remove()">✕</button>`;
  w.appendChild(r);
  regLinkCount++;
}

// Watch category select
document.addEventListener('change', e => {
  if (e.target.id === 'r-cat') {
    const wrap = $id('r-newcat-wrap');
    if (wrap) wrap.style.display = e.target.value === '__new__' ? 'block' : 'none';
  }
});

async function doLogin() {
  const email = ($id('l-email')||{}).value?.trim();
  const pwd   = ($id('l-pwd')||{}).value;
  if (!email || !pwd) return showAuthErr('Inserisci email e password.');
  try {
    const d = await API.post('/api/auth/login', { email, password: pwd });
    localStorage.setItem('fhub_token', d.token);
    S.user = d.user;
    await loadContacts();
    renderApp();
    toast('Bentornato, ' + S.user.name + '!', 'success');
  } catch(e) { showAuthErr(e.message); }
}

async function doRegister() {
  const name  = ($id('r-name')||{}).value?.trim();
  const email = ($id('r-email')||{}).value?.trim();
  const pwd   = ($id('r-pwd')||{}).value;
  let   cat   = ($id('r-cat')||{}).value;
  if (!name)  return showAuthErr('Il nome è obbligatorio.');
  if (!email) return showAuthErr('L\'email è obbligatoria.');
  if (!pwd || pwd.length < 6) return showAuthErr('Password minimo 6 caratteri.');
  if (!cat || cat === '__new__') {
    cat = ($id('r-newcat')||{}).value?.trim();
    if (!cat) return showAuthErr('Seleziona o inserisci una categoria.');
  }
  const links = [];
  let i = 0;
  while ($id(`rl-l-${i}`)) {
    const l = ($id(`rl-l-${i}`)?.value||'').trim();
    const u = ($id(`rl-u-${i}`)?.value||'').trim();
    if (u) links.push({ l: l||u, u });
    i++;
  }
  try {
    const d = await API.post('/api/auth/register', {
      name, email, password: pwd,
      category: cat,
      role:   ($id('r-role')||{}).value?.trim(),
      bio:    ($id('r-bio')||{}).value?.trim(),
      phone:  ($id('r-phone')||{}).value?.trim(),
      commission: ($id('r-comm')||{}).value?.trim() || null,
      links,
    });
    localStorage.setItem('fhub_token', d.token);
    S.user = d.user;
    await loadContacts();
    renderApp();
    toast('Profilo creato! Benvenuto ' + S.user.name, 'success');
  } catch(e) { showAuthErr(e.message); }
}

function showAuthErr(msg) {
  const e = $id('auth-err'); if (!e) return;
  e.textContent = msg; e.classList.add('show');
  setTimeout(() => e.classList.remove('show'), 4000);
}

/* ══════════════════════════════════════════════════════
   LOAD DATA
══════════════════════════════════════════════════════ */
async function loadContacts() {
  const d = await API.get('/api/contacts');
  S.contacts   = d.contacts;
  S.categories = d.categories;
  S.favorites  = d.favorites || [];
}

/* ══════════════════════════════════════════════════════
   MAIN APP RENDER
══════════════════════════════════════════════════════ */
function renderApp() {
  document.getElementById('app').innerHTML = `
<div class="sb-ov" id="sb-ov" onclick="sbClose()"></div>
<div class="panel-ov" id="panel-ov" onclick="closePanel()"></div>
${renderSidebar()}
<main class="main" id="main-content">
  ${renderTopbar()}
  <div class="content" id="content"></div>
</main>
${renderPanel()}
<div id="toast-wrap" class="toast-wrap"></div>`;
  renderContent();
}

function renderSidebar() {
  const u = S.user;
  const bg = avatarColor(u?.name||'');
  const ini = initials(u?.name||'');

  // Count favorites by category
  const favContacts = S.contacts.filter(c => S.favorites.includes(c.id));
  const favCount = favContacts.length;

  // Category counts
  const visible = getFiltered('all', '');
  const catCounts = {};
  S.categories.forEach(c => catCounts[c] = visible.filter(x=>x.category===c).length);

  const navCats = S.categories.map(cat => `
    <div class="ni ${S.catFilter===cat&&S.view==='dashboard'?'on':''}" onclick="setCat('${esc(cat)}')">
      <div class="ni-left"><span class="ni-em">${catEmoji(cat)}</span>${esc(cat)}</div>
      <span class="ni-badge">${catCounts[cat]||0}</span>
    </div>`).join('');

  return `
<aside class="sidebar" id="sidebar">
  <div class="sb-head">
    <div class="sb-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
    <div class="sb-brand"><h2>Freelancer Hub</h2><p>${S.contacts.length} profili registrati</p></div>
  </div>
  <div class="sb-user">
    <div class="sb-avatar" style="background:${bg}">${esc(ini)}</div>
    <div class="sb-user-info">
      <div class="sb-user-name">${esc(u?.name||'')}</div>
      <div class="sb-user-role">${u?.isAdmin ? '⚙️ Admin' : esc(u?.category||'Freelancer')}</div>
    </div>
  </div>
  <div class="sb-search">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    <input id="sb-search" type="search" placeholder="Cerca profili…" value="${esc(S.query)}" oninput="setQuery(this.value)" autocomplete="off">
  </div>
  <div class="sb-nav">
    <div class="nav-sec-lbl">Vista</div>
    <div class="ni ${S.view==='dashboard'&&S.catFilter==='all'?'on':''}" onclick="setView('dashboard')">
      <div class="ni-left"><span class="ni-em">🗂️</span>Tutti i profili</div>
      <span class="ni-badge">${S.contacts.length}</span>
    </div>
    <div class="ni ${S.view==='favorites'?'on fav-item':''}" onclick="setView('favorites')">
      <div class="ni-left"><span class="ni-em">⭐</span>Preferiti</div>
      <span class="ni-badge" style="${favCount?'background:var(--fav);color:#fff':''}">${favCount}</span>
    </div>
    ${u && !u.isAdmin ? `<div class="ni ${S.view==='profile'?'on':''}" onclick="setView('profile')">
      <div class="ni-left"><span class="ni-em">👤</span>Il mio profilo</div>
    </div>` : ''}
    <div class="nav-sep"></div>
    <div class="nav-sec-lbl">Categorie</div>
    ${navCats}
  </div>
  <div class="sb-foot">
    ${u?.isAdmin ? `<button class="sb-foot-btn" onclick="openAddPanel()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>Aggiungi
    </button>` : ''}
    <button class="sb-foot-btn danger" onclick="doLogout()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Esci
    </button>
  </div>
</aside>`;
}

function renderTopbar() {
  const titles = { dashboard:'Profili', favorites:'⭐ Preferiti', profile:'Il mio profilo' };
  const list = getCurrentList();
  const title = S.view === 'dashboard' && S.catFilter !== 'all'
    ? `${catEmoji(S.catFilter)} ${S.catFilter}`
    : titles[S.view] || 'Profili';
  return `
<div class="topbar">
  <div class="tb-left">
    <button class="burger" onclick="sbToggle()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
    <span class="tb-title">${esc(title)}</span>
    <span class="tb-count">(${list.length})</span>
  </div>
  <div class="tb-right">
    <button class="sort-btn ${S.sortKey==='name'?'on':''}" onclick="setSort('name')">A–Z</button>
    <button class="sort-btn ${S.sortKey==='quality'?'on':''}" onclick="setSort('quality')">Qualità</button>
    <button class="sort-btn ${S.sortKey==='comm'?'on':''}" onclick="setSort('comm')">Cessione</button>
    ${S.user?.isAdmin ? `<button class="add-btn" onclick="openAddPanel()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
      Aggiungi
    </button>` : ''}
  </div>
</div>`;
}

function renderContent() {
  const content = $id('content');
  if (!content) return;
  if (S.view === 'profile') { content.innerHTML = renderProfilePage(); return; }
  const list = getCurrentList();
  if (!list.length) {
    content.innerHTML = `<div class="grid"><div class="empty">
      <div class="empty-icon">🔍</div>
      <h3>Nessun profilo trovato</h3>
      <p>${S.query ? `Nessun risultato per "${esc(S.query)}"` : 'Nessun profilo in questa categoria'}</p>
    </div></div>`;
    return;
  }
  if (S.view === 'favorites' || (S.view === 'dashboard' && S.catFilter !== 'all')) {
    content.innerHTML = `<div class="grid">${list.map(c => cardHTML(c)).join('')}</div>`;
  } else {
    // Group by category
    const cats = [...new Set(S.contacts.map(c => c.category))];
    let html = '';
    cats.forEach(cat => {
      const items = list.filter(c => c.category === cat);
      if (!items.length) return;
      html += `<div class="sec-head">
        <span class="sec-em">${catEmoji(cat)}</span>
        <span class="sec-t">${esc(cat)}</span>
        <span class="sec-c">${items.length} profil${items.length===1?'o':'i'}</span>
      </div><div class="grid">${items.map(c => cardHTML(c)).join('')}</div>`;
    });
    content.innerHTML = html;
  }
}

/* ══════════════════════════════════════════════════════
   CARD HTML
══════════════════════════════════════════════════════ */
function cardHTML(c) {
  const isOpen  = S.expandedId === c.id;
  const isFav   = S.favorites.includes(c.id);
  const isSelf  = S.user?.id === c.id;
  const isAdmin = S.user?.isAdmin;
  const showPriv = isAdmin || isSelf;
  const bg  = avatarColor(c.name);
  const ini = initials(c.name);
  const previews = PREVIEW_MAP[c.previewKey] || [];

  const prevHTML = previews.length
    ? previews.map(k => `<img src="/previews/${k}.jpg" alt="preview" loading="lazy" onerror="this.style.opacity='.3'">`).join('')
    : '';

  return `
<div class="card q-${c.quality||'unknown'}${isOpen?' open':''}${previews.length?' has-prev':''}" id="card-${c.id}">
  <div class="prev-strip ${previews.length?'has-imgs':''}">${prevHTML}</div>
  <button class="fav-btn${isFav?' saved':''}" onclick="toggleFav(event,'${c.id}')" title="${isFav?'Rimuovi dai preferiti':'Salva nei preferiti'}">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav?'currentColor':'none'}" stroke="currentColor" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  </button>
  <div class="card-head" onclick="toggleCard('${c.id}')">
    <div class="avatar" style="background:${bg}">
      <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&size=88&background=${bg.replace('#','')}&color=fff&bold=true&format=svg" loading="lazy" onerror="this.style.display='none'" alt="${esc(c.name)}">
      <span class="avatar-txt">${esc(ini)}</span>
    </div>
    <div class="card-info">
      <div class="card-name">${esc(c.name)}</div>
      <div class="card-role">${esc(c.role||c.category||'')}</div>
    </div>
    <div class="card-right">
      ${showPriv && c.quality ? `<span class="qpill q-${c.quality}">${Q_LABEL[c.quality]||'N/D'}</span>` : ''}
      ${c.commission ? `<span class="comm-pill">cede ${esc(c.commission)}</span>` : ''}
      <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
    </div>
  </div>
  <div class="card-body">
    <div class="card-body-in">
      <div class="view-c">
        ${c.phone ? `<div class="brow"><div class="blbl">Telefono</div>
          <a class="bphone" href="tel:${esc(c.phone.replace(/\s/g,''))}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.05 12.05 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.05 12.05 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${esc(c.phone)}
          </a></div>` : ''}
        ${c.bio ? `<div class="brow"><div class="blbl">Bio</div><div class="bnotes">${esc(c.bio)}</div></div>` : ''}
        ${c.links?.length ? `<div class="brow"><div class="blbl">Portfolio & Link</div>
          <div class="blinks">${c.links.map(l=>`<a class="blink" href="${esc(l.u)}" target="_blank" rel="noopener">${esc(l.l)}</a>`).join('')}</div></div>` : ''}
        ${previews.length ? `<div class="brow"><div class="blbl">Lavori</div>
          <div style="display:flex;gap:5px">${previews.map(k=>`<img src="/previews/${k}.jpg" style="flex:1;min-width:0;height:74px;object-fit:cover;border-radius:6px;background:var(--s2)" loading="lazy">`).join('')}</div></div>` : ''}
        ${showPriv && c.adminNotes ? `<div class="admin-note-box">
          <div class="blbl">🔒 Nota privata</div>
          <div class="bnotes">${esc(c.adminNotes)}</div>
        </div>` : ''}
        <div class="card-acts">
          ${isSelf || isAdmin ? `<button class="cbtn acc" onclick="openEditCard('${c.id}')">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Modifica
          </button>` : ''}
          ${isAdmin ? `<button class="cbtn del" onclick="deleteContact('${c.id}',event)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>` : ''}
        </div>
      </div>
      <div class="edit-f">${editFormHTML(c)}</div>
    </div>
  </div>
</div>`;
}

function editFormHTML(c) {
  const isAdmin = S.user?.isAdmin;
  const qOpts = ['top','mid','low','unknown'].map(v =>
    `<option value="${v}"${c.quality===v?' selected':''}>${{top:'⭐ Ottimo',mid:'👍 Discreto',low:'👎 Scarso',unknown:'❓ N/D'}[v]}</option>`).join('');
  const catOpts = S.categories.map(cat => `<option${c.category===cat?' selected':''}>${esc(cat)}</option>`).join('');
  const linksHTML = (c.links||[]).map((l,i)=>`
    <div class="elink-row">
      <input class="ef" style="flex:1;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" placeholder="Etichetta" data-ll="${i}" value="${esc(l.l)}">
      <input class="ef" style="flex:1;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" placeholder="URL" data-lu="${i}" value="${esc(l.u)}">
      <button class="bxi" onclick="this.closest('.elink-row').remove()">✕</button>
    </div>`).join('');
  return `
    <div class="ef"><label>Nome</label><input data-f="name" style="width:100%;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" value="${esc(c.name)}"></div>
    <div class="ef"><label>Ruolo</label><input data-f="role" style="width:100%;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" value="${esc(c.role||'')}"></div>
    <div class="ef"><label>Categoria</label><select data-f="category" style="width:100%;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none;appearance:none">${catOpts}</select></div>
    <div class="ef"><label>Telefono</label><input data-f="phone" style="width:100%;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" value="${esc(c.phone||'')}"></div>
    <div class="ef"><label>Cessione</label><input data-f="commission" style="width:100%;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" value="${esc(c.commission||'')}"></div>
    <div class="ef"><label>Bio</label><textarea data-f="bio" style="width:100%;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none;resize:vertical;min-height:60px">${esc(c.bio||'')}</textarea></div>
    ${isAdmin ? `<div class="ef"><label>⭐ Qualità</label><select data-f="quality" style="width:100%;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none;appearance:none">${qOpts}</select></div>
    <div class="ef"><label>🔒 Nota privata (visibile al freelancer)</label><textarea data-f="adminNotes" style="width:100%;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none;resize:vertical;min-height:65px">${esc(c.adminNotes||'')}</textarea></div>` : ''}
    <div class="ef"><label>Portfolio & Link</label>
      <div id="el-${c.id}">${linksHTML}</div>
      <button class="cbtn" style="margin-top:5px;font-size:11.5px" onclick="addEditLink('${c.id}')">+ Link</button>
    </div>
    <div class="card-acts">
      <button class="cbtn acc" onclick="saveCardEdit('${c.id}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>Salva
      </button>
      <button class="cbtn" onclick="cancelCardEdit('${c.id}')">Annulla</button>
    </div>`;
}

/* ══════════════════════════════════════════════════════
   PROFILE PAGE
══════════════════════════════════════════════════════ */
function renderProfilePage() {
  const u = S.user;
  const contact = S.contacts.find(c => c.id === u.id);
  const c = contact || u;
  const bg = avatarColor(u.name);
  const ini = initials(u.name);
  const linksHTML = (c.links||[]).map(l=>
    `<a class="blink" href="${esc(l.u)}" target="_blank">${esc(l.l)}</a>`).join('');
  return `
<div class="profile-page">
  <div class="profile-hero">
    <div class="profile-avatar" style="background:${bg}">${esc(ini)}</div>
    <div class="profile-hero-info">
      <h2>${esc(c.name)}</h2>
      <p>${esc(c.role||'')} ${c.category?'· '+esc(c.category):''}</p>
      ${c.phone ? `<p style="margin-top:4px"><a class="bphone" href="tel:${esc((c.phone||'').replace(/\s/g,''))}">${esc(c.phone)}</a></p>` : ''}
    </div>
  </div>
  ${c.bio ? `<div class="profile-section"><h3>Bio</h3><p style="font-size:13.5px;color:var(--tx2);line-height:1.7">${esc(c.bio)}</p></div>` : ''}
  ${c.links?.length ? `<div class="profile-section"><h3>Portfolio & Link</h3><div class="blinks">${linksHTML}</div></div>` : ''}
  ${c.adminNotes ? `<div class="profile-section">
    <h3>📬 Valutazione ricevuta</h3>
    <div class="profile-admin-note">
      <h4>🔒 Nota privata dal team</h4>
      <p>${esc(c.adminNotes)}</p>
    </div>
    ${c.quality&&c.quality!=='unknown'?`<div style="margin-top:10px"><span class="qpill q-${c.quality}" style="font-size:12px">${Q_LABEL[c.quality]}</span></div>`:''}
  </div>` : ''}
  <div class="profile-section">
    <h3>Modifica profilo</h3>
    ${profileEditForm(c)}
  </div>
</div>`;
}

function profileEditForm(c) {
  const catOpts = S.categories.map(cat=>`<option${c.category===cat?' selected':''}>${esc(cat)}</option>`).join('');
  const linksHTML = (c.links||[]).map((l,i)=>`
    <div class="elink-row" style="margin-bottom:5px">
      <input style="flex:1;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" placeholder="Etichetta" data-pll="${i}" value="${esc(l.l)}">
      <input style="flex:1;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" placeholder="URL" data-plu="${i}" value="${esc(l.u)}">
      <button class="bxi" onclick="this.closest('.elink-row').remove()">✕</button>
    </div>`).join('');
  return `
<div id="prof-edit-form">
  <div class="field"><label>Nome</label><input id="pf-name" value="${esc(c.name)}"></div>
  <div class="field"><label>Ruolo</label><input id="pf-role" value="${esc(c.role||'')}"></div>
  <div class="field"><label>Categoria</label><select id="pf-cat">${catOpts}</select></div>
  <div class="field-row">
    <div class="field"><label>Telefono</label><input id="pf-phone" value="${esc(c.phone||'')}"></div>
    <div class="field"><label>Cessione</label><input id="pf-comm" value="${esc(c.commission||'')}"></div>
  </div>
  <div class="field"><label>Bio</label><textarea id="pf-bio">${esc(c.bio||'')}</textarea></div>
  <div class="field"><label>Link portfolio</label>
    <div id="pf-links">${linksHTML}</div>
    <button class="cbtn" style="margin-top:5px;font-size:11.5px" onclick="addProfileLink()">+ Link</button>
  </div>
  <button class="cbtn acc" style="margin-top:6px" onclick="saveProfile()">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>Salva modifiche
  </button>
</div>`;
}

let pfLinkCount = 100;
function addProfileLink() {
  const w = $id('pf-links'); if (!w) return;
  const r = el('div','elink-row');r.style.marginBottom='5px';
  r.innerHTML=`<input style="flex:1;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" placeholder="Etichetta" data-pll="${pfLinkCount}" value=""><input style="flex:1;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" placeholder="URL" data-plu="${pfLinkCount}" value=""><button class="bxi" onclick="this.closest('.elink-row').remove()">✕</button>`;
  w.appendChild(r); pfLinkCount++;
}

async function saveProfile() {
  const links = [];
  $id('pf-links')?.querySelectorAll('.elink-row').forEach(r=>{
    const l=(r.querySelector('[data-pll]')?.value||'').trim();
    const u=(r.querySelector('[data-plu]')?.value||'').trim();
    if(u)links.push({l:l||u,u});
  });
  try {
    const d = await API.put(`/api/contacts/${S.user.id}`, {
      name:       $id('pf-name')?.value.trim(),
      role:       $id('pf-role')?.value.trim(),
      category:   $id('pf-cat')?.value,
      phone:      $id('pf-phone')?.value.trim(),
      commission: $id('pf-comm')?.value.trim()||null,
      bio:        $id('pf-bio')?.value.trim(),
      links,
    });
    await loadContacts();
    S.user = { ...S.user, ...d.user };
    renderApp();
    S.view = 'profile';
    renderContent();
    toast('Profilo aggiornato!', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

/* ══════════════════════════════════════════════════════
   SLIDE PANEL (Add contact / full edit)
══════════════════════════════════════════════════════ */
let panelContactId = null;

function renderPanel() {
  const catOpts = S.categories.map(cat=>`<option>${esc(cat)}</option>`).join('') +
    `<option value="__new__">+ Nuova categoria…</option>`;
  return `
<div class="panel" id="side-panel">
  <div class="panel-head">
    <h3 id="panel-title">➕ Nuovo profilo</h3>
    <button class="panel-close" onclick="closePanel()">✕</button>
  </div>
  <div class="panel-body">
    <div id="panel-err" class="err-msg"></div>
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--tx4);padding-bottom:8px;border-bottom:1px solid var(--bdr);margin-bottom:10px">Info base</div>
    <div class="ef"><label>Nome *</label><input class="ef" id="p-name" style="width:100%;padding:8px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:13px;outline:none" placeholder="Nome Cognome"></div>
    <div class="ef"><label>Categoria *</label><select class="ef" id="p-cat" style="width:100%;padding:8px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:13px;outline:none;appearance:none" onchange="panelCatChange()"><option value="">—</option>${catOpts}</select></div>
    <div class="ef" id="p-newcat-wrap" style="display:none"><label>Nome nuova categoria</label><input id="p-newcat" style="width:100%;padding:8px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:13px;outline:none" placeholder="Es. Fotografo"></div>
    <div class="ef"><label>Ruolo</label><input id="p-role" style="width:100%;padding:8px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:13px;outline:none" placeholder="Es. Brand Identity · Print"></div>
    <div class="ef"><label>Bio</label><textarea id="p-bio" style="width:100%;padding:8px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:13px;outline:none;resize:vertical;min-height:65px"></textarea></div>
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--tx4);padding:12px 0 8px;border-bottom:1px solid var(--bdr);margin-bottom:10px">Contatti & Tariffe</div>
    <div class="ef"><label>Telefono</label><input id="p-phone" type="tel" style="width:100%;padding:8px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:13px;outline:none" placeholder="+39 333 000 0000"></div>
    <div class="ef"><label>Cessione (%)</label><input id="p-comm" style="width:100%;padding:8px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:13px;outline:none" placeholder="Es. 20% o 20–30%"></div>
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--tx4);padding:12px 0 8px;border-bottom:1px solid var(--bdr);margin-bottom:10px">Valutazione Admin</div>
    <div class="ef"><label>Qualità</label><select id="p-quality" style="width:100%;padding:8px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:13px;outline:none;appearance:none">
      <option value="unknown">❓ N/D</option><option value="top">⭐ Ottimo</option><option value="mid">👍 Discreto</option><option value="low">👎 Scarso</option>
    </select></div>
    <div class="ef"><label>Nota privata</label><textarea id="p-notes" style="width:100%;padding:8px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:13px;outline:none;resize:vertical;min-height:65px" placeholder="Note visibili solo a te e al freelancer…"></textarea></div>
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--tx4);padding:12px 0 8px;border-bottom:1px solid var(--bdr);margin-bottom:10px">Portfolio & Link</div>
    <div id="p-links-wrap"></div>
    <button class="cbtn" style="font-size:11.5px;margin-bottom:12px" onclick="addPanelLink()">+ Aggiungi link</button>
  </div>
  <div class="panel-foot">
    <button class="cbtn acc" onclick="savePanel()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>Salva
    </button>
    <button class="cbtn" onclick="closePanel()">Annulla</button>
  </div>
</div>`;
}

function panelCatChange() {
  const v = $id('p-cat')?.value;
  const w = $id('p-newcat-wrap');
  if (w) w.style.display = v === '__new__' ? 'block' : 'none';
}

let panelLinkCount = 0;
function addPanelLink() {
  const w = $id('p-links-wrap'); if (!w) return;
  const r = el('div','elink-row'); r.style.marginBottom='5px';
  r.innerHTML=`<input style="flex:1;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" placeholder="Etichetta" id="pl-l-${panelLinkCount}"><input style="flex:1;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" placeholder="URL" id="pl-u-${panelLinkCount}"><button class="bxi" onclick="this.closest('.elink-row').remove()">✕</button>`;
  w.appendChild(r); panelLinkCount++;
}

function openAddPanel() {
  panelContactId = null;
  // Reset
  ['p-name','p-role','p-bio','p-phone','p-comm','p-notes','p-newcat'].forEach(id => {
    const el = $id(id); if(el) el.value = '';
  });
  const pcat = $id('p-cat'); if (pcat) pcat.value = '';
  const pq   = $id('p-quality'); if (pq) pq.value = 'unknown';
  const plw  = $id('p-links-wrap'); if (plw) plw.innerHTML = '';
  const ph   = $id('panel-title'); if (ph) ph.textContent = '➕ Nuovo profilo';
  const pw   = $id('p-newcat-wrap'); if(pw) pw.style.display='none';
  $id('side-panel')?.classList.add('open');
  $id('panel-ov')?.classList.add('show');
}

function openPanelEdit(id) {
  const c = S.contacts.find(x => x.id === id); if (!c) return;
  panelContactId = id;
  const ph = $id('panel-title'); if (ph) ph.textContent = '✏️ Modifica profilo';
  ['p-name','p-role','p-bio','p-phone','p-comm','p-notes'].forEach(fid => {
    const field = fid.split('-')[1];
    const map = {name:c.name,role:c.role,bio:c.bio,phone:c.phone,comm:c.commission,notes:c.adminNotes};
    const el = $id(fid); if (el) el.value = map[field]||'';
  });
  const pcat = $id('p-cat');
  if (pcat) { const o = Array.from(pcat.options).find(o=>o.value===c.category); if(o) pcat.value=c.category; }
  const pq = $id('p-quality'); if (pq) pq.value = c.quality||'unknown';
  const plw = $id('p-links-wrap');
  if (plw) {
    plw.innerHTML = (c.links||[]).map((l,i)=>`
      <div class="elink-row" style="margin-bottom:5px">
        <input style="flex:1;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" placeholder="Etichetta" id="pl-l-${i}" value="${esc(l.l)}">
        <input style="flex:1;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" placeholder="URL" id="pl-u-${i}" value="${esc(l.u)}">
        <button class="bxi" onclick="this.closest('.elink-row').remove()">✕</button>
      </div>`).join('');
    panelLinkCount = (c.links||[]).length;
  }
  $id('side-panel')?.classList.add('open');
  $id('panel-ov')?.classList.add('show');
}

async function savePanel() {
  const name = $id('p-name')?.value.trim();
  if (!name) { const e=$id('panel-err');if(e){e.textContent='Il nome è obbligatorio';e.classList.add('show');setTimeout(()=>e.classList.remove('show'),3000);} return; }
  let cat = $id('p-cat')?.value;
  if (cat === '__new__') cat = $id('p-newcat')?.value.trim() || '';
  const links = [];
  let i = 0;
  while ($id(`pl-l-${i}`)) {
    const l=($id(`pl-l-${i}`)?.value||'').trim(), u=($id(`pl-u-${i}`)?.value||'').trim();
    if(u) links.push({l:l||u,u}); i++;
  }
  // Also grab dynamically added rows
  $id('p-links-wrap')?.querySelectorAll('.elink-row').forEach(r=>{
    const inputs = r.querySelectorAll('input');
    if(inputs.length>=2){const l=inputs[0].value.trim(),u=inputs[1].value.trim();if(u&&!links.find(x=>x.u===u))links.push({l:l||u,u});}
  });
  const payload = {
    name, category:cat||null,
    role:    $id('p-role')?.value.trim()||'',
    bio:     $id('p-bio')?.value.trim()||'',
    phone:   $id('p-phone')?.value.trim()||'',
    commission: $id('p-comm')?.value.trim()||null,
    quality: $id('p-quality')?.value||'unknown',
    adminNotes: $id('p-notes')?.value.trim()||'',
    links,
  };
  try {
    if (panelContactId) {
      await API.put(`/api/contacts/${panelContactId}`, payload);
      toast('Profilo aggiornato!', 'success');
    } else {
      await API.post('/api/contacts', payload);
      toast('Contatto aggiunto!', 'success');
    }
    closePanel();
    await loadContacts();
    renderApp();
  } catch(e) { toast(e.message, 'error'); }
}

function closePanel() {
  $id('side-panel')?.classList.remove('open');
  $id('panel-ov')?.classList.remove('show');
}

/* ══════════════════════════════════════════════════════
   INLINE CARD EDIT
══════════════════════════════════════════════════════ */
function toggleCard(id) {
  S.expandedId = S.expandedId === id ? null : id;
  renderContent();
  if (S.expandedId) {
    setTimeout(() => $id(`card-${id}`)?.scrollIntoView({ behavior:'smooth', block:'nearest' }), 50);
  }
}

function openEditCard(id) {
  S.expandedId = id;
  renderContent();
  setTimeout(() => {
    const card = $id(`card-${id}`);
    if (card) { card.classList.add('edit-mode'); card.scrollIntoView({ behavior:'smooth', block:'nearest' }); }
  }, 50);
}

function cancelCardEdit(id) {
  const card = $id(`card-${id}`); if(!card) return;
  card.classList.remove('edit-mode');
}

function addEditLink(id) {
  const w = $id(`el-${id}`); if (!w) return;
  const i = w.querySelectorAll('.elink-row').length;
  const r = el('div','elink-row'); r.style.marginBottom='5px';
  r.innerHTML=`<input style="flex:1;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" placeholder="Etichetta" data-ll="${i}" value=""><input style="flex:1;padding:7px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12.5px;outline:none" placeholder="URL" data-lu="${i}" value=""><button class="bxi" onclick="this.closest('.elink-row').remove()">✕</button>`;
  w.appendChild(r);
}

async function saveCardEdit(id) {
  const card = $id(`card-${id}`); if (!card) return;
  const data = {};
  card.querySelectorAll('[data-f]').forEach(el => { data[el.dataset.f] = el.value.trim(); });
  const links = [];
  card.querySelectorAll('.elink-row').forEach(r=>{
    const l=(r.querySelector('[data-ll]')?.value||'').trim();
    const u=(r.querySelector('[data-lu]')?.value||'').trim();
    if(u)links.push({l:l||u,u});
  });
  data.links = links;
  try {
    await API.put(`/api/contacts/${id}`, data);
    await loadContacts();
    toast('Salvato!', 'success');
    S.expandedId = id;
    renderApp();
  } catch(e) { toast(e.message, 'error'); }
}

/* ══════════════════════════════════════════════════════
   FAVORITES
══════════════════════════════════════════════════════ */
async function toggleFav(e, id) {
  e.stopPropagation();
  try {
    const d = await API.post(`/api/favorites/${id}`);
    S.favorites = d.favorites;
    const btn = e.currentTarget;
    btn.classList.toggle('saved', d.saved);
    btn.querySelector('svg').setAttribute('fill', d.saved ? 'currentColor' : 'none');
    toast(d.saved ? '⭐ Aggiunto ai preferiti' : 'Rimosso dai preferiti', 'info');
    // Re-render sidebar count
    const nb = document.querySelector('.ni:nth-child(2) .ni-badge');
    if (nb) nb.textContent = S.favorites.length;
  } catch(e) { toast(e.message, 'error'); }
}

/* ══════════════════════════════════════════════════════
   DELETE
══════════════════════════════════════════════════════ */
async function deleteContact(id, e) {
  e.stopPropagation();
  if (!confirm('Eliminare questo profilo definitivamente?')) return;
  try {
    await API.del(`/api/contacts/${id}`);
    await loadContacts();
    S.expandedId = null;
    renderApp();
    toast('Profilo eliminato', 'info');
  } catch(ex) { toast(ex.message, 'error'); }
}

/* ══════════════════════════════════════════════════════
   FILTER / SORT HELPERS
══════════════════════════════════════════════════════ */
function getFiltered(viewOverride, queryOverride) {
  const v = viewOverride !== undefined ? viewOverride : S.view;
  const q = queryOverride !== undefined ? queryOverride : S.query;
  let list = [...S.contacts];
  if (v === 'favorites') list = list.filter(c => S.favorites.includes(c.id));
  else if (v !== 'dashboard' && v !== 'all') list = list.filter(c => c.category === v);
  if (S.catFilter !== 'all' && v === 'dashboard') list = list.filter(c => c.category === S.catFilter);
  if (q) {
    const ql = q.toLowerCase();
    list = list.filter(c =>
      (c.name||'').toLowerCase().includes(ql) ||
      (c.role||'').toLowerCase().includes(ql) ||
      (c.bio||'').toLowerCase().includes(ql) ||
      (c.category||'').toLowerCase().includes(ql));
  }
  return sortList(list);
}

function getCurrentList() { return getFiltered(); }

function sortList(list) {
  return [...list].sort((a,b) => {
    if (S.sortKey === 'quality') return (Q_ORD[a.quality||'unknown']||99)-(Q_ORD[b.quality||'unknown']||99);
    if (S.sortKey === 'comm') {
      const va=a.commission?parseInt(a.commission):-1, vb=b.commission?parseInt(b.commission):-1;
      return vb-va;
    }
    return (a.name||'').localeCompare(b.name||'','it');
  });
}

/* ══════════════════════════════════════════════════════
   NAV ACTIONS
══════════════════════════════════════════════════════ */
function setView(v) {
  S.view = v; S.catFilter = 'all'; S.expandedId = null; S.query = '';
  const ss = $id('sb-search'); if(ss) ss.value='';
  renderApp(); sbClose();
}
function setCat(cat) {
  S.view = 'dashboard'; S.catFilter = cat; S.expandedId = null;
  renderApp(); sbClose();
}
function setQuery(q) {
  S.query = q; S.expandedId = null;
  renderContent();
  // Update topbar count without destroying DOM (keeps focus in search input)
  const tbCount = document.querySelector('.tb-count');
  if (tbCount) tbCount.textContent = `(${getCurrentList().length})`;
}
function setSort(k) {
  S.sortKey = k;
  renderContent();
  // Update sort button highlight without full re-render
  const keyMap = {'A–Z':'name','Qualità':'quality','Cessione':'comm'};
  document.querySelectorAll('.sort-btn').forEach(b => {
    b.classList.toggle('on', keyMap[b.textContent.trim()] === k);
  });
}

function sbToggle() {
  $id('sidebar')?.classList.toggle('open');
  $id('sb-ov')?.classList.toggle('show');
}
function sbClose() {
  $id('sidebar')?.classList.remove('open');
  $id('sb-ov')?.classList.remove('show');
}

function doLogout() {
  localStorage.removeItem('fhub_token');
  S.user=null; S.contacts=[]; S.categories=[]; S.favorites=[];
  S.view='dashboard'; S.query=''; S.catFilter='all';
  renderAuth('login');
  toast('Logout effettuato', 'info');
}

/* ══════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════ */
async function boot() {
  document.getElementById('app').innerHTML = `
<div class="loading-screen">
  <div class="spin"></div>
  <span>Caricamento…</span>
</div>`;
  const token = localStorage.getItem('fhub_token');
  if (!token) { renderAuth('login'); return; }
  try {
    const d = await API.get('/api/profile');
    S.user = d.user;
    await loadContacts();
    renderApp();
  } catch {
    localStorage.removeItem('fhub_token');
    renderAuth('login');
  }
}

boot();
