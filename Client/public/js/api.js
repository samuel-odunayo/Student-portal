// API Client Module with Authentication Support
const API_BASE_URL = window.location.port === '8000'
  ? '/api'
  : 'http://127.0.0.1:8000/api';

const getHeaders = (extra = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...extra
  };
  const token = localStorage.getItem('portal_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const api = {
  // Authentication session helpers
  getToken() {
    return localStorage.getItem('portal_token');
  },
  setAuth(data) {
    if (data.token) localStorage.setItem('portal_token', data.token);
    if (data.role) localStorage.setItem('portal_role', data.role);
    if (data.studentId) localStorage.setItem('portal_student_id', data.studentId);
    if (data.mustChangePassword !== undefined) localStorage.setItem('portal_must_change_password', String(data.mustChangePassword));
    if (data.loginCount !== undefined) localStorage.setItem('portal_login_count', String(data.loginCount));
    if (data.user) localStorage.setItem('portal_user', JSON.stringify(data.user));
    if (data.student) localStorage.setItem('portal_student', JSON.stringify(data.student));
  },
  getMustChangePassword() {
    return localStorage.getItem('portal_must_change_password') === 'true';
  },
  getLoginCount() {
    return Number(localStorage.getItem('portal_login_count')) || 1;
  },
  clearMustChangePassword() {
    localStorage.setItem('portal_must_change_password', 'false');
  },
  getUser() {
    try {
      const u = localStorage.getItem('portal_user') || localStorage.getItem('portal_student');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  getRole() {
    return localStorage.getItem('portal_role');
  },
  getStudentId() {
    return localStorage.getItem('portal_student_id');
  },
  logout() {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_role');
    localStorage.removeItem('portal_student_id');
    localStorage.removeItem('portal_must_change_password');
    localStorage.removeItem('portal_login_count');
    localStorage.removeItem('portal_user');
    localStorage.removeItem('portal_student');
    window.location.href = './login.html';
  },

  // Auth API calls
  async login(credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      this.setAuth(data);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async changePassword(passwords) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(passwords)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update password');
      }
      return data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  // Request temporary password reset via email
  async forgotPassword(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to request password reset');
      }
      return data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  // Fetch states and LGAs
  async getStates() {
    try {
      const response = await fetch(`${API_BASE_URL}/states`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch states');
      return await response.json();
    } catch (error) {
      console.error('Error fetching states:', error);
      throw error;
    }
  },

  // Fetch students with pagination, search, and status filter (Admin only)
  async getStudents(params = {}) {
    try {
      let queryStr = '';
      if (typeof params === 'number') {
        queryStr = `?page=${params}&limit=20`;
      } else if (typeof params === 'object' && params !== null) {
        const queryParams = new URLSearchParams();
        queryParams.set('page', params.page || 1);
        queryParams.set('limit', params.limit || 20);
        if (params.search && params.search.trim()) queryParams.set('search', params.search.trim());
        if (params.status && params.status !== 'All') queryParams.set('status', params.status);
        queryStr = `?${queryParams.toString()}`;
      }

      const response = await fetch(`${API_BASE_URL}/students${queryStr}`, {
        headers: getHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('Unauthorized');
      }

      if (!response.ok) throw new Error('Failed to fetch students');
      return await response.json();
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  },

  // Fetch a single student by ID
  async getStudentById(studentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to fetch student details';
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch {
          const txt = await response.text();
          if (txt) errorMsg = txt;
        }
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (error) {
      console.error('API call error in getStudentById:', error);
      throw error;
    }
  },

  // Submit student registration form
  async submitStudentData(formData) {
    try {
      const response = await fetch(`${API_BASE_URL}/students`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMsg = `Submission failed (${response.status})`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch {
          const txt = await response.text();
          if (txt) errorMsg = txt;
        }
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting form:', error);
      throw error;
    }
  },

  // Update student status (Admin only)
  async updateStudentStatus(studentId, status) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ admissionStatus: status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating student status:', error);
      throw error;
    }
  },

  // Delete a student (Admin only)
  async deleteStudent(studentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete student');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },
};

export default api;