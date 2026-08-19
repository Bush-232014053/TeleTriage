document.addEventListener('DOMContentLoaded', async () => {
  if (!TeleTriageAPI.getToken()) {
    window.location.href = 'admin-login.html';
    return;
  }

  const admin = JSON.parse(sessionStorage.getItem('teletriage_admin') || 'null');
  const welcome = document.getElementById('adminWelcome');
  if (welcome && admin?.full_name) welcome.textContent = admin.full_name;

  document.querySelectorAll('#adminTabs .nav-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#adminTabs .nav-link').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      ['applications', 'doctors', 'patients', 'create'].forEach((tab) => {
        document.getElementById(`panel-${tab}`).classList.toggle('d-none', btn.dataset.tab !== tab);
      });
    });
  });

  document.getElementById('createDoctorForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const result = await TeleTriageAPI.request('/api/admin/doctors', {
        method: 'POST',
        body: JSON.stringify({
          doctorCode: document.getElementById('newDoctorCode').value.trim(),
          fullName: document.getElementById('newDoctorName').value.trim(),
          specialty: document.getElementById('newDoctorSpecialty').value,
          password: document.getElementById('newDoctorPassword').value || 'Password1!',
        }),
      });
      showAlert(`Doctor ${result.doctor_code} created. They can log in now.`, 'success');
      e.target.reset();
      document.getElementById('newDoctorPassword').value = 'Password1!';
      await loadAll();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  });

  try {
    await loadAll();
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      window.location.href = 'admin-login.html';
      return;
    }
    showAlert(err.message || 'Failed to load admin data.', 'danger');
  }

  async function loadAll() {
    const [patients, doctors, pending] = await Promise.all([
      TeleTriageAPI.request('/api/admin/patients'),
      TeleTriageAPI.request('/api/admin/doctors'),
      TeleTriageAPI.request('/api/admin/doctor-interest?status=pending'),
    ]);

    document.getElementById('statPatients').textContent = patients.length;
    document.getElementById('statDoctors').textContent = doctors.filter((d) => d.is_active).length;
    document.getElementById('statPending').textContent = pending.length;

    renderApplications(pending);
    renderDoctors(doctors);
    renderPatients(patients);
  }

  function renderApplications(rows) {
    const body = document.getElementById('applicationsBody');
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6" class="text-muted text-center py-4">No pending applications.</td></tr>';
      return;
    }
    body.innerHTML = rows.map((r) => `
      <tr>
        <td class="fw-semibold">${esc(r.full_name)}</td>
        <td>${esc(r.specialty)}</td>
        <td>${esc(r.email)}</td>
        <td>${esc(r.phone)}</td>
        <td class="small text-muted">${new Date(r.created_at).toLocaleDateString()}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-success me-1" data-approve="${r.request_id}">Approve</button>
          <button class="btn btn-sm btn-outline-danger" data-reject="${r.request_id}">Reject</button>
        </td>
      </tr>`).join('');

    body.querySelectorAll('[data-approve]').forEach((btn) => {
      btn.addEventListener('click', () => approveRequest(btn.dataset.approve, btn.closest('tr')));
    });
    body.querySelectorAll('[data-reject]').forEach((btn) => {
      btn.addEventListener('click', () => rejectRequest(btn.dataset.reject));
    });
  }

  async function approveRequest(id, row) {
    const name = row?.querySelector('td')?.textContent || 'Doctor';
    const code = prompt(`Assign Doctor ID for ${name}:`, `DOC-${String(Date.now()).slice(-4)}`);
    if (!code) return;
    try {
      const result = await TeleTriageAPI.request(`/api/admin/doctor-interest/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ doctorCode: code, password: 'Password1!' }),
      });
      showAlert(`${result.message} Password: ${result.temporaryPassword}`, 'success');
      await loadAll();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  }

  async function rejectRequest(id) {
    if (!confirm('Reject this application?')) return;
    try {
      await TeleTriageAPI.request(`/api/admin/doctor-interest/${id}/reject`, { method: 'PATCH' });
      showAlert('Application rejected.', 'success');
      await loadAll();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  }

  function renderDoctors(rows) {
    document.getElementById('doctorsBody').innerHTML = rows.map((d) => `
      <tr>
        <td><code>${esc(d.doctor_code)}</code></td>
        <td>${esc(d.full_name)}</td>
        <td>${esc(d.specialty)}</td>
        <td class="small">${esc(d.qualification || '—')}</td>
        <td>${d.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
        <td class="text-end">${d.is_active ? `<button class="btn btn-sm btn-outline-danger" data-deact-doc="${d.doctor_id}">Deactivate</button>` : ''}</td>
      </tr>`).join('');

    document.querySelectorAll('[data-deact-doc]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Deactivate this doctor? They cannot log in.')) return;
        await TeleTriageAPI.request(`/api/admin/doctors/${btn.dataset.deactDoc}/deactivate`, { method: 'PATCH' });
        await loadAll();
      });
    });
  }

  function renderPatients(rows) {
    document.getElementById('patientsBody').innerHTML = rows.map((p) => `
      <tr>
        <td>P-${p.patient_id}</td>
        <td>${esc(p.full_name)}</td>
        <td>${esc(p.phone)}</td>
        <td class="small text-muted">${new Date(p.registration_date).toLocaleDateString()}</td>
        <td>${p.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
        <td class="text-end">${p.is_active ? `<button class="btn btn-sm btn-outline-danger" data-deact-pat="${p.patient_id}">Deactivate</button>` : ''}</td>
      </tr>`).join('');

    document.querySelectorAll('[data-deact-pat]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Deactivate this patient?')) return;
        await TeleTriageAPI.request(`/api/admin/patients/${btn.dataset.deactPat}/deactivate`, { method: 'PATCH' });
        await loadAll();
      });
    });
  }

  function showAlert(msg, type) {
    const el = document.getElementById('adminAlert');
    el.className = `alert alert-${type}`;
    el.textContent = msg;
    el.classList.remove('d-none');
  }

  function esc(text) {
    const d = document.createElement('div');
    d.textContent = text ?? '';
    return d.innerHTML;
  }
});
