'use strict';
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const PORT        = process.env.PORT || 3000;
const JWT_SECRET  = process.env.JWT_SECRET || 'fhub-secret-2024-change-me';
const DB_FILE     = path.join(__dirname, 'data', 'db.json');
const PUBLIC_DIR  = path.join(__dirname, 'public');
const PREVIEW_DIR = path.join(__dirname, '..', 'previews');

/* ══════════════════════════════════════════════════════════
   JWT  (HS256, no deps)
══════════════════════════════════════════════════════════ */
const b64u = s => Buffer.from(s).toString('base64url');
function signJWT(payload) {
  const h = b64u(JSON.stringify({ alg:'HS256', typ:'JWT' }));
  const b = b64u(JSON.stringify(payload));
  const s = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${s}`;
}
function verifyJWT(token) {
  try {
    const [h, b, s] = (token||'').split('.');
    if (!h||!b||!s) return null;
    const exp = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
    if (s !== exp) return null;
    const p = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}

/* ══════════════════════════════════════════════════════════
   DB  (JSON file)
══════════════════════════════════════════════════════════ */
function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { users:[], categories:DEFAULT_CATS }; }
}
function writeDB(db) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
function hashPwd(pwd) {
  return crypto.createHash('sha256').update(pwd + JWT_SECRET).digest('hex');
}
function uid() { return Date.now().toString(36) + crypto.randomBytes(4).toString('hex'); }

/* ══════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════ */
const DEFAULT_CATS = [
  'Graphic Designer','Social Media Manager','Videomaker',
  'Web Developer','Motion Designer','3D Artists'
];
const MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml',
  '.ico':'image/x-icon','.pdf':'application/pdf','.woff2':'font/woff2',
};
const SEED_CONTACTS = [
  {name:'Sofia Sartoni',   cat:'Graphic Designer',    role:'Art Direction · CGI',     phone:'+39 388 739 0521',comm:null,   q:'top',   links:[{l:'🎨 Behance',u:'https://www.behance.net/sofiasartoni'},{l:'📸 Instagram',u:'https://www.instagram.com/thats_not_artt'}],bio:'Improntata sul 3D e sull\'art direction, alto profilo.', adminNotes:'Improntata sul 3d e sul art direction, da capire meglio',previewKey:''},
  {name:'Babba',           cat:'Graphic Designer',    role:'Graphic Designer',        phone:'+39 342 598 3572',comm:'30%', q:'top',   links:[{l:'📸 Instagram',u:'https://www.instagram.com/babba_visuals'}],bio:'Graphic designer coerente e professionale.', adminNotes:'La più interessante, coerente e professionale',previewKey:'g2'},
  {name:'Alek',            cat:'Graphic Designer',    role:'Graphic Designer',        phone:'+39 328 658 4562',comm:'20%', q:'top',   links:[],bio:'', adminNotes:'Una delle migliori',previewKey:'g3'},
  {name:'Umberto Lama',    cat:'Graphic Designer',    role:'Graphic Designer',        phone:'+39 320 944 2492',comm:'25%', q:'top',   links:[{l:'🌐 Sito',u:'https://umbertolama.framer.website/'}],bio:'Grafico versatile.', adminNotes:'Ottimo',previewKey:''},
  {name:'Antonio Contrastato',cat:'Graphic Designer', role:'Graphic Designer · Web', phone:'+39 391 368 5487',comm:'30%', q:'top',   links:[],bio:'Fa anche sviluppo web.', adminNotes:'Molto bravo, fa anche web',previewKey:''},
  {name:'Riccardo Bonifaci',cat:'Graphic Designer',   role:'Graphic Designer',        phone:'+39 331 869 5765',comm:null,  q:'top',   links:[],bio:'', adminNotes:'Bravo e originale, molto interessante',previewKey:'g6'},
  {name:'Launa',           cat:'Graphic Designer',    role:'Graphic Designer',        phone:'+39 348 160 5543',comm:null,  q:'top',   links:[],bio:'', adminNotes:'Brava, tanti lavori ed interessante',previewKey:''},
  {name:'Vittorio Bassoli',cat:'Graphic Designer',    role:'Product Design · 2D/3D', phone:'+39 392 340 8998',comm:null,  q:'mid',   links:[],bio:'Prototipazione e product design, render ad alta risoluzione.', adminNotes:'Mi sono specializzato in prototipazione e product design ultimamente',previewKey:''},
  {name:'Luigi Falibretti',cat:'Graphic Designer',    role:'Graphic Designer',        phone:'+39 366 244 6886',comm:null,  q:'mid',   links:[],bio:'', adminNotes:'Giovane designer, idee fresche ma non mature',previewKey:''},
  {name:'Martina Palumbo', cat:'Graphic Designer',    role:'Graphic Designer',        phone:'+39 366 838 9437',comm:null,  q:'mid',   links:[{l:'🎨 Behance',u:'https://www.behance.net/gallery/230054759/Creative-Portfolio-2025'}],bio:'', adminNotes:'Interessante ma pochi lavori',previewKey:''},
  {name:'Patrizia Frizziero',cat:'Graphic Designer',  role:'Graphic Designer',        phone:'+39 346 624 3044',comm:'30%', q:'mid',   links:[],bio:'', adminNotes:'Leggermente sopra la mediocrità',previewKey:'g11'},
  {name:'Foglia Christian',cat:'Graphic Designer',    role:'Graphic Designer',        phone:'+39 327 121 1818',comm:'25–30%',q:'mid', links:[],bio:'', adminNotes:'Per lavori basso budget',previewKey:'g12'},
  {name:'Paolo Celoro',    cat:'Graphic Designer',    role:'Graphic Designer',        phone:'+39 392 321 0730',comm:'20%', q:'mid',   links:[],bio:'', adminNotes:'Buona esecuzione tecnica',previewKey:'g13'},
  {name:'Laura Giangrande',cat:'Graphic Designer',    role:'Graphic Designer',        phone:'+39 347 720 0301',comm:'20%', q:'mid',   links:[],bio:'6 anni di esperienza.', adminNotes:'Tanti lavori anche buoni ma presentati male',previewKey:'g14'},
  {name:'Emanuela Lodato', cat:'Graphic Designer',    role:'Graphic Designer',        phone:'+39 331 849 9350',comm:null,  q:'low',   links:[],bio:'', adminNotes:'Mediocre',previewKey:''},
  {name:'Alessandro Tamburrino',cat:'Graphic Designer',role:'Graphic Designer',       phone:'+39 347 399 7038',comm:null,  q:'low',   links:[{l:'🌐 Sito',u:'http://www.alessandrotamburrino.com'}],bio:'', adminNotes:'Livello basso, ma lavora sulla quantità',previewKey:''},
  {name:'Luigi',           cat:'Graphic Designer',    role:'Graphic Designer',        phone:'+39 351 502 8912',comm:null,  q:'low',   links:[],bio:'', adminNotes:'Poca roba',previewKey:''},
  {name:'Marika Stellacci',cat:'Graphic Designer',    role:'Graphic Designer',        phone:'+39 392 378 8777',comm:'20–30%',q:'low', links:[],bio:'', adminNotes:'Stile obsoleto',previewKey:'g18'},
  {name:'AA Design',       cat:'Graphic Designer',    role:'Graphic Designer',        phone:'+39 377 126 0322',comm:null,  q:'low',   links:[{l:'📸 Instagram',u:'https://www.instagram.com/aa.design._/'}],bio:'', adminNotes:'Mediocre',previewKey:''},
  {name:'Mari',            cat:'Graphic Designer',    role:'Graphic Designer · Fotografa',phone:'+39 339 742 3548',comm:'20–30%',q:'low',links:[],bio:'', adminNotes:'Male, però brava fotografa',previewKey:'g20'},
  {name:'Martina',         cat:'Social Media Manager',role:'SMM · Agenzia',           phone:'+39 320 021 8963',comm:null,  q:'top',   links:[{l:'🌐 Sito',u:'https://packmokacreative.lovable.app/'}],bio:'Pack Moka Creative Studio.', adminNotes:'Super in gamba, prezzi ad hoc, strutturata come agenzia',previewKey:''},
  {name:'Anna Massari',    cat:'Social Media Manager',role:'SMM · Sales',             phone:'+39 338 562 6742',comm:null,  q:'top',   links:[],bio:'Specializzata in vendite e setter in chat.', adminNotes:'Specializzata in vendite, 700€ a salire',previewKey:''},
  {name:'Ilenia Di Domenico',cat:'Social Media Manager',role:'SMM Freelancer',        phone:'+39 380 281 1141',comm:'10%', q:'top',   links:[{l:'🌐 Portfolio',u:'https://jlsocialmedia.info/portfolio-jleniadidomenico'}],bio:'Pacchetti 400–1500€.', adminNotes:'Freelancer più strutturata, cede 10% alle agenzie',previewKey:''},
  {name:'Karim',           cat:'Social Media Manager',role:'SMM Freelancer',          phone:'+39 371 174 1135',comm:null,  q:'mid',   links:[],bio:'', adminNotes:'12 reel 800€, 200€ di margine',previewKey:''},
  {name:'Lucio',           cat:'Social Media Manager',role:'SMM · Agenzia',           phone:'+39 342 932 4753',comm:null,  q:'mid',   links:[],bio:'Believe Studio (Napoli + Milano).', adminNotes:'550-650-850€',previewKey:''},
  {name:'Matteo Seminara', cat:'Social Media Manager',role:'SMM Freelancer',          phone:'+39 339 219 8879',comm:null,  q:'mid',   links:[],bio:'', adminNotes:'Prezzi flessibili',previewKey:''},
  {name:'Gabriele',        cat:'Social Media Manager',role:'SMM',                     phone:'+39 334 757 9822',comm:null,  q:'unknown',links:[{l:'🌐 Sito',u:'https://gbga.it/'}],bio:'', adminNotes:'Delle Marche',previewKey:''},
  {name:'Sveva Pezzon',    cat:'Social Media Manager',role:'SMM',                     phone:'+39 351 558 5922',comm:null,  q:'low',   links:[],bio:'', adminNotes:'Alle prime armi, 400€',previewKey:''},
  {name:'Anastasia Lazareva',cat:'Social Media Manager',role:'SMM Freelancer',        phone:'+39 320 214 6019',comm:null,  q:'low',   links:[],bio:'', adminNotes:'Quantità non qualità e creatività',previewKey:''},
  {name:'Anna Massari',    cat:'Videomaker',          role:'Video Editor',            phone:'+39 338 562 6742',comm:null,  q:'top',   links:[{l:'📸 Reel',u:'https://www.instagram.com/reel/DN-bVjJDNev/'}],bio:'Freelancer con esperienza.', adminNotes:'Ottimi risultati',previewKey:''},
  {name:'Federica Latini', cat:'Videomaker',          role:'Video Editor',            phone:'+39 327 456 3578',comm:null,  q:'mid',   links:[{l:'📸 Instagram',u:'https://www.instagram.com/federiicaa14'}],bio:'Alto gusto estetico.', adminNotes:'Editor di passione ma alto gusto estetico e qualità',previewKey:''},
  {name:'Carla Foglia',    cat:'Videomaker',          role:'Video Editor',            phone:'+39 351 569 5710',comm:null,  q:'mid',   links:[{l:'🎨 Behance',u:'https://www.behance.net/0d0d4be2'}],bio:'', adminNotes:'Del genere ne ho solo 2, non ha mai lavorato da freelancer per TikTok',previewKey:''},
  {name:'Stefania Galazzo',cat:'Web Developer',       role:'Frontend Developer',      phone:'+39 392 261 5099',comm:null,  q:'top',   links:[{l:'🌐 Portfolio',u:'https://3d-frontend-portfolio-island.pages.dev/'},{l:'💼 LinkedIn',u:'https://www.linkedin.com/in/stefania-galazzo-frontend-developer/'},{l:'💻 GitHub',u:'https://github.com/StefaniaGalazzo'}],bio:'Frontend developer con portfolio 3D/interattivo.', adminNotes:'Competenza elevata',previewKey:'w1'},
  {name:'Lorenzo Trezza',  cat:'Web Developer',       role:'Web Developer',           phone:'+39 366 463 4386',comm:null,  q:'unknown',links:[{l:'🌐 Sito',u:'http://lorenzotrezza.it'}],bio:'', adminNotes:'',previewKey:''},
  {name:'Laura Kira',      cat:'Motion Designer',     role:'Motion Designer',         phone:'+39 347 720 0301',comm:null,  q:'unknown',links:[{l:'🤖 Portfolio',u:'https://hi-me.ai/lauragiangrande'}],bio:'', adminNotes:'Da testare ancora',previewKey:''},
  {name:'Giacomo Iacolare',cat:'Motion Designer',     role:'Motion Designer',         phone:'',               comm:null,  q:'unknown',links:[],bio:'Lavora da Brand and Network.', adminNotes:'',previewKey:''},
  {name:'Leonardo',        cat:'Motion Designer',     role:'Motion Designer',         phone:'+39 389 620 4759',comm:null,  q:'unknown',links:[],bio:'Lavora da Studio Natale.', adminNotes:'',previewKey:''},
  {name:'Stefano',         cat:'3D Artists',          role:'Industrial Designer',     phone:'+39 388 828 5240',comm:null,  q:'unknown',links:[{l:'🌐 Portfolio',u:'https://readymag.website/u1432304388/4783781/'}],bio:'', adminNotes:'',previewKey:''},
];

/* ══════════════════════════════════════════════════════════
   INIT DB
══════════════════════════════════════════════════════════ */
function initDB() {
  const ADMIN_PWD = process.env.ADMIN_PASSWORD || 'Admin2024!';
  let db = readDB();
  let changed = false;
  if (!db.categories || !db.categories.length) { db.categories = DEFAULT_CATS; changed = true; }
  if (!db.users) { db.users = []; changed = true; }
  // Create admin if missing
  const adminExists = db.users.some(u => u.isAdmin);
  if (!adminExists) {
    const admin = {
      id: 'admin_1',
      email: 'giovannirussog22@gmail.com',
      password: hashPwd(ADMIN_PWD),
      name: 'Giovanni',
      isAdmin: true,
      role: null, category: null, phone: '', commission: null,
      links: [], bio: '',
      favorites: [], quality: null, adminNotes: '',
      createdAt: new Date().toISOString(),
    };
    db.users.push(admin);
    changed = true;
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  CREDENZIALI ADMIN (primo avvio)     ║');
    console.log(`║  Email:    giovannirussog22@gmail.com ║`);
    console.log(`║  Password: ${ADMIN_PWD.padEnd(26)} ║`);
    console.log('╚══════════════════════════════════════╝\n');
  }
  // Seed existing contacts if no non-admin users
  const hasContacts = db.users.some(u => !u.isAdmin);
  if (!hasContacts) {
    SEED_CONTACTS.forEach(c => {
      db.users.push({
        id: uid(),
        email: '',       // no email — seeded contacts can register later
        password: null,  // no login until they register
        name: c.name, isAdmin: false,
        role: c.role, category: c.cat,
        phone: c.phone, commission: c.comm,
        links: c.links, bio: c.bio,
        favorites: [],
        quality: c.q,
        adminNotes: c.adminNotes,
        previewKey: c.previewKey || '',
        createdAt: new Date().toISOString(),
        seeded: true,
      });
    });
    changed = true;
  }
  if (!db.categories) db.categories = DEFAULT_CATS;
  if (changed) writeDB(db);
  return db;
}

/* ══════════════════════════════════════════════════════════
   HTTP HELPERS
══════════════════════════════════════════════════════════ */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};
function send(res, status, data) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, { 'Content-Type':'application/json', ...CORS });
  res.end(body);
}
function getBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch(e) { reject(e); } });
    req.on('error', reject);
  });
}
function getAuth(req) {
  const h = req.headers['authorization'] || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  return t ? verifyJWT(t) : null;
}
function requireAuth(req, res) {
  const u = getAuth(req);
  if (!u) { send(res, 401, { error:'Login richiesto' }); return null; }
  return u;
}

/* ══════════════════════════════════════════════════════════
   PREVIEW KEYS → FILE NAMES
══════════════════════════════════════════════════════════ */
const PREVIEW_MAP = {
  g2:['babba-01.jpg','babba-02.jpg','babba-03.jpg'],
  g3:['alek-01.jpg','alek-02.jpg','alek-03.jpg'],
  g6:['riccardo-01.jpg','riccardo-02.jpg','riccardo-03.jpg'],
  g11:['patrizia-01.jpg','patrizia-02.jpg','patrizia-03.jpg'],
  g12:['christian-1.jpg','christian-2.jpg','christian-3.jpg'],
  g13:['paolo-01.jpg','paolo-02.jpg','paolo-03.jpg'],
  g14:['marika-01.jpg','marika-02.jpg','marika-03.jpg'],  // was g18 for marika
  g18:['marika-01.jpg','marika-02.jpg','marika-03.jpg'],
  g20:['mari-01.jpg','mari-02.jpg','mari-03.jpg'],
  w1:['stefania-1.jpg','stefania-2.jpg','stefania-3.jpg'],
};

/* ══════════════════════════════════════════════════════════
   API HANDLERS
══════════════════════════════════════════════════════════ */
async function apiRegister(req, res) {
  const b = await getBody(req);
  const { email, password, name, category, role, phone, commission, links, bio } = b;
  if (!email || !password || !name) return send(res, 400, { error:'Campi obbligatori: email, password, nome' });
  if (password.length < 6) return send(res, 400, { error:'Password minimo 6 caratteri' });
  const db = readDB();
  if (db.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase()))
    return send(res, 409, { error:'Email già registrata' });

  // Check if a seeded contact matches this name (claim profile)
  const seededIdx = db.users.findIndex(u => u.seeded && !u.email &&
    u.name.toLowerCase() === (name||'').toLowerCase());

  let user;
  if (seededIdx !== -1) {
    // Claim existing seeded profile
    user = db.users[seededIdx];
    user.email = email.toLowerCase();
    user.password = hashPwd(password);
    user.seeded = false;
    if (role) user.role = role;
    if (category) user.category = category;
    if (phone) user.phone = phone;
    if (commission !== undefined) user.commission = commission;
    if (links) user.links = links;
    if (bio) user.bio = bio;
  } else {
    user = {
      id: uid(),
      email: email.toLowerCase(),
      password: hashPwd(password),
      name, isAdmin: false,
      role: role || '', category: category || null,
      phone: phone || '', commission: commission || null,
      links: links || [], bio: bio || '',
      favorites: [], quality: 'unknown', adminNotes: '',
      previewKey: '', createdAt: new Date().toISOString(),
    };
    db.users.push(user);
  }
  // Add custom category
  if (category && !db.categories.includes(category)) db.categories.push(category);
  writeDB(db);
  const token = signJWT({ id: user.id, email: user.email, isAdmin: false, exp: Date.now() + 30*24*60*60*1000 });
  const { password: _, ...pub } = user;
  send(res, 201, { token, user: pub });
}

async function apiLogin(req, res) {
  const { email, password } = await getBody(req);
  if (!email || !password) return send(res, 400, { error:'Email e password richiesti' });
  const db = readDB();
  const user = db.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  if (!user || !user.password || user.password !== hashPwd(password))
    return send(res, 401, { error:'Credenziali non valide' });
  const token = signJWT({ id: user.id, email: user.email, isAdmin: !!user.isAdmin, exp: Date.now() + 30*24*60*60*1000 });
  const { password: _, ...pub } = user;
  send(res, 200, { token, user: pub });
}

function apiGetContacts(req, res) {
  const auth = requireAuth(req, res); if (!auth) return;
  const db = readDB();
  const contacts = db.users
    .filter(u => !u.isAdmin)
    .map(u => {
      const isSelf = u.id === auth.id;
      const isAdmin = auth.isAdmin;
      return {
        id: u.id, name: u.name, role: u.role, category: u.category,
        phone: u.phone, commission: u.commission,
        links: u.links, bio: u.bio,
        quality: (isAdmin || isSelf) ? u.quality : null,
        adminNotes: (isAdmin || isSelf) ? u.adminNotes : null,
        previewKey: u.previewKey || '',
        hasAccount: !!u.email,
        createdAt: u.createdAt,
      };
    });
  const me = db.users.find(u => u.id === auth.id);
  send(res, 200, {
    contacts,
    categories: db.categories,
    favorites: me ? (me.favorites||[]) : [],
  });
}

function apiGetProfile(req, res) {
  const auth = requireAuth(req, res); if (!auth) return;
  const db = readDB();
  const user = db.users.find(u => u.id === auth.id);
  if (!user) return send(res, 404, { error:'Utente non trovato' });
  const { password: _, ...pub } = user;
  send(res, 200, { user: pub });
}

async function apiUpdateContact(req, res, id) {
  const auth = requireAuth(req, res); if (!auth) return;
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return send(res, 404, { error:'Non trovato' });
  if (!auth.isAdmin && auth.id !== id) return send(res, 403, { error:'Non autorizzato' });
  const b = await getBody(req);
  const u = db.users[idx];
  // Fields editable by self or admin
  ['name','role','phone','commission','links','bio'].forEach(f => { if (b[f] !== undefined) u[f] = b[f]; });
  if (b.category !== undefined) {
    u.category = b.category;
    if (b.category && !db.categories.includes(b.category)) db.categories.push(b.category);
  }
  // Admin-only
  if (auth.isAdmin) {
    if (b.quality !== undefined) u.quality = b.quality;
    if (b.adminNotes !== undefined) u.adminNotes = b.adminNotes;
    if (b.previewKey !== undefined) u.previewKey = b.previewKey;
  }
  writeDB(db);
  const { password: _, ...pub } = u;
  send(res, 200, { user: pub });
}

async function apiCreateContact(req, res) {
  const auth = requireAuth(req, res); if (!auth) return;
  if (!auth.isAdmin) return send(res, 403, { error:'Solo admin' });
  const b = await getBody(req);
  const { name, category, role, phone, commission, links, bio, quality, adminNotes, previewKey } = b;
  if (!name || !name.trim()) return send(res, 400, { error:'Il nome è obbligatorio' });
  const db = readDB();
  const user = {
    id: uid(),
    email: '',
    password: null,
    name: name.trim(),
    isAdmin: false,
    role:       role       || '',
    category:   category   || null,
    phone:      phone      || '',
    commission: commission || null,
    links:      links      || [],
    bio:        bio        || '',
    favorites:  [],
    quality:    quality    || 'unknown',
    adminNotes: adminNotes || '',
    previewKey: previewKey || '',
    seeded:     false,
    createdAt:  new Date().toISOString(),
  };
  if (category && !db.categories.includes(category)) db.categories.push(category);
  db.users.push(user);
  writeDB(db);
  const { password: _, ...pub } = user;
  send(res, 201, { user: pub });
}

async function apiDeleteContact(req, res, id) {
  const auth = requireAuth(req, res); if (!auth) return;
  if (!auth.isAdmin) return send(res, 403, { error:'Solo admin' });
  const db = readDB();
  db.users = db.users.filter(u => u.id !== id);
  writeDB(db);
  send(res, 200, { ok: true });
}

async function apiToggleFavorite(req, res, id) {
  const auth = requireAuth(req, res); if (!auth) return;
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === auth.id);
  if (idx === -1) return send(res, 404, { error:'Utente non trovato' });
  const favs = db.users[idx].favorites || [];
  const pos = favs.indexOf(id);
  if (pos === -1) favs.push(id); else favs.splice(pos, 1);
  db.users[idx].favorites = favs;
  writeDB(db);
  send(res, 200, { favorites: favs, saved: pos === -1 });
}

async function apiAddCategory(req, res) {
  const auth = requireAuth(req, res); if (!auth) return;
  const { name } = await getBody(req);
  if (!name || name.trim().length < 2) return send(res, 400, { error:'Nome categoria troppo corto' });
  const db = readDB();
  const cat = name.trim();
  if (!db.categories.includes(cat)) { db.categories.push(cat); writeDB(db); }
  send(res, 200, { categories: db.categories });
}

/* ══════════════════════════════════════════════════════════
   STATIC FILES
══════════════════════════════════════════════════════════ */
function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control':'public, max-age=3600' });
    res.end(data);
  });
}
function serveSPA(res) {
  const f = path.join(PUBLIC_DIR, 'index.html');
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(500); res.end('Server error'); return; }
    res.writeHead(200, { 'Content-Type':'text/html' });
    res.end(data);
  });
}

/* ══════════════════════════════════════════════════════════
   ROUTER
══════════════════════════════════════════════════════════ */
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS); return res.end();
  }
  const purl = new URL(req.url, `http://localhost`);
  const p    = purl.pathname;
  const m    = req.method;
  try {
    // API
    if (p.startsWith('/api/')) {
      if (m==='POST' && p==='/api/auth/register')   return await apiRegister(req, res);
      if (m==='POST' && p==='/api/auth/login')       return await apiLogin(req, res);
      if (m==='GET'  && p==='/api/contacts')         return apiGetContacts(req, res);
      if (m==='POST' && p==='/api/contacts')         return await apiCreateContact(req, res);
      if (m==='GET'  && p==='/api/profile')          return apiGetProfile(req, res);
      if (m==='POST' && p==='/api/categories')       return await apiAddCategory(req, res);
      const cm = p.match(/^\/api\/contacts\/([^/]+)$/);
      if (cm) {
        if (m==='PUT')    return await apiUpdateContact(req, res, cm[1]);
        if (m==='DELETE') return await apiDeleteContact(req, res, cm[1]);
      }
      const fm = p.match(/^\/api\/favorites\/([^/]+)$/);
      if (fm && m==='POST') return await apiToggleFavorite(req, res, fm[1]);
      return send(res, 404, { error:'Route non trovata' });
    }
    // Preview images (served from parent previews/ folder)
    if (p.startsWith('/previews/')) {
      const file = path.join(PREVIEW_DIR, path.basename(p));
      return serveFile(res, file);
    }
    // Static public files
    const filePath = p === '/' ? '/index.html' : p;
    const full = path.join(PUBLIC_DIR, filePath);
    // Only serve files that exist, otherwise SPA fallback
    if (path.extname(full) && fs.existsSync(full)) {
      return serveFile(res, full);
    }
    serveSPA(res);
  } catch (e) {
    console.error('Server error:', e.message);
    send(res, 500, { error: 'Errore interno del server' });
  }
});

/* ══════════════════════════════════════════════════════════
   START
══════════════════════════════════════════════════════════ */
initDB();
server.listen(PORT, () => {
  console.log(`\n🚀  Freelancer Hub → http://localhost:${PORT}`);
  console.log(`📁  DB: ${DB_FILE}`);
  console.log(`🖼️   Preview: ${PREVIEW_DIR}\n`);
});
