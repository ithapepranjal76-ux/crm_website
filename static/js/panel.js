document.getElementById('menuToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.toggle('open');
});

function showToast(message) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function openActionModal({ title, kind, nextUrl }) {
  const modal = document.getElementById('actionModal');
  if (!modal) return;
  document.getElementById('modalTitle').textContent = title || 'Add New';
  document.getElementById('modalKind').value = kind || 'other';
  document.getElementById('modalNext').value = nextUrl || window.location.pathname;
  document.getElementById('modalTitleInput').value = '';
  document.getElementById('modalDetail').value = '';
  document.getElementById('modalPhone').value = '';
  document.getElementById('modalEmail').value = '';
  modal.hidden = false;
  document.getElementById('modalTitleInput').focus();
  if (window.lucide) lucide.createIcons();
}

function closeActionModal() {
  const modal = document.getElementById('actionModal');
  if (modal) modal.hidden = true;
}

function openInfoModal(title, html) {
  const modal = document.getElementById('infoModal');
  if (!modal) return;
  document.getElementById('infoTitle').textContent = title;
  document.getElementById('infoBody').innerHTML = html;
  modal.hidden = false;
  if (window.lucide) lucide.createIcons();
}

function closeInfoModal() {
  const modal = document.getElementById('infoModal');
  if (modal) modal.hidden = true;
}

document.addEventListener('click', (e) => {
  const openBtn = e.target.closest('[data-open-modal]');
  if (openBtn) {
    e.preventDefault();
    openActionModal({
      title: openBtn.dataset.title || 'Add New',
      kind: openBtn.dataset.kind || 'other',
      nextUrl: openBtn.dataset.next || window.location.pathname,
    });
    return;
  }

  const infoBtn = e.target.closest('[data-info]');
  if (infoBtn) {
    e.preventDefault();
    openInfoModal(
      infoBtn.dataset.infoTitle || 'Notifications',
      infoBtn.dataset.infoBody || '<p>No new items.</p>'
    );
    return;
  }

  if (e.target.closest('#modalClose') || e.target.closest('#modalCancel')) {
    closeActionModal();
  }
  if (e.target.closest('[data-close-info]')) {
    closeInfoModal();
  }
  if (e.target.id === 'actionModal') closeActionModal();
  if (e.target.id === 'infoModal') closeInfoModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeActionModal();
    closeInfoModal();
  }
});

window.NexaCharts = {
  adminDashboard() {
    const leads = document.getElementById('leadsLine');
    if (leads) {
      new Chart(leads, {
        type: 'line',
        data: {
          labels: ['May 1', 'May 5', 'May 10', 'May 15', 'May 20', 'May 25', 'May 30'],
          datasets: [{
            label: 'Leads',
            data: [320, 410, 380, 620, 540, 690, 720],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,.15)',
            fill: true,
            tension: 0.4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
        },
      });
    }

    const source = document.getElementById('sourceDonut');
    if (source) {
      new Chart(source, {
        type: 'doughnut',
        data: {
          labels: ['Website', 'Referral', 'Social', 'Email', 'Others'],
          datasets: [{
            data: [35, 25, 20, 10, 10],
            backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#94a3b8'],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          cutout: '68%',
        },
      });
    }

    const calls = document.getElementById('callDonut');
    if (calls) {
      new Chart(calls, {
        type: 'doughnut',
        data: {
          labels: ['Connected', 'No Answer', 'Busy'],
          datasets: [{
            data: [20, 8, 4],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          cutout: '70%',
        },
      });
    }

    const rev = document.getElementById('revenueBars');
    if (rev) {
      new Chart(rev, {
        type: 'bar',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{ data: [42, 55, 48, 70, 62, 38, 28], backgroundColor: '#3b82f6', borderRadius: 8 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
        },
      });
    }
  },

  salesDashboard() {
    const perf = document.getElementById('salesPerf');
    if (perf) {
      new Chart(perf, {
        type: 'line',
        data: {
          labels: ['May 1', 'May 8', 'May 15', 'May 22', 'May 29'],
          datasets: [
            { label: 'Leads', data: [20, 28, 24, 35, 40], borderColor: '#3b82f6', tension: 0.4 },
            { label: 'Deals', data: [8, 12, 10, 16, 18], borderColor: '#8b5cf6', tension: 0.4 },
            { label: 'Revenue', data: [15, 22, 18, 30, 34], borderColor: '#10b981', tension: 0.4 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
        },
      });
    }
    const donut = document.getElementById('leadStatusDonut');
    if (donut) {
      new Chart(donut, {
        type: 'doughnut',
        data: {
          labels: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Converted'],
          datasets: [{
            data: [42, 28, 19, 14, 9, 16],
            backgroundColor: ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981'],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
          cutout: '62%',
        },
      });
    }
  },

  employeeDashboard() {
    const task = document.getElementById('taskProgress');
    if (task) {
      new Chart(task, {
        type: 'doughnut',
        data: {
          labels: ['Completed', 'In Progress', 'Pending'],
          datasets: [{
            data: [16, 5, 3],
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } },
          cutout: '68%',
        },
      });
    }
    const perf = document.getElementById('empPerf');
    if (perf) {
      new Chart(perf, {
        type: 'line',
        data: {
          labels: ['1', '8', '15', '22', '29'],
          datasets: [{
            label: 'Performance',
            data: [62, 70, 68, 80, 87],
            borderColor: '#7c3aed',
            backgroundColor: 'rgba(124,58,237,.15)',
            fill: true,
            tension: 0.4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
        },
      });
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  const params = new URLSearchParams(window.location.search);
  if (params.get('new') === '1') {
    const kind = document.body.dataset.defaultKind || 'other';
    const title = document.body.dataset.modalTitle || 'Add New';
    openActionModal({ title, kind, nextUrl: window.location.pathname });
  }
});

window.NexaUI = { openActionModal, closeActionModal, openInfoModal, showToast };
