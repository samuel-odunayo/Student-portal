import api from './api.js';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async () => {
  // Access Control: Only Admins can access the Student Directory
  const token = api.getToken();
  const role = api.getRole();

  if (!token || role !== 'admin') {
    alert('Access Denied. Administrator login required.');
    window.location.href = './login.html';
    return;
  }

  // Setup Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out of the admin panel?')) {
        api.logout();
      }
    });
  }

  // DOM Elements
  const tbody = document.getElementById('studentsTable');
  const paginationControls = document.getElementById('paginationControls');
  const paginationInfo = document.getElementById('paginationInfo');
  const totalBadge = document.getElementById('totalBadge');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const statusFilter = document.getElementById('statusFilter');

  if (!tbody) return;

  // Pagination & Filter State
  const LIMIT = 20; // 20 per page
  let currentPage = 1;
  let totalPages = 1;
  let totalStudents = 0;
  let currentSearch = '';
  let currentStatus = 'All';
  let searchDebounceTimeout = null;

  // Load students for a specific page
  async function fetchAndRender(page = 1) {
    currentPage = Math.max(1, page);

    // Show loading state in table
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-muted">
          <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
          Loading student records...
        </td>
      </tr>
    `;

    try {
      const response = await api.getStudents({
        page: currentPage,
        limit: LIMIT,
        search: currentSearch,
        status: currentStatus
      });

      // Support both structured paginated response and raw array
      let students = [];
      if (Array.isArray(response)) {
        students = response;
        totalStudents = response.length;
        totalPages = Math.ceil(totalStudents / LIMIT) || 1;
      } else if (response && Array.isArray(response.students)) {
        students = response.students;
        totalStudents = response.totalStudents !== undefined ? response.totalStudents : students.length;
        totalPages = response.totalPages || Math.ceil(totalStudents / LIMIT) || 1;
        currentPage = response.currentPage || currentPage;
      }

      // Update total badge
      if (totalBadge) {
        totalBadge.textContent = `${totalStudents.toLocaleString()} Student${totalStudents === 1 ? '' : 's'}`;
      }

      if (students.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-muted py-5">
              <div class="mb-2">🔍 No matching student records found.</div>
              ${currentSearch || currentStatus !== 'All' ? '<small class="text-secondary">Try adjusting your search terms or status filter.</small>' : ''}
            </td>
          </tr>
        `;
        renderPagination(0, 0, 0);
        return;
      }

      const startIndex = (currentPage - 1) * LIMIT;

      // Render table rows
      tbody.innerHTML = students.map((student, index) => {
        const rowNumber = startIndex + index + 1;
        const status = student.admissionStatus || 'Pending';
        const badgeClass = status === 'Approved' ? 'bg-success' : status === 'Rejected' ? 'bg-danger' : 'bg-primary';
        const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
        const dateStr = student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A';

        return `
          <tr data-student-id="${escapeHtml(student._id)}">
            <td class="fw-semibold text-muted">${rowNumber}</td>
            <td>
              <strong>${escapeHtml(fullName)}</strong><br>
              <small class="text-muted">${escapeHtml(student.email || '')}</small>
            </td>
            <td>JAMB: <span class="badge bg-light text-dark border">${escapeHtml(student.jambScore ?? 'N/A')}</span></td>
            <td><span class="badge ${badgeClass}">${escapeHtml(status)}</span></td>
            <td>${escapeHtml(dateStr)}</td>
            <td>
              <a href="./details.html?id=${encodeURIComponent(student._id)}" class="btn btn-sm btn-primary">Review</a>
              <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${escapeHtml(student._id)}" data-name="${escapeHtml(fullName)}">Delete</button>
            </td>
          </tr>
        `;
      }).join('');

      // Attach delete event listeners
      tbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const studentId = e.currentTarget.getAttribute('data-id');
          const studentName = e.currentTarget.getAttribute('data-name');
          if (!studentId) return;

          const confirmed = confirm(`Are you sure you want to permanently delete the record for "${studentName}"?`);
          if (!confirmed) return;

          try {
            await api.deleteStudent(studentId);
            // Refresh current page after deletion
            const remainingOnPage = students.length - 1;
            if (remainingOnPage === 0 && currentPage > 1) {
              fetchAndRender(currentPage - 1);
            } else {
              fetchAndRender(currentPage);
            }
          } catch (error) {
            console.error('Failed to delete student:', error);
            alert(`Failed to delete student: ${error.message || 'Unknown error'}`);
          }
        });
      });

      // Update Pagination UI
      const endIndex = Math.min(startIndex + students.length, totalStudents);
      renderPagination(startIndex + 1, endIndex, totalStudents);

    } catch (error) {
      console.error('Error loading students:', error);
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-danger py-4">
            Failed to load students: ${escapeHtml(error.message || 'Server error')}
          </td>
        </tr>
      `;
      renderPagination(0, 0, 0);
    }
  }

  // Render pagination navigation buttons
  function renderPagination(startRecord, endRecord, total) {
    if (!paginationInfo || !paginationControls) return;

    if (total === 0) {
      paginationInfo.textContent = 'Showing 0 to 0 of 0 students';
      paginationControls.innerHTML = '';
      return;
    }

    paginationInfo.innerHTML = `Showing <strong>${startRecord.toLocaleString()}</strong> to <strong>${endRecord.toLocaleString()}</strong> of <strong>${total.toLocaleString()}</strong> students <span class="text-secondary">(Page ${currentPage} of ${totalPages} &bull; 20/page)</span>`;

    if (totalPages <= 1) {
      paginationControls.innerHTML = '';
      return;
    }

    let itemsHtml = '';

    // First & Previous buttons
    const isFirstPage = currentPage === 1;
    itemsHtml += `
      <li class="page-item ${isFirstPage ? 'disabled' : ''}">
        <button class="page-link" data-page="1" ${isFirstPage ? 'tabindex="-1" aria-disabled="true"' : ''} title="First page">&laquo;</button>
      </li>
      <li class="page-item ${isFirstPage ? 'disabled' : ''}">
        <button class="page-link" data-page="${currentPage - 1}" ${isFirstPage ? 'tabindex="-1" aria-disabled="true"' : ''} title="Previous page">&lsaquo;</button>
      </li>
    `;

    // Calculate smart page number range
    const maxVisibleButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
    let endPage = startPage + maxVisibleButtons - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    // Lead ellipsis if startPage > 1
    if (startPage > 1) {
      itemsHtml += `<li class="page-item"><button class="page-link" data-page="1">1</button></li>`;
      if (startPage > 2) {
        itemsHtml += `<li class="page-item disabled"><span class="page-link">&hellip;</span></li>`;
      }
    }

    // Numbered page buttons
    for (let p = startPage; p <= endPage; p++) {
      const isActive = p === currentPage;
      itemsHtml += `
        <li class="page-item ${isActive ? 'active' : ''}">
          <button class="page-link" data-page="${p}">${p}</button>
        </li>
      `;
    }

    // Trail ellipsis if endPage < totalPages
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        itemsHtml += `<li class="page-item disabled"><span class="page-link">&hellip;</span></li>`;
      }
      itemsHtml += `<li class="page-item"><button class="page-link" data-page="${totalPages}">${totalPages}</button></li>`;
    }

    // Next & Last buttons
    const isLastPage = currentPage === totalPages;
    itemsHtml += `
      <li class="page-item ${isLastPage ? 'disabled' : ''}">
        <button class="page-link" data-page="${currentPage + 1}" ${isLastPage ? 'tabindex="-1" aria-disabled="true"' : ''} title="Next page">&rsaquo;</button>
      </li>
      <li class="page-item ${isLastPage ? 'disabled' : ''}">
        <button class="page-link" data-page="${totalPages}" ${isLastPage ? 'tabindex="-1" aria-disabled="true"' : ''} title="Last page">&raquo;</button>
      </li>
    `;

    paginationControls.innerHTML = itemsHtml;

    // Attach click listeners to pagination buttons
    paginationControls.querySelectorAll('button[data-page]').forEach(button => {
      button.addEventListener('click', (e) => {
        const targetPage = parseInt(e.currentTarget.getAttribute('data-page'), 10);
        if (!isNaN(targetPage) && targetPage !== currentPage && targetPage >= 1 && targetPage <= totalPages) {
          fetchAndRender(targetPage);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }

  // Search input handler with debounce
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => {
        currentSearch = searchInput.value.trim();
        fetchAndRender(1);
      }, 350);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(searchDebounceTimeout);
        currentSearch = searchInput.value.trim();
        fetchAndRender(1);
      }
    });
  }

  // Clear search button
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      currentSearch = '';
      fetchAndRender(1);
    });
  }

  // Status filter dropdown handler
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      currentStatus = statusFilter.value;
      fetchAndRender(1);
    });
  }

  // Initial load
  fetchAndRender(1);
});