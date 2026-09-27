(function () {
  'use strict';

  const sessionKey = 'edukateRoleSession';
  const recordPrefix = 'edukateRoleRecords:';
  const dashboardByRole = {
    admin: 'admin-dashboard.html',
    faculty: 'faculty-dashboard.html',
    student: 'student-dashboard.html'
  };
  const navigation = {
    admin: [
      ['Overview', [['Dashboard', 'admin-dashboard.html']]],
      ['People', [['Students', 'admin-students.html'], ['Faculty', 'admin-faculty.html'], ['Users', 'admin-users.html']]],
      ['Learning', [['Categories', 'admin-categories.html'], ['Blogs', 'admin-blogs.html'], ['Assignments', 'admin-assignments.html'], ['Reviews', 'admin-reviews.html']]],
      ['Finance & records', [['Payments', 'admin-payments.html'], ['Certificates', 'admin-certificates.html'], ['Reports', 'admin-reports.html']]],
      ['Account', [['Notifications', 'admin-notifications.html'], ['Contacts', 'admin-contacts.html'], ['Settings', 'admin-settings.html'], ['Profile', 'admin-profile.html']]]
    ],
    faculty: [
      ['Overview', [['Dashboard', 'faculty-dashboard.html']]],
      ['Teaching', [['Courses', 'faculty-courses.html'], ['Classes', 'faculty-classes.html'], ['Assignments', 'faculty-assignments.html']]],
      ['Account', [['Profile', 'faculty-profile.html']]]
    ],
    student: [
      ['Overview', [['Dashboard', 'student-dashboard.html']]],
      ['My learning', [['My courses', 'student-courses.html'], ['My classes', 'student-classes.html'], ['My assignments', 'student-assignments.html']]],
      ['Account', [['My profile', 'student-profile.html']]]
    ]
  };

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach(function (element) {
      element.textContent = value;
    });
  }

  function currentSession() {
    const session = readJson(sessionKey, null);
    if (!session || session.expiresAt <= Date.now()) {
      localStorage.removeItem(sessionKey);
      return null;
    }
    return session;
  }

  function renderNavigation(role, activeFile) {
    const nav = document.querySelector('[data-role-nav]');
    if (!nav) return;
    nav.innerHTML = navigation[role].map(function (group) {
      return '<div class="nav-group"><p class="nav-heading">' + group[0] + '</p>' + group[1].map(function (item) {
        const active = item[1] === activeFile ? ' is-active' : '';
        return '<a class="nav-link' + active + '" href="' + item[1] + '"><span class="nav-mark">' + item[0].slice(0, 1) + '</span>' + item[0] + '</a>';
      }).join('') + '</div>';
    }).join('');
  }

  function toast(message, kind) {
    let element = document.querySelector('.toast');
    if (!element) {
      element = document.createElement('div');
      element.className = 'toast';
      element.setAttribute('role', 'status');
      document.body.appendChild(element);
    }
    element.textContent = message;
    element.classList.add('is-visible');
    if (kind) element.classList.add(kind);
    window.setTimeout(function () { element.classList.remove('is-visible', 'error'); }, 2600);
  }

  function appendSavedRows() {
    document.querySelectorAll('[data-saved-list]').forEach(function (tbody) {
      const rows = readJson(recordPrefix + tbody.dataset.savedList, []);
      rows.forEach(function (record) { appendRow(tbody, record); });
    });
  }

  function appendRow(tbody, record) {
    const row = document.createElement('tr');
    [record.name, record.detail, record.status || 'Active'].forEach(function (value, index) {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (index === 0) cell.className = 'cell-primary';
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  }

  function setupLogin() {
    const form = document.querySelector('[data-login-form]');
    if (!form) return false;
    const role = form.dataset.loginForm;
    const accounts = {
      admin: { username: 'admin', password: 'admin123', displayName: 'Administrator' },
      faculty: { username: 'faculty', password: 'faculty123', displayName: 'Olivia Chen' },
      student: { username: 'student', password: 'student123', displayName: 'Alice Brown' }
    };
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const values = new FormData(form);
      const username = String(values.get('username')).trim();
      const password = String(values.get('password'));
      const account = accounts[role];
      if (username !== account.username || password !== account.password) {
        toast('Username or password is incorrect.', 'error');
        return;
      }
      localStorage.setItem(sessionKey, JSON.stringify({ role: role, username: username, displayName: account.displayName, expiresAt: Date.now() + 30 * 60000 }));
      window.location.href = dashboardByRole[role];
    });
    return true;
  }

  function setupPage() {
    const requirements = (document.body.dataset.allow || '').split(',').filter(Boolean);
    if (!requirements.length) return;
    const session = currentSession();
    if (!session || !requirements.includes(session.role)) {
      window.location.replace(session ? dashboardByRole[session.role] : (document.body.dataset.login || 'index.html'));
      return;
    }
    renderNavigation(session.role, document.body.dataset.file || '');
    setText('[data-user-name]', session.displayName);
    setText('[data-user-role]', session.role);
    appendSavedRows();

    document.querySelectorAll('[data-logout]').forEach(function (button) {
      button.addEventListener('click', function () {
        localStorage.removeItem(sessionKey);
        window.location.href = 'index.html';
      });
    });
    const menuButton = document.querySelector('[data-menu-toggle]');
    if (menuButton) menuButton.addEventListener('click', function () { document.querySelector('.sidebar').classList.toggle('is-open'); });
    const search = document.querySelector('[data-table-search]');
    if (search) search.addEventListener('input', function () {
      const query = search.value.toLowerCase();
      document.querySelectorAll('tbody tr').forEach(function (row) { row.hidden = !row.textContent.toLowerCase().includes(query); });
    });

    document.querySelectorAll('[data-add-record]').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const values = new FormData(form);
        const record = { name: String(values.get('name')).trim(), detail: String(values.get('detail') || '').trim(), status: 'Active' };
        const key = form.dataset.addRecord;
        const rows = readJson(recordPrefix + key, []);
        rows.unshift(record);
        localStorage.setItem(recordPrefix + key, JSON.stringify(rows));
        const target = document.querySelector('[data-saved-list="' + key + '"]');
        if (target) appendRow(target, record);
        form.reset();
        toast('Saved in this browser.');
      });
    });

    setupCertificates();
  }

  function setupCertificates() {
    const createForm = document.querySelector('[data-create-certificate]');
    const verifyForm = document.querySelector('[data-verify-certificate]');
    const tbody = document.querySelector('[data-certificate-list]');
    const key = 'edukateIssuedCertificates';
    function saved() { return readJson(key, []); }
    function refresh() {
      if (!tbody) return;
      tbody.textContent = '';
      const certificates = saved();
      if (!certificates.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.textContent = 'No certificates yet. Generate your first certificate.';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
      }
      certificates.forEach(function (certificate) {
        const row = document.createElement('tr');
        [certificate.id, certificate.student, certificate.course, certificate.verified ? 'Verified' : 'Issued'].forEach(function (value) {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.appendChild(cell);
        });
        tbody.appendChild(row);
      });
    }
    if (createForm) createForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const values = new FormData(createForm);
      const certificates = saved();
      const id = 'CERT-' + Math.random().toString(16).slice(2, 10).toUpperCase();
      certificates.unshift({ id: id, student: String(values.get('student')).trim(), course: String(values.get('course')).trim(), verified: false });
      localStorage.setItem(key, JSON.stringify(certificates));
      createForm.reset();
      refresh();
      toast('Certificate generated: ' + id);
    });
    if (verifyForm) verifyForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const id = String(new FormData(verifyForm).get('id')).trim().toUpperCase();
      const certificates = saved();
      const certificate = certificates.find(function (item) { return item.id === id; });
      if (!certificate) return toast('Certificate ID was not found.', 'error');
      certificate.verified = true;
      localStorage.setItem(key, JSON.stringify(certificates));
      refresh();
      toast('Certificate verified.');
    });
    refresh();
  }

  if (setupLogin()) return;
  if (document.body.dataset.allow) setupPage();
}());
