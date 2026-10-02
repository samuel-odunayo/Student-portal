import api from './api.js';

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = api.getToken();
  const role = api.getRole();

  if (!token) {
    alert('Please log in to view your admission details.');
    window.location.href = './login.html';
    return;
  }

  // Handle Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to sign out?')) {
        api.logout();
      }
    });
  }

  // Admin-specific navigation and controls
  const navDashboardItem = document.getElementById('navDashboardItem');
  const adminStatusControl = document.getElementById('adminStatusControl');
  const adminBackBanner = document.getElementById('adminBackBanner');

  if (role === 'admin') {
    if (navDashboardItem) navDashboardItem.classList.remove('d-none');
    if (adminStatusControl) adminStatusControl.classList.remove('d-none');
    if (adminBackBanner) adminBackBanner.classList.remove('d-none');
  }

  // Determine student ID to load:
  // If Admin: loads ID from URL ?id=...
  // If Student: always loads their own student ID from their session token
  let studentId = new URLSearchParams(window.location.search).get('id');

  if (role === 'student') {
    const sessionStudentId = api.getStudentId();
    if (sessionStudentId) {
      studentId = sessionStudentId;
    }
  }

  // Validate student ID
  if (!studentId || !isValidObjectId(studentId)) {
    alert('Invalid or missing student ID. Redirecting...');
    window.location.href = role === 'admin' ? './student.html' : './login.html';
    return;
  }

  try {
    const student = await api.getStudentById(studentId);
    if (!student) {
      alert('Student record not found.');
      window.location.href = role === 'admin' ? './student.html' : './login.html';
      return;
    }

    // Helper to safely set text content
    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val !== undefined && val !== null ? val : '';
    };

    // Update Profile Image
    const imgEl = document.getElementById('studentImage') || document.querySelector('.card-img-top');
    if (imgEl) {
      if (student.imagePath) {
        const cleanPath = student.imagePath.startsWith('/') ? student.imagePath : `/${student.imagePath}`;
        imgEl.src = window.location.port === '8000'
          ? cleanPath
          : `http://127.0.0.1:8000${cleanPath}`;
      } else {
        imgEl.src = '../public/images/avatar.png';
      }
    }

    // Update Profile Header
    const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
    setText('studentName', fullName);

    const currentStatus = student.admissionStatus || 'Pending';

    // Update Status Badge & Student Explanation Banner
    const updateStatusUI = (status) => {
      const badge = document.getElementById('statusBadge');
      if (badge) {
        badge.textContent = status;
        badge.className = `badge ${status === 'Approved' ? 'bg-success' : status === 'Rejected' ? 'bg-danger' : 'bg-primary'}`;
      }
      setText('studentStatus', status);

      const explanation = document.getElementById('statusExplanation');
      if (explanation) {
        if (role === 'admin') {
          // Admins are reviewing applicant records and should not see student outcome banners
          explanation.classList.add('d-none');
        } else {
          explanation.classList.remove('d-none');
          if (status === 'Approved') {
            explanation.className = 'alert alert-success mt-3 mb-2';
            explanation.innerHTML = '🎉 <strong>Congratulations!</strong> Your admission has been <strong>APPROVED</strong>. Please monitor your registered email for enrollment next steps.';
          } else if (status === 'Rejected') {
            explanation.className = 'alert alert-danger mt-3 mb-2';
            explanation.innerHTML = '⚠️ <strong>Application Decision:</strong> Your application was not successful for this academic intake.';
          } else {
            explanation.className = 'alert alert-primary mt-3 mb-2';
            explanation.innerHTML = '📋 <strong>Application Under Review:</strong> Your application is currently being evaluated by the admissions board. You will receive an automated email as soon as a decision is recorded.';
          }
        }
      }
    };

    updateStatusUI(currentStatus);

    // Update Personal Information
    setText('studentEmail', student.email);
    setText('studentGender', student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : '');
    setText('studentPhone', student.phone);
    setText('studentDOB', student.dob ? new Date(student.dob).toLocaleDateString() : '');
    setText('studentAddress', student.address);

    // Update Origin & Academics Information
    setText('studentState', student.state);
    setText('studentLGA', student.localGovernment);
    setText('studentKin', student.nextOfKin);
    setText('studentJamb', student.jambScore);

    // Handle Student First-time or Enforced Password Change
    if (role === 'student' && api.getMustChangePassword()) {
      const loginCount = api.getLoginCount();
      const modalEl = document.getElementById('passwordChangeModal');
      const noticeText = document.getElementById('modalNoticeText');
      const ignoreBtn = document.getElementById('ignorePasswordBtn');
      const closeBtn = document.getElementById('modalCloseBtn');
      const form = document.getElementById('detailsChangePasswordForm');
      const modalAlert = document.getElementById('modalAlert');
      const saveBtn = document.getElementById('savePasswordBtn');
      const dashboardAlert = document.getElementById('dashboardAlert');

      if (modalEl) {
        let bsModal;

        if (loginCount >= 2) {
          // 2nd Login onwards: Strictly Enforced
          if (noticeText) {
            noticeText.innerHTML = '🔒 <strong>Security Enforcement:</strong> This is your 2nd visit using a temporary password. To protect your student account, creating a permanent password is now mandatory before you can continue.';
          }
          if (ignoreBtn) ignoreBtn.classList.add('d-none');
          if (closeBtn) closeBtn.classList.add('d-none');

          bsModal = new bootstrap.Modal(modalEl, {
            backdrop: 'static',
            keyboard: false
          });
        } else {
          // 1st Login: Dismissible / Optional
          if (noticeText) {
            noticeText.innerHTML = 'Welcome to your admission dashboard! You are currently using a temporary default password. We strongly recommend updating it now. You can also click <strong>Remind Me Later</strong> to continue.';
          }
          if (ignoreBtn) ignoreBtn.classList.remove('d-none');
          if (closeBtn) closeBtn.classList.remove('d-none');

          bsModal = new bootstrap.Modal(modalEl, {
            backdrop: true,
            keyboard: true
          });
        }

        bsModal.show();

        if (form) {
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (modalAlert) modalAlert.classList.add('d-none');

            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            if (newPassword.length < 6) {
              if (modalAlert) {
                modalAlert.className = 'alert alert-danger';
                modalAlert.textContent = 'Password must be at least 6 characters long.';
                modalAlert.classList.remove('d-none');
              }
              return;
            }

            if (newPassword !== confirmNewPassword) {
              if (modalAlert) {
                modalAlert.className = 'alert alert-danger';
                modalAlert.textContent = 'Passwords do not match. Please verify.';
                modalAlert.classList.remove('d-none');
              }
              return;
            }

            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
            saveBtn.disabled = true;

            try {
              await api.changePassword({ newPassword });
              api.clearMustChangePassword();

              if (modalAlert) {
                modalAlert.className = 'alert alert-success';
                modalAlert.textContent = 'Password successfully updated! Your account is fully secured.';
                modalAlert.classList.remove('d-none');
              }

              setTimeout(() => {
                bsModal.hide();
                if (dashboardAlert) {
                  dashboardAlert.className = 'alert alert-success alert-dismissible fade show mb-4';
                  dashboardAlert.innerHTML = '<strong>Password Updated!</strong> Your permanent password has been saved successfully.';
                  dashboardAlert.classList.remove('d-none');
                }
              }, 1200);

            } catch (error) {
              console.error('Password change failed:', error);
              if (modalAlert) {
                modalAlert.className = 'alert alert-danger';
                modalAlert.textContent = error.message || 'Failed to update password.';
                modalAlert.classList.remove('d-none');
              }
              saveBtn.innerHTML = 'Save Password';
              saveBtn.disabled = false;
            }
          });
        }
      }
    }

    // Admin Status Update Dropdown Handling
    if (role === 'admin') {
      const statusSelect = document.getElementById('statusSelect');
      if (statusSelect) {
        statusSelect.value = currentStatus;

        statusSelect.addEventListener('change', async () => {
          const newStatus = statusSelect.value;
          try {
            await api.updateStudentStatus(studentId, newStatus);
            updateStatusUI(newStatus);
            alert(`Admission status updated to ${newStatus}. Student has been notified via email.`);
          } catch (error) {
            console.error('Status update failed:', error);
            alert(`Failed to update status: ${error.message || 'Unknown error'}`);
            statusSelect.value = currentStatus;
          }
        });
      }
    }

  } catch (error) {
    console.error('Error loading student details:', error);
    alert(`Error fetching student details: ${error.message || 'Unknown error'}`);
    window.location.href = role === 'admin' ? './student.html' : './login.html';
  }
});
