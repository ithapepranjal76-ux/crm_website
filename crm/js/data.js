/* ============================================================
   CRM DATA LAYER
   All data lives in localStorage. This file defines the schema,
   seed data (first run only) and small CRUD helpers that every
   other module (leads.js, clients.js, ...) builds on.
   ============================================================ */

const DB_KEYS = {
  users: 'crm_users',
  leads: 'crm_leads',
  clients: 'crm_clients',
  services: 'crm_services',
  tasks: 'crm_tasks',
  quotations: 'crm_quotations',
  invoices: 'crm_invoices',
  payments: 'crm_payments',
  notifications: 'crm_notifications',
  session: 'crm_session',
  seeded: 'crm_seeded_v1'
};

const ROLES = ['Admin', 'Sales', 'Employee', 'Accountant'];

const DB = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('DB read failed', key, e);
      return [];
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  insert(key, record) {
    const list = DB.get(key);
    list.push(record);
    DB.set(key, list);
    return record;
  },
  update(key, id, patch) {
    const list = DB.get(key);
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    DB.set(key, list);
    return list[idx];
  },
  remove(key, id) {
    const list = DB.get(key).filter(r => r.id !== id);
    DB.set(key, list);
  },
  find(key, id) {
    return DB.get(key).find(r => r.id === id) || null;
  }
};

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function nowISO() {
  return new Date().toISOString();
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtMoney(n) {
  n = Number(n) || 0;
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function daysUntil(iso) {
  if (!iso) return null;
  const diff = new Date(iso).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
  return Math.round(diff / 86400000);
}

/* ---------------- SEED DATA (first run only) ---------------- */
function seedIfNeeded() {
  if (localStorage.getItem(DB_KEYS.seeded)) return;

  const users = [
    { id: uid('usr'), name: 'Aarav Mehta', email: 'admin@demo.com', password: 'admin123', role: 'Admin' },
    { id: uid('usr'), name: 'Priya Sharma', email: 'sales@demo.com', password: 'sales123', role: 'Sales' },
    { id: uid('usr'), name: 'Rohan Verma', email: 'employee@demo.com', password: 'emp123', role: 'Employee' },
    { id: uid('usr'), name: 'Neha Kapoor', email: 'accounts@demo.com', password: 'acc123', role: 'Accountant' }
  ];
  DB.set(DB_KEYS.users, users);

  const salesUser = users[1].id;
  const empUser = users[2].id;

  const services = [
    { id: uid('srv'), name: 'Website Development', description: 'Custom responsive website', price: 25000 },
    { id: uid('srv'), name: 'SEO – Monthly', description: 'Search engine optimisation retainer', price: 8000 },
    { id: uid('srv'), name: 'Social Media Management', description: 'Content + posting, monthly', price: 12000 },
    { id: uid('srv'), name: 'Logo & Branding', description: 'Logo, brand guide, stationery', price: 15000 }
  ];
  DB.set(DB_KEYS.services, services);

  const leads = [
    {
      id: uid('lead'), name: 'Vikram Singh', phone: '+919876543210', email: 'vikram@brightretail.com',
      company: 'Bright Retail Pvt Ltd', source: 'Website', status: 'New', assignedTo: salesUser,
      notes: 'Interested in a new e-commerce website.', createdAt: nowISO(), followUps: []
    },
    {
      id: uid('lead'), name: 'Sunita Rao', phone: '+919812345678', email: 'sunita@raodesigns.in',
      company: 'Rao Interior Designs', source: 'Referral', status: 'Contacted', assignedTo: salesUser,
      notes: 'Wants branding + Instagram management.', createdAt: nowISO(),
      followUps: [{ id: uid('fu'), date: nowISO(), note: 'Introductory call done, sending proposal.', nextFollowUpDate: new Date(Date.now() + 2*86400000).toISOString(), by: salesUser }]
    },
    {
      id: uid('lead'), name: 'Imran Khan', phone: '+919900112233', email: 'imran@khanlogistics.com',
      company: 'Khan Logistics', source: 'Cold Call', status: 'Qualified', assignedTo: salesUser,
      notes: 'Budget confirmed, wants SEO retainer.', createdAt: nowISO(), followUps: []
    }
  ];
  DB.set(DB_KEYS.leads, leads);
  DB.set(DB_KEYS.clients, []);
  DB.set(DB_KEYS.tasks, []);
  DB.set(DB_KEYS.quotations, []);
  DB.set(DB_KEYS.invoices, []);
  DB.set(DB_KEYS.payments, []);

  DB.set(DB_KEYS.notifications, [
    { id: uid('ntf'), message: 'Follow-up due with Sunita Rao', relatedType: 'lead', relatedId: leads[1].id, date: new Date(Date.now()+2*86400000).toISOString(), read: false }
  ]);

  localStorage.setItem(DB_KEYS.seeded, '1');
}

function currentUser() {
  const raw = sessionStorage.getItem(DB_KEYS.session);
  return raw ? JSON.parse(raw) : null;
}

function setCurrentUser(user) {
  sessionStorage.setItem(DB_KEYS.session, JSON.stringify(user));
}

function logout() {
  sessionStorage.removeItem(DB_KEYS.session);
  window.location.href = 'index.html';
}

function requireAuth() {
  const u = currentUser();
  if (!u) {
    window.location.href = 'index.html';
    return null;
  }
  return u;
}

function userName(id) {
  const u = DB.find(DB_KEYS.users, id);
  return u ? u.name : '—';
}
