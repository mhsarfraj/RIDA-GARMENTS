/** RIDA GARMENTS backend. Bind to a Google Sheet (Extensions > Apps Script). Run setup(), then setAdmin(). */
const HEAD = {
  Products: ['ProductID','SKU','Name','Category','Description','Price','OriginalPrice','Images','Sizes','Colors','Material','Care','Stock','LowStock','Status','NewArrival','BestSeller','CreatedAt','UpdatedAt'],
  Settings: ['SettingKey','SettingValue','UpdatedAt'],
  Enquiries: ['EnquiryID','CustomerName','Phone','Type','ProductID','Message','Status','AdminNotes','CreatedAt','UpdatedAt'],
  InventoryHistory: ['MovementID','ProductID','PreviousStock','ChangeQuantity','NewStock','Reason','UpdatedBy','Timestamp'],
  ActivityLogs: ['LogID','Admin','Action','EntityID','Timestamp'],
  Customers: ['CustomerID','Name','Phone','Email','City','Tags','Notes','Source','Stage','TotalSpent','NextFollowUp','LastContact','CreatedAt','UpdatedAt'],
  CustomerNotes: ['NoteID','CustomerID','Type','Text','CreatedAt','By']
};
const SETTING_KEYS = ['store_name','whatsapp','phone','email','address','maps_url','hours','announcement','hero_title','hero_sub','delivery_info','owner_name','owner_title','owner_bio','owner_photo','brand_bg','brand_fg','brand_accent'];
const SS = () => SpreadsheetApp.getActiveSpreadsheet();
const bad = m => new Error('!' + m);

/* ---------- ONE-TIME SETUP (run from the editor) ---------- */
function setup() {
  Object.keys(HEAD).forEach(n => {
    const s = SS().getSheetByName(n) || SS().insertSheet(n);
    if (s.getLastRow() === 0) s.appendRow(HEAD[n]);
  });
  const p = PropertiesService.getScriptProperties();
  ['Enquiries','Customers'].forEach(n => SS().getSheetByName(n).getRange('C:C').setNumberFormat('@')); // keep phone numbers as text
  SS().getSheetByName('Customers').getRange('K:K').setNumberFormat('@');
  if (!p.getProperty('FOLDER_ID')) p.setProperty('FOLDER_ID', DriveApp.createFolder('RIDA Product Images').getId());
  if (SS().getSheetByName('Settings').getLastRow() < 2) put('Settings', {SettingKey:'hero_title', SettingValue:'Style That Speaks for You', UpdatedAt:new Date().toISOString()});
}
/** Edit the two values, run once, then DELETE the password from this file. Only a salted hash is stored. */
function setAdmin() {
  const EMAIL = 'owner@example.com', PASSWORD = 'CHANGE-THIS-PASSWORD';
  if (PASSWORD.length < 12 || PASSWORD === 'CHANGE-THIS-PASSWORD') throw new Error('Choose a password of 12+ characters first.');
  const salt = Utilities.getUuid(), p = PropertiesService.getScriptProperties();
  p.setProperties({ADMIN_EMAIL: EMAIL.toLowerCase(), ADMIN_SALT: salt, ADMIN_HASH: hash(PASSWORD, salt)});
}
function hash(pw, salt) {
  let h = salt + pw;
  for (let i = 0; i < 2000; i++) h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt));
  return h;
}

/* ---------- HTTP ---------- */
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet() {
  try { return out({ok:true, data:publicData()}); } catch (x) { return out({ok:false, error:'Server error'}); }
}
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    return out({ok:true, data:route(d)});
  } catch (x) {
    const m = String(x.message || '');
    return out({ok:false, error: m[0] === '!' ? m.slice(1) : 'Server error. Please try again.'});
  }
}
function route(d) {
  if (d.action === 'login') return login(d);
  if (d.action === 'enquiry') return enquiry(d);
  const user = requireAuth(d.token);
  const A = {listCustomers, saveCustomer, deleteCustomer, addNote, customerNotes, dashboard, adminProducts, saveProduct, deleteProduct, adjustStock, upload, listEnquiries, updateEnquiry, saveSettings, logout};
  if (!A[d.action]) throw bad('Unknown action');
  return A[d.action](d, user);
}

/* ---------- helpers ---------- */
function rows(n) {
  const v = SS().getSheetByName(n).getDataRange().getValues(), h = v.shift();
  return v.map((r, i) => { const o = {_row:i + 2}; h.forEach((k, j) => o[k] = r[j]); return o; });
}
function put(n, o, row) {
  const s = SS().getSheetByName(n), a = HEAD[n].map(k => o[k] === undefined ? '' : o[k]);
  row ? s.getRange(row, 1, 1, a.length).setValues([a]) : s.appendRow(a);
}
function locked(f) { const l = LockService.getScriptLock(); l.waitLock(20000); try { return f(); } finally { l.releaseLock(); } }
const str = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);
function num(v) { v = Number(v); if (!isFinite(v) || v < 0 || v > 1e7) throw bad('Invalid number'); return v; }
function int(v) { v = num(v); if (Math.floor(v) !== v) throw bad('Stock must be a whole number'); return v; }
const split = s => String(s || '').split(/[|,]/).map(x => x.trim()).filter(Boolean);
const now = () => new Date().toISOString();
const id = p => p + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
function log(user, action, entity) { put('ActivityLogs', {LogID:id('L'), Admin:user, Action:action, EntityID:entity, Timestamp:now()}); }
function clearCache() { CacheService.getScriptCache().remove('pub'); }

/* ---------- auth ---------- */
function login(d) {
  const c = CacheService.getScriptCache(), p = PropertiesService.getScriptProperties();
  if (Number(c.get('fails') || 0) >= 5) throw bad('Too many failed attempts. Try again in 15 minutes.');
  const ok = p.getProperty('ADMIN_HASH') && str(d.email, 100).toLowerCase() === p.getProperty('ADMIN_EMAIL') &&
    hash(String(d.password || ''), p.getProperty('ADMIN_SALT')) === p.getProperty('ADMIN_HASH');
  if (!ok) { c.put('fails', String(Number(c.get('fails') || 0) + 1), 900); throw bad('Invalid email or password'); }
  const token = Utilities.getUuid() + Utilities.getUuid();
  c.put('t_' + token, p.getProperty('ADMIN_EMAIL'), 21600); // 6 hours, the Apps Script cache maximum
  return {token, expiresInHours:6};
}
function requireAuth(t) {
  const u = t && CacheService.getScriptCache().get('t_' + t);
  if (!u) throw bad('AUTH');
  return u;
}
function logout(d) { CacheService.getScriptCache().remove('t_' + d.token); return true; }

/* ---------- public ---------- */
function publicData() {
  const c = CacheService.getScriptCache(), h = c.get('pub');
  if (h) return JSON.parse(h);
  const products = rows('Products').filter(r => r.Status === 'Published').map(r => ({
    id:r.ProductID, sku:r.SKU, name:r.Name, category:r.Category, description:r.Description, price:r.Price,
    originalPrice:r.OriginalPrice, images:split(r.Images), sizes:split(r.Sizes), colors:split(r.Colors),
    material:r.Material, care:r.Care, stock:r.Stock, isNew:r.NewArrival === 'Yes', best:r.BestSeller === 'Yes'}));
  const settings = {}; rows('Settings').forEach(r => { if (SETTING_KEYS.includes(r.SettingKey)) settings[r.SettingKey] = r.SettingValue; });
  const res = {products, settings};
  try { c.put('pub', JSON.stringify(res), 300); } catch (x) {}
  return res;
}
function enquiry(d) {
  const name = str(d.name, 80), phone = String(d.phone || '').replace(/[^\d+]/g, ''), msg = str(d.message, 600);
  if (d.website) return true; // honeypot field: bots fill it
  if (!name || !/^\+?\d{10,13}$/.test(phone) || msg.length < 3) throw bad('Please enter a valid name, phone number and message');
  const c = CacheService.getScriptCache(), k = 'e_' + phone;
  if (Number(c.get(k) || 0) >= 3) throw bad('Too many enquiries from this number. Please try later.');
  c.put(k, String(Number(c.get(k) || 0) + 1), 3600);
  locked(() => { put('Enquiries', {EnquiryID:id('Q'), CustomerName:name, Phone:phone, Type:str(d.type, 30) || 'General',
    ProductID:str(d.productId, 20), Message:msg, Status:'New', CreatedAt:now(), UpdatedAt:now()}); upsertLead(name, phone, msg); });
  return true;
}

/* ---------- admin: products ---------- */
function adminProducts() {
  return rows('Products').map(r => { delete r._row; return r; });
}
function saveProduct(d, user) {
  const p = d.product || {};
  const name = str(p.name, 120), sku = str(p.sku, 40).toUpperCase();
  if (!name || !sku) throw bad('Name and SKU are required');
  const price = num(p.price), orig = (p.originalPrice === '' || p.originalPrice == null) ? '' : num(p.originalPrice), stock = int(p.stock);
  if (orig !== '' && orig < price) throw bad('Original price cannot be lower than the selling price');
  const status = ['Draft','Published','Archived'].includes(p.status) ? p.status : 'Draft';
  const imgs = (p.images || []).slice(0, 8);
  imgs.forEach(u => { if (!/^https:\/\/(drive\.google\.com|lh3\.googleusercontent\.com)\//.test(u)) throw bad('Invalid image URL'); });
  return locked(() => {
    const all = rows('Products');
    if (all.some(r => r.SKU === sku && r.ProductID !== p.id)) throw bad('This SKU already exists');
    const old = p.id && all.find(r => r.ProductID === p.id);
    if (p.id && !old) throw bad('Product not found');
    if (old && String(old.UpdatedAt) !== String(p.updatedAt)) throw bad('This product was changed elsewhere. Reload and try again.');
    const o = {ProductID: old ? old.ProductID : id('P'), SKU:sku, Name:name, Category:str(p.category, 60), Description:str(p.description, 2000),
      Price:price, OriginalPrice:orig, Images:imgs.join('|'), Sizes:split(p.sizes).join(','), Colors:split(p.colors).join(','),
      Material:str(p.material, 100), Care:str(p.care, 500), Stock:stock, LowStock:p.lowStock === '' || p.lowStock == null ? 5 : int(p.lowStock), Status:status,
      NewArrival:p.isNew ? 'Yes' : 'No', BestSeller:p.best ? 'Yes' : 'No', CreatedAt: old ? old.CreatedAt : now(), UpdatedAt:now()};
    put('Products', o, old && old._row);
    if (!old || old.Stock !== stock) put('InventoryHistory', {MovementID:id('M'), ProductID:o.ProductID, PreviousStock: old ? old.Stock : 0,
      ChangeQuantity: stock - (old ? old.Stock : 0), NewStock:stock, Reason: old ? 'Edited in product form' : 'Initial stock', UpdatedBy:user, Timestamp:now()});
    log(user, old ? 'update_product' : 'create_product', o.ProductID); clearCache();
    return {id:o.ProductID, updatedAt:o.UpdatedAt};
  });
}
function deleteProduct(d, user) {
  return locked(() => {
    const r = rows('Products').find(x => x.ProductID === d.id);
    if (!r) throw bad('Product not found');
    SS().getSheetByName('Products').deleteRow(r._row);
    log(user, 'delete_product', d.id); clearCache(); return true;
  });
}
function adjustStock(d, user) {
  const delta = Number(d.delta), reason = str(d.reason, 100);
  if (!Number.isInteger(delta) || delta === 0 || !reason) throw bad('Enter a whole-number change and a reason');
  return locked(() => {
    const r = rows('Products').find(x => x.ProductID === d.id);
    if (!r) throw bad('Product not found');
    const n = Number(r.Stock) + delta;
    if (n < 0) throw bad('Stock cannot go below zero');
    SS().getSheetByName('Products').getRange(r._row, HEAD.Products.indexOf('Stock') + 1).setValue(n);
    SS().getSheetByName('Products').getRange(r._row, HEAD.Products.indexOf('UpdatedAt') + 1).setValue(now());
    put('InventoryHistory', {MovementID:id('M'), ProductID:d.id, PreviousStock:r.Stock, ChangeQuantity:delta, NewStock:n, Reason:reason, UpdatedBy:user, Timestamp:now()});
    log(user, 'adjust_stock', d.id); clearCache(); return {stock:n};
  });
}

/* ---------- admin: images ---------- */
function upload(d, user) {
  const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(String(d.data || ''));
  if (!m) throw bad('Only JPG, PNG or WebP images are allowed');
  const bytes = Utilities.base64Decode(m[3]);
  if (bytes.length > 2 * 1024 * 1024) throw bad('Image is larger than 2 MB');
  const folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_ID'));
  const f = folder.createFile(Utilities.newBlob(bytes, m[1], id('IMG') + '.' + m[2].split('/')[1]));
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  log(user, 'upload_image', f.getId());
  return {url:'https://lh3.googleusercontent.com/d/' + f.getId() + '=w1000'};
}

/* ---------- admin: enquiries & settings ---------- */
function listEnquiries() { return rows('Enquiries').reverse().slice(0, 300).map(r => { delete r._row; return r; }); }
function updateEnquiry(d, user) {
  if (!['New','Contacted','Closed'].includes(d.status)) throw bad('Invalid status');
  return locked(() => {
    const r = rows('Enquiries').find(x => x.EnquiryID === d.id);
    if (!r) throw bad('Enquiry not found');
    r.Status = d.status; r.AdminNotes = str(d.notes, 500); r.UpdatedAt = now();
    put('Enquiries', r, r._row); log(user, 'update_enquiry', d.id); return true;
  });
}
function saveSettings(d, user) {
  return locked(() => {
    const ex = rows('Settings'), s = d.settings || {};
    Object.keys(s).filter(k => SETTING_KEYS.includes(k)).forEach(k => {
      const v = str(s[k], 500);
      if (k === 'whatsapp' && v && !/^\d{11,14}$/.test(v)) throw bad('WhatsApp number must be digits with country code, e.g. 919876543210');
      if (k === 'owner_photo' && v && !/^https:\/\/(drive\.google\.com|lh3\.googleusercontent\.com)\//.test(v)) throw bad('Owner photo must be uploaded through the admin');
      if (/^brand_/.test(k) && v && !/^#[0-9a-fA-F]{6}$/.test(v)) throw bad('Colours must look like #5b1226');
      const r = ex.find(x => x.SettingKey === k);
      put('Settings', {SettingKey:k, SettingValue:v, UpdatedAt:now()}, r && r._row);
    });
    log(user, 'save_settings', ''); clearCache(); return true;
  });
}

/* ---------- admin: dashboard (one call: products, enquiries, recent activity and stock history) ---------- */
function dashboard() {
  const last = (n, k) => rows(n).slice(-k).reverse().map(r => { delete r._row; return r; });
  return {customers:listCustomers(), products:adminProducts(), enquiries:listEnquiries(), recent:{activity:last('ActivityLogs', 12), stock:last('InventoryHistory', 30)}};
}

/* ---------- CRM: customers, pipeline, follow-ups, activity ---------- */
const STAGES = ['New Lead','Contacted','Interested','Customer','VIP','Inactive'];
const phoneKey = p => String(p).replace(/\D/g, '').slice(-10);
const dstr = v => v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(v || '').slice(0, 10);
/** Called inside a lock when a website enquiry arrives: creates or refreshes the customer and logs the message. */
function upsertLead(name, phone, msg) {
  const ex = rows('Customers').find(c => phoneKey(c.Phone) === phoneKey(phone));
  const cid = ex ? ex.CustomerID : id('C');
  if (ex) { ex.LastContact = now(); ex.UpdatedAt = now(); if (ex.Stage === 'Inactive') ex.Stage = 'Interested'; put('Customers', ex, ex._row); }
  else put('Customers', {CustomerID:cid, Name:name, Phone:phone, Source:'Website enquiry', Stage:'New Lead', TotalSpent:0, LastContact:now(), CreatedAt:now(), UpdatedAt:now()});
  put('CustomerNotes', {NoteID:id('N'), CustomerID:cid, Type:'Enquiry', Text:msg, CreatedAt:now(), By:'Website'});
}
function listCustomers() {
  return rows('Customers').slice(0, 3000).map(r => { delete r._row; r.NextFollowUp = dstr(r.NextFollowUp); return r; });
}
function saveCustomer(d, user) {
  const c = d.customer || {}, name = str(c.name, 80), phone = String(c.phone || '').replace(/[^\d+]/g, '');
  if (!name) throw bad('Name is required');
  if (!/^\+?\d{10,13}$/.test(phone)) throw bad('Enter a valid phone number');
  const stage = STAGES.includes(c.stage) ? c.stage : 'New Lead', fu = String(c.nextFollowUp || '');
  if (fu && !/^\d{4}-\d{2}-\d{2}$/.test(fu)) throw bad('Invalid follow-up date');
  const spent = (c.totalSpent === '' || c.totalSpent == null) ? 0 : num(c.totalSpent);
  return locked(() => {
    const all = rows('Customers'), old = c.id && all.find(r => r.CustomerID === c.id);
    if (c.id && !old) throw bad('Customer not found');
    if (all.some(r => phoneKey(r.Phone) === phoneKey(phone) && r.CustomerID !== c.id)) throw bad('A customer with this phone number already exists');
    const o = {CustomerID: old ? old.CustomerID : id('C'), Name:name, Phone:phone, Email:str(c.email, 100), City:str(c.city, 60), Tags:split(c.tags).slice(0, 8).join(','),
      Notes:str(c.notes, 1000), Source:str(c.source, 40) || (old ? old.Source : 'Manual'), Stage:stage, TotalSpent:spent, NextFollowUp:fu,
      LastContact: old ? old.LastContact : '', CreatedAt: old ? old.CreatedAt : now(), UpdatedAt:now()};
    put('Customers', o, old && old._row);
    log(user, old ? 'update_customer' : 'create_customer', o.CustomerID); return {id:o.CustomerID};
  });
}
function deleteCustomer(d, user) {
  return locked(() => {
    const c = rows('Customers').find(x => x.CustomerID === d.id);
    if (!c) throw bad('Customer not found');
    const sh = SS().getSheetByName('CustomerNotes');
    rows('CustomerNotes').filter(n => n.CustomerID === d.id).map(n => n._row).sort((a, b) => b - a).forEach(r => sh.deleteRow(r));
    SS().getSheetByName('Customers').deleteRow(c._row); log(user, 'delete_customer', d.id); return true;
  });
}
function addNote(d, user) {
  const type = ['Note','Call','WhatsApp','Visit'].includes(d.type) ? d.type : 'Note', text = str(d.text, 500);
  if (!text) throw bad('Write a note first');
  return locked(() => {
    const c = rows('Customers').find(x => x.CustomerID === d.id);
    if (!c) throw bad('Customer not found');
    put('CustomerNotes', {NoteID:id('N'), CustomerID:d.id, Type:type, Text:text, CreatedAt:now(), By:user});
    if (type !== 'Note') { c.LastContact = now(); put('Customers', c, c._row); }
    return true;
  });
}
function customerNotes(d) {
  return rows('CustomerNotes').filter(n => n.CustomerID === d.id).reverse().slice(0, 60).map(n => { delete n._row; return n; });
}
