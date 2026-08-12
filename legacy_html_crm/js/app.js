/* ============================================================
   CRM APPLICATION LOGIC
   ============================================================ */

seedIfNeeded();
const CU = requireAuth();

/* ---------------- Role permission map ---------------- */
const PERMS = {
  Admin:       { leads:'full', clients:'full', tasks:'full', billing:'full', payments:'full', users:'full', reports:'full' },
  Sales:       { leads:'full', clients:'full', tasks:'full', billing:'full', payments:'view', users:'none', reports:'none' },
  Employee:    { leads:'none', clients:'view', tasks:'own',  billing:'none', payments:'none', users:'none', reports:'none' },
  Accountant:  { leads:'none', clients:'view', tasks:'view', billing:'full', payments:'full', users:'none', reports:'full' }
};
function perm(area) { return PERMS[CU.role][area]; }

/* ================================================================
   BOOTSTRAP
   ================================================================ */
document.getElementById('sbName').textContent = CU.name;
document.getElementById('sbRole').textContent = CU.role;
document.getElementById('sbAvatar').textContent = CU.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

document.querySelectorAll('.nav-item[data-section]').forEach(item => {
  const roles = item.dataset.roles.split(',');
  if (!roles.includes(CU.role)) { item.classList.add('perm-hidden'); return; }
  item.addEventListener('click', () => goToSection(item.dataset.section));
});
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('menuToggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', () => goToSection(el.dataset.nav)));

const SECTION_TITLES = {
  dashboard:'Dashboard', leads:'Leads & Follow-ups', clients:'Clients', tasks:'Services & Tasks',
  quotations:'Quotations & Invoices', payments:'Payment Tracking', notifications:'Notifications & Reminders',
  reports:'Dashboard & Reports', users:'Team & Roles'
};
const RENDERERS = {
  dashboard: renderDashboard, leads: renderLeads, clients: renderClients, tasks: renderTasks,
  quotations: renderBilling, payments: renderPayments, notifications: renderNotifications,
  reports: renderReports, users: renderUsers
};
function goToSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-' + name).classList.add('active');
  document.querySelectorAll('.nav-item[data-section]').forEach(n => n.classList.toggle('active', n.dataset.section === name));
  document.getElementById('pageTitle').textContent = SECTION_TITLES[name];
  document.getElementById('sidebar').classList.remove('open');
  RENDERERS[name] && RENDERERS[name]();
}

/* ---------------- Toasts ---------------- */
function toast(msg, type = '') {
  const host = document.getElementById('toast-host');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  host.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ---------------- Modal helpers ---------------- */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.remove('open'));
});
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
});

function statusBadge(status) {
  const map = {
    New:'badge-blue', Contacted:'badge-amber', Qualified:'badge-purple', Converted:'badge-green', Lost:'badge-gray',
    Pending:'badge-gray', 'In Progress':'badge-amber', Completed:'badge-green',
    Draft:'badge-gray', Sent:'badge-blue', Accepted:'badge-green', Rejected:'badge-red',
    Unpaid:'badge-red', 'Partially Paid':'badge-amber', Paid:'badge-green',
    Low:'badge-gray', Medium:'badge-amber', High:'badge-red'
  };
  return `<span class="badge ${map[status] || 'badge-gray'}"><span class="badge-dot-sm"></span>${status}</span>`;
}

function initialsAvatar(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}

function emptyState(icon, title, sub, actionHtml) {
  return `<div class="empty-state">${icon}<h4>${title}</h4><p>${sub}</p>${actionHtml || ''}</div>`;
}
const ICON_EMPTY = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/></svg>`;

/* Populate a <select> with users (optionally filtered by role) */
function fillUserSelect(sel, roles) {
  const users = DB.get(DB_KEYS.users).filter(u => !roles || roles.includes(u.role));
  sel.innerHTML = users.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');
}
function fillClientSelect(sel) {
  const clients = DB.get(DB_KEYS.clients);
  sel.innerHTML = '<option value="">— Select client —</option>' + clients.map(c => `<option value="${c.id}">${c.name}${c.company ? ' · ' + c.company : ''}</option>`).join('');
}
function fillServiceSelect(sel) {
  const services = DB.get(DB_KEYS.services);
  sel.innerHTML = '<option value="">— None —</option>' + services.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

/* ================================================================
   NOTIFICATIONS ENGINE — derives reminders from real data
   ================================================================ */
function computeLiveNotifications() {
  const notifs = [];
  const leads = DB.get(DB_KEYS.leads);
  leads.filter(l => !['Converted','Lost'].includes(l.status)).forEach(l => {
    const lastFu = l.followUps[l.followUps.length - 1];
    if (lastFu && lastFu.nextFollowUpDate) {
      const d = daysUntil(lastFu.nextFollowUpDate);
      if (d !== null && d <= 1) {
        notifs.push({ id: 'fu_' + l.id, type: d < 0 ? 'overdue' : 'due', message: `Follow-up ${d < 0 ? 'overdue' : 'due'} with ${l.name}${l.company ? ' (' + l.company + ')' : ''}`, date: lastFu.nextFollowUpDate, section:'leads' });
      }
    }
  });
  const invoices = DB.get(DB_KEYS.invoices);
  invoices.filter(i => i.status !== 'Paid').forEach(inv => {
    const d = daysUntil(inv.dueDate);
    if (d !== null && d <= 2) {
      const c = DB.find(DB_KEYS.clients, inv.clientId);
      notifs.push({ id: 'inv_' + inv.id, type: d < 0 ? 'overdue' : 'due', message: `Invoice ${inv.number || inv.id.slice(-5)} for ${c ? c.name : 'client'} ${d < 0 ? 'is overdue' : 'due soon'} — ${fmtMoney(inv.total)}`, date: inv.dueDate, section:'quotations' });
    }
  });
  const tasks = DB.get(DB_KEYS.tasks);
  tasks.filter(t => t.status !== 'Completed').forEach(t => {
    const d = daysUntil(t.dueDate);
    if (d !== null && d <= 1) {
      notifs.push({ id: 'task_' + t.id, type: d < 0 ? 'overdue' : 'due', message: `Task "${t.title}" ${d < 0 ? 'overdue' : 'due soon'} (${userName(t.assignedTo)})`, date: t.dueDate, section:'tasks' });
    }
  });
  return notifs.sort((a,b) => new Date(a.date) - new Date(b.date));
}
function refreshBell() {
  const n = computeLiveNotifications();
  const badge = document.getElementById('bellCount');
  if (n.length) { badge.textContent = n.length; badge.classList.remove('perm-hidden'); }
  else badge.classList.add('perm-hidden');
}
document.getElementById('bellBtn').addEventListener('click', () => goToSection('notifications'));

function renderNotifications() {
  const wrap = document.getElementById('notifList');
  const live = computeLiveNotifications();
  if (!live.length) {
    wrap.innerHTML = emptyState(ICON_EMPTY, 'All caught up', 'No follow-ups, invoices or tasks need attention right now.');
    return;
  }
  wrap.innerHTML = live.map(n => `
    <div style="display:flex;align-items:center;justify-content:between;gap:12px;padding:16px 20px;border-bottom:1px solid var(--slate-100);">
      <div style="display:flex;gap:12px;align-items:flex-start;flex:1;">
        <span class="badge ${n.type === 'overdue' ? 'badge-red' : 'badge-amber'}" style="margin-top:2px;">${n.type === 'overdue' ? 'Overdue' : 'Due'}</span>
        <div>
          <div style="font-size:13.5px;font-weight:500;">${n.message}</div>
          <div class="small-muted" style="margin-top:2px;">${fmtDate(n.date)}</div>
        </div>
      </div>
      <button class="btn btn-outline btn-sm" data-goto="${n.section}">Open</button>
    </div>`).join('');
  wrap.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => goToSection(b.dataset.goto)));
}
document.getElementById('markAllReadBtn').addEventListener('click', () => toast('All reminders reviewed for now — new ones will appear as dates approach.'));

/* ================================================================
   DASHBOARD
   ================================================================ */
function renderDashboard() {
  const leads = DB.get(DB_KEYS.leads);
  const clients = DB.get(DB_KEYS.clients);
  const invoices = DB.get(DB_KEYS.invoices);
  const payments = DB.get(DB_KEYS.payments);
  const tasks = DB.get(DB_KEYS.tasks);

  const totalRevenue = payments.reduce((s,p) => s + Number(p.amount), 0);
  const openLeads = leads.filter(l => !['Converted','Lost'].includes(l.status)).length;
  const dueInvoiceAmt = invoices.filter(i => i.status !== 'Paid').reduce((s,i) => s + (i.total - paidForInvoice(i.id)), 0);
  const openTasks = tasks.filter(t => t.status !== 'Completed').length;

  const stats = [
    { label:'Open Leads', value: openLeads, icon:'📇', bg:'var(--blue-bg)', color:'var(--blue)' },
    { label:'Total Clients', value: clients.length, icon:'🤝', bg:'var(--green-bg)', color:'var(--green)' },
    { label:'Revenue Collected', value: fmtMoney(totalRevenue), icon:'💰', bg:'#FEF1DC', color:'var(--amber-600)' },
    { label:'Amount Due', value: fmtMoney(dueInvoiceAmt), icon:'⏳', bg:'var(--red-bg)', color:'var(--red)' }
  ];
  document.getElementById('statGrid').innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="top"><span class="label">${s.label}</span><span class="icon" style="background:${s.bg};color:${s.color};">${s.icon}</span></div>
      <div class="value">${s.value}</div>
    </div>`).join('');

  // Follow-ups due
  const fuRows = leads
    .filter(l => !['Converted','Lost'].includes(l.status) && l.followUps.length)
    .map(l => ({ lead:l, fu: l.followUps[l.followUps.length-1] }))
    .filter(x => x.fu.nextFollowUpDate)
    .sort((a,b) => new Date(a.fu.nextFollowUpDate) - new Date(b.fu.nextFollowUpDate))
    .slice(0,6);
  const fuWrap = document.getElementById('dashFollowUps');
  if (!fuRows.length) {
    fuWrap.innerHTML = emptyState(ICON_EMPTY, 'Nothing scheduled', 'Follow-up reminders you set on leads will show up here.');
  } else {
    fuWrap.innerHTML = `<table><tbody>${fuRows.map(({lead,fu}) => `
      <tr>
        <td><div class="cell-name">${lead.name}</div><div class="cell-sub">${lead.company||''}</div></td>
        <td>${statusBadge(lead.status)}</td>
        <td>${fmtDate(fu.nextFollowUpDate)}</td>
        <td class="row-actions"><button class="btn btn-sm btn-outline" data-open-lead="${lead.id}">Open</button></td>
      </tr>`).join('')}</tbody></table>`;
    fuWrap.querySelectorAll('[data-open-lead]').forEach(b => b.addEventListener('click', () => openLeadDetail(b.dataset.openLead)));
  }

  // Recent activity feed (leads + follow-ups + payments, latest first)
  const events = [];
  leads.forEach(l => {
    events.push({ date:l.createdAt, text:`New lead added: ${l.name}` });
    l.followUps.forEach(f => events.push({ date:f.date, text:`Follow-up logged for ${l.name}: “${f.note.slice(0,50)}${f.note.length>50?'…':''}”` }));
  });
  payments.forEach(p => { const inv = DB.find(DB_KEYS.invoices,p.invoiceId); const c = inv ? DB.find(DB_KEYS.clients,inv.clientId) : null; events.push({ date:p.date, text:`Payment of ${fmtMoney(p.amount)} received${c?' from '+c.name:''}` }); });
  events.sort((a,b) => new Date(b.date) - new Date(a.date));
  const actWrap = document.getElementById('dashActivity');
  actWrap.innerHTML = events.slice(0,7).map(e => `
    <div class="timeline-item"><div class="t-date">${fmtDateTime(e.date)}</div><div class="t-note">${e.text}</div></div>`).join('') || '<p class="small-muted">No activity yet.</p>';

  // Call list: open leads + a few clients
  const callables = [...leads.filter(l => !['Converted','Lost'].includes(l.status)), ...clients].slice(0,6);
  const callWrap = document.getElementById('dashCallList');
  if (!callables.length) {
    callWrap.innerHTML = emptyState(ICON_EMPTY, 'No one to call yet', 'Add a lead to start logging calls.');
  } else {
    callWrap.innerHTML = `<table><tbody>${callables.map(p => `
      <tr>
        <td><div class="cell-name">${p.name}</div><div class="cell-sub">${p.company||p.email||''}</div></td>
        <td>${p.phone||'—'}</td>
        <td>${p.status ? statusBadge(p.status) : statusBadge('Converted')}</td>
        <td class="row-actions"><button class="btn btn-amber btn-sm" data-call="${p.id}" data-kind="${p.status ? 'lead':'client'}">📞 Call</button></td>
      </tr>`).join('')}</tbody></table>`;
    callWrap.querySelectorAll('[data-call]').forEach(b => b.addEventListener('click', () => startCall(b.dataset.call, b.dataset.kind)));
  }

  refreshBell();
}

/* ================================================================
   LEADS
   ================================================================ */
let leadFilterStatus = 'All';
const LEAD_STATUSES = ['All','New','Contacted','Qualified','Converted','Lost'];

function renderLeadTabs() {
  const wrap = document.getElementById('leadStatusTabs');
  wrap.innerHTML = LEAD_STATUSES.map(s => `<button class="pill-tab ${s===leadFilterStatus?'active':''}" data-status="${s}">${s}</button>`).join('');
  wrap.querySelectorAll('.pill-tab').forEach(b => b.addEventListener('click', () => { leadFilterStatus = b.dataset.status; renderLeads(); }));
}

function renderLeads() {
  renderLeadTabs();
  const search = (document.getElementById('leadSearch').value || '').toLowerCase();
  let leads = DB.get(DB_KEYS.leads);
  if (leadFilterStatus !== 'All') leads = leads.filter(l => l.status === leadFilterStatus);
  if (search) leads = leads.filter(l => [l.name,l.company,l.phone,l.email].join(' ').toLowerCase().includes(search));
  leads.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  const wrap = document.getElementById('leadTable');
  if (!leads.length) {
    wrap.innerHTML = emptyState(ICON_EMPTY, 'No leads found', 'Try a different filter, or add your first lead.',
      '<button class="btn btn-primary btn-sm" onclick="openAddLead()">+ Add Lead</button>');
    return;
  }
  wrap.innerHTML = `<table>
    <thead><tr><th>Lead</th><th>Contact</th><th>Source</th><th>Assigned</th><th>Status</th><th></th></tr></thead>
    <tbody>${leads.map(l => `
      <tr>
        <td><div class="cell-name">${l.name}</div><div class="cell-sub">${l.company||''}</div></td>
        <td>${l.phone}<div class="cell-sub">${l.email||''}</div></td>
        <td>${l.source}</td>
        <td>${userName(l.assignedTo)}</td>
        <td>${statusBadge(l.status)}</td>
        <td class="row-actions">
          <button class="btn btn-sm btn-amber" data-call="${l.id}" title="Call">📞</button>
          <button class="btn btn-sm btn-outline" data-open="${l.id}">Open</button>
        </td>
      </tr>`).join('')}</tbody></table>`;
  wrap.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openLeadDetail(b.dataset.open)));
  wrap.querySelectorAll('[data-call]').forEach(b => b.addEventListener('click', () => startCall(b.dataset.call,'lead')));
}
document.getElementById('leadSearch').addEventListener('input', renderLeads);

function openAddLead(prefillPhone, prefillName) {
  document.getElementById('leadModalTitle').textContent = 'Add Lead';
  document.getElementById('leadForm').reset();
  document.getElementById('leadId').value = '';
  document.getElementById('leadName').value = prefillName || '';
  document.getElementById('leadPhone').value = prefillPhone || '';
  fillUserSelect(document.getElementById('leadAssignedTo'), ['Sales','Admin']);
  document.getElementById('leadAssignedTo').value = CU.role === 'Sales' ? CU.id : document.getElementById('leadAssignedTo').value;
  openModal('modal-lead');
}
document.getElementById('addLeadBtn').addEventListener('click', () => openAddLead());

document.getElementById('saveLeadBtn').addEventListener('click', () => {
  const name = document.getElementById('leadName').value.trim();
  const phone = document.getElementById('leadPhone').value.trim();
  if (!name || !phone) { toast('Name and phone are required', 'error'); return; }
  const id = document.getElementById('leadId').value;
  const payload = {
    name, phone,
    email: document.getElementById('leadEmail').value.trim(),
    company: document.getElementById('leadCompany').value.trim(),
    source: document.getElementById('leadSource').value,
    assignedTo: document.getElementById('leadAssignedTo').value,
    notes: document.getElementById('leadNotes').value.trim()
  };
  if (id) {
    DB.update(DB_KEYS.leads, id, payload);
    toast('Lead updated', 'success');
  } else {
    DB.insert(DB_KEYS.leads, { id: uid('lead'), status:'New', createdAt: nowISO(), followUps:[], ...payload });
    toast('Lead added', 'success');
  }
  closeModal('modal-lead');
  renderLeads(); renderDashboard();
});

let activeLeadId = null;
function openLeadDetail(id) {
  const lead = DB.find(DB_KEYS.leads, id);
  if (!lead) return;
  activeLeadId = id;
  document.getElementById('leadDetailName').textContent = lead.name;
  document.getElementById('ldPhone').textContent = lead.phone;
  document.getElementById('ldEmail').textContent = lead.email || '—';
  document.getElementById('ldCompany').textContent = lead.company || '—';
  document.getElementById('ldSource').textContent = lead.source;
  document.getElementById('ldAssigned').textContent = userName(lead.assignedTo);
  document.getElementById('ldStatus').innerHTML = statusBadge(lead.status);
  document.getElementById('fuNote').value = '';
  document.getElementById('fuNextDate').value = '';
  document.getElementById('fuStatus').value = lead.status === 'Converted' ? 'Qualified' : lead.status;
  const hist = document.getElementById('ldHistory');
  hist.innerHTML = lead.followUps.length
    ? [...lead.followUps].reverse().map(f => `<div class="timeline-item"><div class="t-date">${fmtDateTime(f.date)} · ${userName(f.by)}</div><div class="t-note">${f.note}</div>${f.nextFollowUpDate?`<div class="small-muted">Next: ${fmtDate(f.nextFollowUpDate)}</div>`:''}</div>`).join('')
    : '<p class="small-muted">No follow-ups logged yet.</p>';
  document.getElementById('convertLeadBtn').style.display = lead.status === 'Converted' ? 'none' : '';
  openModal('modal-leadDetail');
}

document.getElementById('saveFollowUpBtn').addEventListener('click', () => {
  const note = document.getElementById('fuNote').value.trim();
  if (!note) { toast('Add a note describing the follow-up', 'error'); return; }
  const lead = DB.find(DB_KEYS.leads, activeLeadId);
  const fu = { id: uid('fu'), date: nowISO(), note, nextFollowUpDate: document.getElementById('fuNextDate').value ? new Date(document.getElementById('fuNextDate').value).toISOString() : null, by: CU.id };
  lead.followUps.push(fu);
  lead.status = document.getElementById('fuStatus').value;
  DB.update(DB_KEYS.leads, activeLeadId, { followUps: lead.followUps, status: lead.status });
  toast('Follow-up saved', 'success');
  openLeadDetail(activeLeadId);
  renderLeads(); renderDashboard(); refreshBell();
});

document.getElementById('markLostBtn').addEventListener('click', () => {
  DB.update(DB_KEYS.leads, activeLeadId, { status:'Lost' });
  toast('Lead marked as lost');
  closeModal('modal-leadDetail');
  renderLeads(); renderDashboard();
});

document.getElementById('convertLeadBtn').addEventListener('click', () => {
  const lead = DB.find(DB_KEYS.leads, activeLeadId);
  document.getElementById('convLeadId').value = lead.id;
  document.getElementById('convLeadName').textContent = lead.name;
  document.getElementById('convAddress').value = '';
  closeModal('modal-leadDetail');
  openModal('modal-convert');
});
document.getElementById('confirmConvertBtn').addEventListener('click', () => {
  const leadId = document.getElementById('convLeadId').value;
  const lead = DB.find(DB_KEYS.leads, leadId);
  const client = {
    id: uid('cli'), leadId: lead.id, name: lead.name, phone: lead.phone, email: lead.email,
    company: lead.company, address: document.getElementById('convAddress').value.trim(),
    assignedTo: lead.assignedTo, convertedAt: nowISO()
  };
  DB.insert(DB_KEYS.clients, client);
  DB.update(DB_KEYS.leads, leadId, { status:'Converted' });
  toast(`${lead.name} converted to client 🎉`, 'success');
  closeModal('modal-convert');
  renderLeads(); renderClients(); renderDashboard();
});

/* ================================================================
   CLIENTS
   ================================================================ */
function renderClients() {
  document.getElementById('addClientBtn').classList.toggle('perm-hidden', perm('clients') !== 'full');
  const search = (document.getElementById('clientSearch').value || '').toLowerCase();
  let clients = DB.get(DB_KEYS.clients);
  if (search) clients = clients.filter(c => [c.name,c.company,c.phone,c.email].join(' ').toLowerCase().includes(search));
  clients.sort((a,b) => new Date(b.convertedAt) - new Date(a.convertedAt));

  const wrap = document.getElementById('clientTable');
  if (!clients.length) {
    wrap.innerHTML = emptyState(ICON_EMPTY, 'No clients yet', 'Convert a qualified lead, or add a client directly.');
    return;
  }
  wrap.innerHTML = `<table>
    <thead><tr><th>Client</th><th>Contact</th><th>Client since</th><th>Balance due</th><th></th></tr></thead>
    <tbody>${clients.map(c => {
      const bal = clientBalance(c.id);
      return `<tr>
        <td><div class="cell-name">${c.name}</div><div class="cell-sub">${c.company||''}</div></td>
        <td>${c.phone||'—'}<div class="cell-sub">${c.email||''}</div></td>
        <td>${fmtDate(c.convertedAt)}</td>
        <td>${bal > 0 ? `<span class="badge badge-red">${fmtMoney(bal)}</span>` : `<span class="badge badge-green">Settled</span>`}</td>
        <td class="row-actions">
          <button class="btn btn-sm btn-amber" data-call="${c.id}" title="Call">📞</button>
          <button class="btn btn-sm btn-outline" data-open="${c.id}">Open</button>
        </td>
      </tr>`;
    }).join('')}</tbody></table>`;
  wrap.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openClientDetail(b.dataset.open)));
  wrap.querySelectorAll('[data-call]').forEach(b => b.addEventListener('click', () => startCall(b.dataset.call,'client')));
}
document.getElementById('clientSearch').addEventListener('input', renderClients);
document.getElementById('addClientBtn').addEventListener('click', () => { document.getElementById('clientForm').reset(); openModal('modal-client'); });
document.getElementById('saveClientBtn').addEventListener('click', () => {
  const name = document.getElementById('clientName').value.trim();
  const phone = document.getElementById('clientPhone').value.trim();
  if (!name || !phone) { toast('Name and phone are required', 'error'); return; }
  DB.insert(DB_KEYS.clients, {
    id: uid('cli'), leadId:null, name, phone,
    email: document.getElementById('clientEmail').value.trim(),
    company: document.getElementById('clientCompany').value.trim(),
    address: document.getElementById('clientAddress').value.trim(),
    assignedTo: CU.id, convertedAt: nowISO()
  });
  toast('Client added', 'success');
  closeModal('modal-client');
  renderClients(); renderDashboard();
});

function clientInvoices(clientId) { return DB.get(DB_KEYS.invoices).filter(i => i.clientId === clientId); }
function paidForInvoice(invoiceId) { return DB.get(DB_KEYS.payments).filter(p => p.invoiceId === invoiceId).reduce((s,p) => s + Number(p.amount), 0); }
function clientBalance(clientId) { return clientInvoices(clientId).reduce((s,i) => s + (i.total - paidForInvoice(i.id)), 0); }

function openClientDetail(id) {
  const c = DB.find(DB_KEYS.clients, id);
  if (!c) return;
  document.getElementById('cdName').textContent = c.name;
  document.getElementById('cdPhone').textContent = c.phone || '—';
  document.getElementById('cdEmail').textContent = c.email || '—';
  document.getElementById('cdCompany').textContent = c.company || '—';
  document.getElementById('cdSince').textContent = fmtDate(c.convertedAt);
  const invs = clientInvoices(id);
  const invoiced = invs.reduce((s,i) => s+i.total, 0);
  const paid = invs.reduce((s,i) => s + paidForInvoice(i.id), 0);
  document.getElementById('cdInvoiced').textContent = fmtMoney(invoiced);
  document.getElementById('cdPaid').textContent = fmtMoney(paid);
  document.getElementById('cdDue').textContent = fmtMoney(invoiced - paid);
  const tasks = DB.get(DB_KEYS.tasks).filter(t => t.clientId === id);
  document.getElementById('cdTasks').innerHTML = tasks.length
    ? tasks.map(t => `<div class="kv"><span class="k">${t.title}</span><span class="v">${statusBadge(t.status)}</span></div>`).join('')
    : '<p class="small-muted">No tasks yet.</p>';
  openModal('modal-clientDetail');
}

/* ================================================================
   SERVICES & TASKS
   ================================================================ */
function renderServiceList() {
  const services = DB.get(DB_KEYS.services);
  document.getElementById('serviceList').innerHTML = services.map(s => `
    <div class="kv"><span class="k">${s.name}<div class="small-muted">${s.description||''}</div></span><span class="v">${fmtMoney(s.price)}</span></div>`).join('') || '<p class="small-muted">No services yet.</p>';
}
document.getElementById('manageServicesBtn').addEventListener('click', () => { renderServiceList(); openModal('modal-services'); });
document.getElementById('addServiceBtn').addEventListener('click', () => {
  const name = document.getElementById('svcName').value.trim();
  const price = Number(document.getElementById('svcPrice').value) || 0;
  if (!name) { toast('Service name required', 'error'); return; }
  DB.insert(DB_KEYS.services, { id: uid('srv'), name, price, description: document.getElementById('svcDesc').value.trim() });
  document.getElementById('svcName').value=''; document.getElementById('svcPrice').value=''; document.getElementById('svcDesc').value='';
  renderServiceList();
  toast('Service added', 'success');
});

let taskFilterStatus = 'All';
const TASK_STATUSES = ['All','Pending','In Progress','Completed'];
function renderTaskTabs() {
  const wrap = document.getElementById('taskStatusTabs');
  wrap.innerHTML = TASK_STATUSES.map(s => `<button class="pill-tab ${s===taskFilterStatus?'active':''}" data-tstatus="${s}">${s}</button>`).join('');
  wrap.querySelectorAll('.pill-tab').forEach(b => b.addEventListener('click', () => { taskFilterStatus = b.dataset.tstatus; renderTasks(); }));
}
function renderTasks() {
  renderTaskTabs();
  let tasks = DB.get(DB_KEYS.tasks);
  if (perm('tasks') === 'own') tasks = tasks.filter(t => t.assignedTo === CU.id);
  if (taskFilterStatus !== 'All') tasks = tasks.filter(t => t.status === taskFilterStatus);
  tasks.sort((a,b) => new Date(a.dueDate||0) - new Date(b.dueDate||0));

  document.getElementById('addTaskBtn').classList.toggle('perm-hidden', perm('tasks') === 'own' || perm('tasks') === 'view');
  document.getElementById('manageServicesBtn').classList.toggle('perm-hidden', perm('tasks') === 'own' || perm('tasks') === 'view');

  const wrap = document.getElementById('taskTable');
  if (!tasks.length) { wrap.innerHTML = emptyState(ICON_EMPTY, 'No tasks here', 'Assigned work will show up in this list.'); return; }
  wrap.innerHTML = `<table>
    <thead><tr><th>Task</th><th>Client</th><th>Assigned to</th><th>Due</th><th>Priority</th><th>Status</th><th></th></tr></thead>
    <tbody>${tasks.map(t => {
      const client = DB.find(DB_KEYS.clients, t.clientId);
      const overdue = t.status!=='Completed' && daysUntil(t.dueDate) !== null && daysUntil(t.dueDate) < 0;
      return `<tr>
        <td><div class="cell-name">${t.title}</div>${overdue?'<div class="cell-sub" style="color:var(--red);">Overdue</div>':''}</td>
        <td>${client ? client.name : '—'}</td>
        <td>${userName(t.assignedTo)}</td>
        <td>${fmtDate(t.dueDate)}</td>
        <td>${statusBadge(t.priority)}</td>
        <td>${statusBadge(t.status)}</td>
        <td class="row-actions">
          ${t.status !== 'Completed' ? `<select data-status-select="${t.id}" class="btn-sm" style="border-radius:6px;border:1px solid var(--slate-300);">
            <option value="Pending" ${t.status==='Pending'?'selected':''}>Pending</option>
            <option value="In Progress" ${t.status==='In Progress'?'selected':''}>In Progress</option>
            <option value="Completed" ${t.status==='Completed'?'selected':''}>Completed</option>
          </select>` : `<span class="small-muted">Done</span>`}
        </td>
      </tr>`;
    }).join('')}</tbody></table>`;
  wrap.querySelectorAll('[data-status-select]').forEach(sel => sel.addEventListener('change', () => {
    DB.update(DB_KEYS.tasks, sel.dataset.statusSelect, { status: sel.value });
    toast('Task status updated', 'success');
    renderTasks(); renderDashboard();
  }));
}
document.getElementById('addTaskBtn').addEventListener('click', () => {
  document.getElementById('taskForm').reset();
  fillClientSelect(document.getElementById('taskClient'));
  fillServiceSelect(document.getElementById('taskService'));
  fillUserSelect(document.getElementById('taskAssignee'), ['Employee','Sales','Admin']);
  openModal('modal-task');
});
document.getElementById('saveTaskBtn').addEventListener('click', () => {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) { toast('Task title required', 'error'); return; }
  DB.insert(DB_KEYS.tasks, {
    id: uid('task'), title, clientId: document.getElementById('taskClient').value || null,
    serviceId: document.getElementById('taskService').value || null,
    assignedTo: document.getElementById('taskAssignee').value,
    dueDate: document.getElementById('taskDue').value ? new Date(document.getElementById('taskDue').value).toISOString() : null,
    priority: document.getElementById('taskPriority').value,
    description: document.getElementById('taskDesc').value.trim(),
    status:'Pending', createdAt: nowISO()
  });
  toast('Task assigned', 'success');
  closeModal('modal-task');
  renderTasks(); renderDashboard();
});

/* ================================================================
   QUOTATIONS & INVOICES
   ================================================================ */
document.querySelectorAll('[data-billtab]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-billtab]').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const isQuote = b.dataset.billtab === 'quotations';
  document.getElementById('billQuotationsWrap').style.display = isQuote ? '' : 'none';
  document.getElementById('billInvoicesWrap').style.display = isQuote ? 'none' : '';
}));

function renderBilling() {
  document.getElementById('addQuoteBtn').classList.toggle('perm-hidden', perm('billing') !== 'full');
  renderQuoteTable();
  renderInvoiceTable();
}

function renderQuoteTable() {
  const quotes = DB.get(DB_KEYS.quotations).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  const wrap = document.getElementById('quoteTable');
  if (!quotes.length) { wrap.innerHTML = emptyState(ICON_EMPTY, 'No quotations yet', 'Create a quotation for a client to get started.'); return; }
  wrap.innerHTML = `<table>
    <thead><tr><th>Quote</th><th>Client</th><th>Amount</th><th>Valid until</th><th>Status</th><th></th></tr></thead>
    <tbody>${quotes.map(q => {
      const c = DB.find(DB_KEYS.clients, q.clientId);
      return `<tr>
        <td class="cell-name">#${q.id.slice(-5).toUpperCase()}</td>
        <td>${c?c.name:'—'}</td>
        <td>${fmtMoney(q.total)}</td>
        <td>${fmtDate(q.validUntil)}</td>
        <td>${statusBadge(q.status)}</td>
        <td class="row-actions">
          ${q.status==='Draft'?`<button class="btn btn-sm btn-outline" data-send="${q.id}">Mark Sent</button>`:''}
          ${q.status==='Sent'?`<button class="btn btn-sm btn-outline" data-accept="${q.id}">Mark Accepted</button>`:''}
          ${q.status==='Accepted' && !q.invoiced ?`<button class="btn btn-sm btn-primary" data-toinvoice="${q.id}">Create Invoice</button>`:''}
          ${q.invoiced?`<span class="small-muted">Invoiced</span>`:''}
        </td>
      </tr>`;
    }).join('')}</tbody></table>`;
  wrap.querySelectorAll('[data-send]').forEach(b => b.addEventListener('click', () => { DB.update(DB_KEYS.quotations,b.dataset.send,{status:'Sent'}); renderQuoteTable(); toast('Quotation marked as sent'); }));
  wrap.querySelectorAll('[data-accept]').forEach(b => b.addEventListener('click', () => { DB.update(DB_KEYS.quotations,b.dataset.accept,{status:'Accepted'}); renderQuoteTable(); toast('Quotation marked as accepted', 'success'); }));
  wrap.querySelectorAll('[data-toinvoice]').forEach(b => b.addEventListener('click', () => convertQuoteToInvoice(b.dataset.toinvoice)));
}

function convertQuoteToInvoice(quoteId) {
  const q = DB.find(DB_KEYS.quotations, quoteId);
  const invoice = {
    id: uid('inv'), quotationId: q.id, clientId: q.clientId, items: q.items, total: q.total,
    status:'Unpaid', createdAt: nowISO(), dueDate: new Date(Date.now()+7*86400000).toISOString(),
    number: 'INV-' + (DB.get(DB_KEYS.invoices).length+1001)
  };
  DB.insert(DB_KEYS.invoices, invoice);
  DB.update(DB_KEYS.quotations, quoteId, { invoiced:true });
  toast('Invoice created', 'success');
  renderQuoteTable(); renderInvoiceTable(); renderDashboard();
}

function renderInvoiceTable() {
  const invoices = DB.get(DB_KEYS.invoices).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  const wrap = document.getElementById('invoiceTable');
  if (!invoices.length) { wrap.innerHTML = emptyState(ICON_EMPTY, 'No invoices yet', 'Accept a quotation and convert it into an invoice.'); return; }
  wrap.innerHTML = `<table>
    <thead><tr><th>Invoice</th><th>Client</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th></th></tr></thead>
    <tbody>${invoices.map(inv => {
      const c = DB.find(DB_KEYS.clients, inv.clientId);
      const paid = paidForInvoice(inv.id);
      const bal = inv.total - paid;
      return `<tr>
        <td class="cell-name">${inv.number}</td>
        <td>${c?c.name:'—'}</td>
        <td>${fmtMoney(inv.total)}</td>
        <td>${fmtMoney(paid)}</td>
        <td>${fmtDate(inv.dueDate)}</td>
        <td>${statusBadge(inv.status)}</td>
        <td class="row-actions">${bal>0 && perm('payments')!=='none' ? `<button class="btn btn-sm btn-primary" data-pay="${inv.id}">Record Payment</button>`:'<span class="small-muted">Settled</span>'}</td>
      </tr>`;
    }).join('')}</tbody></table>`;
  wrap.querySelectorAll('[data-pay]').forEach(b => b.addEventListener('click', () => openPaymentModal(b.dataset.pay)));
}

/* ---- Quotation builder ---- */
let quoteLines = [];
document.getElementById('addQuoteBtn').addEventListener('click', () => {
  document.getElementById('quoteForm')?.reset?.();
  fillClientSelect(document.getElementById('quoteClient'));
  quoteLines = [{ serviceId:'', qty:1, price:0 }];
  document.getElementById('quoteValidUntil').value = '';
  renderQuoteLines();
  openModal('modal-quote');
});
document.getElementById('addQuoteLineBtn').addEventListener('click', () => { quoteLines.push({ serviceId:'', qty:1, price:0 }); renderQuoteLines(); });

function renderQuoteLines() {
  const services = DB.get(DB_KEYS.services);
  const wrap = document.getElementById('quoteItems');
  wrap.innerHTML = quoteLines.map((line, idx) => `
    <div class="form-row" style="align-items:end;margin-bottom:8px;">
      <div class="field" style="margin-bottom:0;">
        <label>Service</label>
        <select data-line="${idx}" data-field="serviceId">
          <option value="">Custom item</option>
          ${services.map(s => `<option value="${s.id}" ${line.serviceId===s.id?'selected':''}>${s.name}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:8px;">
        <div class="field" style="margin-bottom:0;flex:1;"><label>Qty</label><input type="number" min="1" value="${line.qty}" data-line="${idx}" data-field="qty"></div>
        <div class="field" style="margin-bottom:0;flex:1;"><label>Price (₹)</label><input type="number" min="0" value="${line.price}" data-line="${idx}" data-field="price"></div>
        <button type="button" class="btn btn-ghost btn-icon" data-remove-line="${idx}" style="margin-top:22px;">✕</button>
      </div>
    </div>`).join('');
  wrap.querySelectorAll('select[data-line]').forEach(el => el.addEventListener('change', () => {
    const idx = el.dataset.line;
    quoteLines[idx].serviceId = el.value;
    const svc = services.find(s => s.id === el.value);
    if (svc) quoteLines[idx].price = svc.price;
    renderQuoteLines();
  }));
  wrap.querySelectorAll('input[data-field="qty"]').forEach(el => el.addEventListener('input', () => { quoteLines[el.dataset.line].qty = Number(el.value)||1; updateQuoteTotal(); }));
  wrap.querySelectorAll('input[data-field="price"]').forEach(el => el.addEventListener('input', () => { quoteLines[el.dataset.line].price = Number(el.value)||0; updateQuoteTotal(); }));
  wrap.querySelectorAll('[data-remove-line]').forEach(el => el.addEventListener('click', () => { quoteLines.splice(el.dataset.removeLine,1); renderQuoteLines(); }));
  updateQuoteTotal();
}
function updateQuoteTotal() {
  const total = quoteLines.reduce((s,l) => s + (l.qty*l.price), 0);
  document.getElementById('quoteTotal').textContent = fmtMoney(total);
}
document.getElementById('saveQuoteBtn').addEventListener('click', () => {
  const clientId = document.getElementById('quoteClient').value;
  if (!clientId) { toast('Select a client', 'error'); return; }
  if (!quoteLines.length || quoteLines.every(l => !l.price)) { toast('Add at least one priced line item', 'error'); return; }
  const services = DB.get(DB_KEYS.services);
  const items = quoteLines.map(l => ({ name: services.find(s=>s.id===l.serviceId)?.name || 'Custom item', qty:l.qty, price:l.price }));
  const total = items.reduce((s,i) => s + i.qty*i.price, 0);
  DB.insert(DB_KEYS.quotations, { id: uid('quo'), clientId, items, total, status:'Draft', createdAt: nowISO(), validUntil: document.getElementById('quoteValidUntil').value ? new Date(document.getElementById('quoteValidUntil').value).toISOString() : null, invoiced:false });
  toast('Quotation saved', 'success');
  closeModal('modal-quote');
  renderQuoteTable(); renderDashboard();
});

/* ================================================================
   PAYMENTS
   ================================================================ */
function renderPayments() {
  const invoices = DB.get(DB_KEYS.invoices);
  const payments = DB.get(DB_KEYS.payments);
  const totalInvoiced = invoices.reduce((s,i)=>s+i.total,0);
  const totalCollected = payments.reduce((s,p)=>s+Number(p.amount),0);
  document.getElementById('paymentStatGrid').innerHTML = [
    { label:'Total Invoiced', value: fmtMoney(totalInvoiced), bg:'var(--blue-bg)', color:'var(--blue)', icon:'🧾' },
    { label:'Total Collected', value: fmtMoney(totalCollected), bg:'var(--green-bg)', color:'var(--green)', icon:'✅' },
    { label:'Outstanding', value: fmtMoney(totalInvoiced-totalCollected), bg:'var(--red-bg)', color:'var(--red)', icon:'⏳' }
  ].map(s => `<div class="stat-card"><div class="top"><span class="label">${s.label}</span><span class="icon" style="background:${s.bg};color:${s.color};">${s.icon}</span></div><div class="value">${s.value}</div></div>`).join('');

  const wrap = document.getElementById('paymentTable');
  if (!payments.length) { wrap.innerHTML = emptyState(ICON_EMPTY, 'No payments recorded', 'Payments you record against invoices will appear here.'); return; }
  const sorted = [...payments].sort((a,b) => new Date(b.date)-new Date(a.date));
  wrap.innerHTML = `<table>
    <thead><tr><th>Date</th><th>Invoice</th><th>Client</th><th>Amount</th><th>Mode</th><th>Received by</th></tr></thead>
    <tbody>${sorted.map(p => {
      const inv = DB.find(DB_KEYS.invoices, p.invoiceId);
      const c = inv ? DB.find(DB_KEYS.clients, inv.clientId) : null;
      return `<tr><td>${fmtDate(p.date)}</td><td>${inv?inv.number:'—'}</td><td>${c?c.name:'—'}</td><td>${fmtMoney(p.amount)}</td><td>${p.mode}</td><td>${userName(p.receivedBy)}</td></tr>`;
    }).join('')}</tbody></table>`;
}

function openPaymentModal(invoiceId) {
  const inv = DB.find(DB_KEYS.invoices, invoiceId);
  const c = DB.find(DB_KEYS.clients, inv.clientId);
  document.getElementById('payInvoiceId').value = invoiceId;
  document.getElementById('payInvoiceLabel').textContent = `${inv.number} — ${c?c.name:''}`;
  const bal = inv.total - paidForInvoice(inv.id);
  document.getElementById('payBalance').textContent = fmtMoney(bal);
  document.getElementById('payAmount').value = bal;
  document.getElementById('payDate').value = new Date().toISOString().slice(0,10);
  openModal('modal-payment');
}
document.getElementById('savePaymentBtn').addEventListener('click', () => {
  const invoiceId = document.getElementById('payInvoiceId').value;
  const amount = Number(document.getElementById('payAmount').value);
  if (!amount || amount <= 0) { toast('Enter a valid amount', 'error'); return; }
  const inv = DB.find(DB_KEYS.invoices, invoiceId);
  DB.insert(DB_KEYS.payments, { id: uid('pay'), invoiceId, amount, mode: document.getElementById('payMode').value, date: document.getElementById('payDate').value ? new Date(document.getElementById('payDate').value).toISOString() : nowISO(), receivedBy: CU.id });
  const paid = paidForInvoice(invoiceId);
  DB.update(DB_KEYS.invoices, invoiceId, { status: paid >= inv.total ? 'Paid' : 'Partially Paid' });
  toast('Payment recorded', 'success');
  closeModal('modal-payment');
  renderInvoiceTable(); renderPayments(); renderDashboard();
});

/* ================================================================
   REPORTS
   ================================================================ */
function renderReports() {
  const leads = DB.get(DB_KEYS.leads);
  const funnel = ['New','Contacted','Qualified','Converted','Lost'].map(s => ({ s, n: leads.filter(l=>l.status===s).length }));
  const max = Math.max(1, ...funnel.map(f=>f.n));
  const colors = { New:'var(--blue)', Contacted:'var(--amber-500)', Qualified:'var(--purple)', Converted:'var(--green)', Lost:'var(--gray)' };
  document.getElementById('funnelChart').innerHTML = funnel.map(f => `
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span>${f.s}</span><b>${f.n}</b></div>
      <div class="progress-bar"><span style="width:${(f.n/max)*100}%;background:${colors[f.s]};"></span></div>
    </div>`).join('');

  const invoices = DB.get(DB_KEYS.invoices);
  const payments = DB.get(DB_KEYS.payments);
  const invoicedTotal = invoices.reduce((s,i)=>s+i.total,0);
  const collectedTotal = payments.reduce((s,p)=>s+Number(p.amount),0);
  const rmax = Math.max(1, invoicedTotal, collectedTotal);
  document.getElementById('revenueChart').innerHTML = `
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span>Invoiced</span><b>${fmtMoney(invoicedTotal)}</b></div>
      <div class="progress-bar"><span style="width:${(invoicedTotal/rmax)*100}%;background:var(--blue);"></span></div>
    </div>
    <div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span>Collected</span><b>${fmtMoney(collectedTotal)}</b></div>
      <div class="progress-bar"><span style="width:${(collectedTotal/rmax)*100}%;background:var(--green);"></span></div>
    </div>`;

  const users = DB.get(DB_KEYS.users).filter(u => u.role==='Sales'||u.role==='Employee');
  document.getElementById('teamPerfTable').innerHTML = `<table>
    <thead><tr><th>Team member</th><th>Leads assigned</th><th>Clients converted</th><th>Tasks completed</th></tr></thead>
    <tbody>${users.map(u => {
      const la = leads.filter(l=>l.assignedTo===u.id).length;
      const conv = DB.get(DB_KEYS.clients).filter(c=>c.assignedTo===u.id).length;
      const done = DB.get(DB_KEYS.tasks).filter(t=>t.assignedTo===u.id && t.status==='Completed').length;
      return `<tr><td class="cell-name">${u.name}</td><td>${la}</td><td>${conv}</td><td>${done}</td></tr>`;
    }).join('')}</tbody></table>`;
}

/* ================================================================
   USERS (Admin)
   ================================================================ */
function renderUsers() {
  const users = DB.get(DB_KEYS.users);
  document.getElementById('userTable').innerHTML = `<table>
    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
    <tbody>${users.map(u => `
      <tr>
        <td><div style="display:flex;align-items:center;gap:10px;"><span class="avatar" style="width:28px;height:28px;font-size:11px;background:var(--navy-900);color:#fff;">${initialsAvatar(u.name)}</span>${u.name}</div></td>
        <td>${u.email}</td>
        <td><select data-role="${u.id}" ${u.id===CU.id?'disabled':''}>${ROLES.map(r=>`<option ${r===u.role?'selected':''}>${r}</option>`).join('')}</select></td>
        <td class="row-actions">${u.id!==CU.id?`<button class="btn btn-sm btn-danger" data-deluser="${u.id}">Remove</button>`:'<span class="small-muted">You</span>'}</td>
      </tr>`).join('')}</tbody></table>`;
  document.querySelectorAll('[data-role]').forEach(sel => sel.addEventListener('change', () => {
    DB.update(DB_KEYS.users, sel.dataset.role, { role: sel.value });
    toast('Role updated', 'success');
  }));
  document.querySelectorAll('[data-deluser]').forEach(b => b.addEventListener('click', () => {
    if (confirm('Remove this team member?')) { DB.remove(DB_KEYS.users, b.dataset.deluser); renderUsers(); toast('Team member removed'); }
  }));
}
document.getElementById('addUserBtn').addEventListener('click', () => {
  document.getElementById('userName').value=''; document.getElementById('userEmail').value=''; document.getElementById('userPassword').value='welcome123';
  openModal('modal-user');
});
document.getElementById('saveUserBtn').addEventListener('click', () => {
  const name = document.getElementById('userName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  if (!name || !email) { toast('Name and email required', 'error'); return; }
  DB.insert(DB_KEYS.users, { id: uid('usr'), name, email, password: document.getElementById('userPassword').value || 'welcome123', role: document.getElementById('userRole').value });
  toast('Team member added', 'success');
  closeModal('modal-user');
  renderUsers();
});

/* ================================================================
   CALL FEATURE — homepage "Call" button + end-of-call action prompt
   ================================================================ */
let callTimerHandle = null;
let callSeconds = 0;
let callContext = null; // { id, kind: 'lead'|'client'|'new', name, phone }

function startCall(id, kind) {
  let name, phone;
  if (kind === 'lead') { const l = DB.find(DB_KEYS.leads, id); name = l.name; phone = l.phone; }
  else { const c = DB.find(DB_KEYS.clients, id); name = c.name; phone = c.phone; }
  callContext = { id, kind, name, phone };
  launchCallUI();
}
function startNewCall(name, phone) {
  callContext = { id:null, kind:'new', name: name || 'Unknown caller', phone };
  launchCallUI();
}
function launchCallUI() {
  document.getElementById('callAvatarInitials').textContent = initialsAvatar(callContext.name);
  document.getElementById('callName').textContent = callContext.name;
  document.getElementById('callNumber').textContent = callContext.phone || '—';
  document.getElementById('callStatusText').textContent = 'Calling…';
  document.getElementById('callTimer').textContent = '00:00';
  callSeconds = 0;
  openModal('modal-call');
  setTimeout(() => {
    document.getElementById('callStatusText').textContent = 'Connected';
    callTimerHandle = setInterval(() => {
      callSeconds++;
      const m = String(Math.floor(callSeconds/60)).padStart(2,'0');
      const s = String(callSeconds%60).padStart(2,'0');
      document.getElementById('callTimer').textContent = `${m}:${s}`;
    }, 1000);
  }, 1200);
}
document.getElementById('muteBtn').addEventListener('click', (e) => e.currentTarget.classList.toggle('active'));
document.getElementById('endCallBtn').addEventListener('click', endCall);

function endCall() {
  clearInterval(callTimerHandle);
  closeModal('modal-call');
  const m = String(Math.floor(callSeconds/60)).padStart(2,'0');
  const s = String(callSeconds%60).padStart(2,'0');
  document.getElementById('wrapupSummary').textContent = `Duration ${m}:${s} with ${callContext.name}`;

  // Show only the actions relevant to this call's context
  const isKnownLead = callContext.kind === 'lead';
  const isClient = callContext.kind === 'client';
  const isNew = callContext.kind === 'new';
  document.getElementById('waAddLead').classList.toggle('perm-hidden', !isNew);
  document.getElementById('waFollowUp').classList.toggle('perm-hidden', !isKnownLead);
  document.getElementById('waConvert').classList.toggle('perm-hidden', !isKnownLead);
  document.getElementById('waTask').classList.toggle('perm-hidden', isNew);
  document.getElementById('waLost').classList.toggle('perm-hidden', !isKnownLead);

  openModal('modal-wrapup');
}

document.getElementById('waAddLead').addEventListener('click', () => { closeModal('modal-wrapup'); openAddLead(callContext.phone, callContext.name === 'Unknown caller' ? '' : callContext.name); });
document.getElementById('waFollowUp').addEventListener('click', () => { closeModal('modal-wrapup'); if (callContext.kind==='lead') openLeadDetail(callContext.id); });
document.getElementById('waConvert').addEventListener('click', () => {
  closeModal('modal-wrapup');
  if (callContext.kind==='lead') {
    document.getElementById('convLeadId').value = callContext.id;
    document.getElementById('convLeadName').textContent = callContext.name;
    document.getElementById('convAddress').value = '';
    openModal('modal-convert');
  }
});
document.getElementById('waTask').addEventListener('click', () => {
  closeModal('modal-wrapup');
  document.getElementById('taskForm').reset();
  fillClientSelect(document.getElementById('taskClient'));
  fillServiceSelect(document.getElementById('taskService'));
  fillUserSelect(document.getElementById('taskAssignee'), ['Employee','Sales','Admin']);
  if (callContext.kind==='client') document.getElementById('taskClient').value = callContext.id;
  openModal('modal-task');
});
document.getElementById('waLost').addEventListener('click', () => {
  if (callContext.kind==='lead') DB.update(DB_KEYS.leads, callContext.id, { status:'Lost' });
  closeModal('modal-wrapup');
  toast('Lead marked as lost');
  renderLeads(); renderDashboard();
});

document.getElementById('newCallBtn').addEventListener('click', () => {
  document.getElementById('ncName').value = ''; document.getElementById('ncPhone').value = '';
  openModal('modal-newcall');
});
document.getElementById('ncStartBtn').addEventListener('click', () => {
  const phone = document.getElementById('ncPhone').value.trim();
  if (!phone) { toast('Enter a phone number to call', 'error'); return; }
  closeModal('modal-newcall');
  startNewCall(document.getElementById('ncName').value.trim(), phone);
});

/* ================================================================
   INITIAL RENDER
   ================================================================ */
goToSection('dashboard');
