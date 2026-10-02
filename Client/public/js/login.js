import api from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginAlert = document.getElementById('loginAlert');
  const loginBtn = document.getElementById('loginBtn');

  // Helper to display alert
  const showAlert = (el, message, type = 'danger') => {
    el.className = `alert alert-${type}`;
    el.textContent = message;
    el.classList.remove('d-none');
  };

  const hideAlert = (el) => {
    el.classList.add('d-none');
  };

  // Login handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(loginAlert);

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing In...';
    loginBtn.disabled = true;

    try {
      const data = await api.login({ email, password });

      // Route based on role
      if (data.role === 'admin') {
        showAlert(loginAlert, 'Administrator login successful! Loading Dashboard...', 'success');
        setTimeout(() => {
          window.location.href = './student.html';
        }, 800);
        return;
      }

      if (data.role === 'student') {
        showAlert(loginAlert, 'Login successful! Redirecting to your dashboard...', 'success');
        setTimeout(() => {
          window.location.href = `./details.html?id=${data.studentId}`;
        }, 800);
      }

    } catch (error) {
      console.error('Login failed:', error);
      showAlert(loginAlert, error.message || 'Invalid email or password. Please try again.');
      loginBtn.innerHTML = 'Sign In';
      loginBtn.disabled = false;
    }
  });

  // Forgot Password handler
  const forgotForm = document.getElementById('forgotPasswordForm');
  const forgotAlert = document.getElementById('forgotAlert');
  const forgotSubmitBtn = document.getElementById('forgotSubmitBtn');

  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(forgotAlert);

      const email = document.getElementById('forgotEmail').value.trim();
      if (!email) return;

      forgotSubmitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
      forgotSubmitBtn.disabled = true;

      try {
        const result = await api.forgotPassword(email);
        showAlert(
          forgotAlert,
          result.message || 'A temporary password has been dispatched to your email.',
          'success'
        );

        // Pre-fill the login email input for convenience
        const loginEmail = document.getElementById('loginEmail');
        if (loginEmail) loginEmail.value = email;

        setTimeout(() => {
          forgotSubmitBtn.innerHTML = 'Send Temporary Password';
          forgotSubmitBtn.disabled = false;
        }, 1500);

      } catch (error) {
        console.error('Password reset failed:', error);
        showAlert(forgotAlert, error.message || 'Failed to process password reset.', 'danger');
        forgotSubmitBtn.innerHTML = 'Send Temporary Password';
        forgotSubmitBtn.disabled = false;
      }
    });
  }
});
