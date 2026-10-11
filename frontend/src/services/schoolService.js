import axios from 'axios';
import { API_BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';
import errorHandler from '@/request/errorHandler';
import successHandler from '@/request/successHandler';

function setAuthHeader() {
  axios.defaults.baseURL = API_BASE_URL;
  axios.defaults.withCredentials = true;
  const auth = storePersist.get('auth');
  if (auth && auth.current && auth.current.token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${auth.current.token}`;
  }
}

export const schoolService = {
  // Stats
  getStats: async () => {
    try {
      setAuthHeader();
      const res = await axios.get('school/stats');
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  // Attendance
  bulkMarkAttendance: async (payload) => {
    try {
      setAuthHeader();
      const res = await axios.post('attendance/bulk-mark', payload);
      successHandler(res, { notifyOnSuccess: true, notifyOnFailed: true });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  getStudentAttendance: async (studentId) => {
    try {
      setAuthHeader();
      const url = studentId ? `attendance/student/${studentId}` : 'attendance/student';
      const res = await axios.get(url);
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  getClassAttendanceReport: async (params) => {
    try {
      setAuthHeader();
      const res = await axios.get('attendance/class-report', { params });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  // Exams & Marks
  bulkSaveMarks: async (payload) => {
    try {
      setAuthHeader();
      const res = await axios.post('examresult/bulk-save', payload);
      successHandler(res, { notifyOnSuccess: true, notifyOnFailed: true });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  getStudentReportCard: async (studentId, examId) => {
    try {
      setAuthHeader();
      const url = studentId ? `examresult/report-card/${studentId}` : 'examresult/report-card';
      const res = await axios.get(url, { params: { examId } });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  // Fees
  getStudentBalance: async (studentId) => {
    try {
      setAuthHeader();
      const url = studentId ? `feepayment/student-balance/${studentId}` : 'feepayment/student-balance';
      const res = await axios.get(url);
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  getDefaulters: async () => {
    try {
      setAuthHeader();
      const res = await axios.get('feepayment/defaulters');
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  recordFeePayment: async (payload) => {
    try {
      setAuthHeader();
      const res = await axios.post('feepayment/record', payload);
      successHandler(res, { notifyOnSuccess: true, notifyOnFailed: true });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  // Notices
  getNoticeFeed: async () => {
    try {
      setAuthHeader();
      const res = await axios.get('notice/feed');
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  // Generic Entity Helpers
  list: async (entity, params = {}) => {
    try {
      setAuthHeader();
      const res = await axios.get(`${entity}/list`, { params: { page: 1, items: 100, ...params } });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  create: async (entity, data) => {
    try {
      setAuthHeader();
      const res = await axios.post(`${entity}/create`, data);
      successHandler(res, { notifyOnSuccess: true, notifyOnFailed: true });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  update: async (entity, id, data) => {
    try {
      setAuthHeader();
      const res = await axios.patch(`${entity}/update/${id}`, data);
      successHandler(res, { notifyOnSuccess: true, notifyOnFailed: true });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  delete: async (entity, id) => {
    try {
      setAuthHeader();
      const res = await axios.delete(`${entity}/delete/${id}`);
      successHandler(res, { notifyOnSuccess: true, notifyOnFailed: true });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  // Student Photo Upload
  uploadStudentPhoto: async (studentId, file) => {
    try {
      setAuthHeader();
      const formData = new FormData();
      formData.append('file', file);
      const url = studentId ? `student/upload-photo/${studentId}` : 'student/upload-photo';
      const res = await axios.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      successHandler(res, { notifyOnSuccess: true, notifyOnFailed: true });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  // Fee Refund
  refundFeePayment: async (paymentId, refundReason) => {
    try {
      setAuthHeader();
      const res = await axios.post(`feepayment/refund/${paymentId}`, { refundReason });
      successHandler(res, { notifyOnSuccess: true, notifyOnFailed: true });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  // Collection Report
  getCollectionReport: async (params) => {
    try {
      setAuthHeader();
      const res = await axios.get('feepayment/collection-report', { params });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  // Teacher Workload
  getTeacherWorkload: async (teacherId) => {
    try {
      setAuthHeader();
      const url = teacherId ? `teacher/workload/${teacherId}` : 'teacher/workload';
      const res = await axios.get(url);
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  // ==========================================
  // Bulk Import & Data Reconciliation
  // ==========================================
  downloadImportTemplate: async (type, format = 'xlsx') => {
    try {
      setAuthHeader();
      const res = await axios.get(`import/template/${type}`, {
        params: { format },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_template.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      return { success: true };
    } catch (err) {
      return errorHandler(err);
    }
  },

  parseSpreadsheet: async (formData) => {
    try {
      setAuthHeader();
      const res = await axios.post('import/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  validateImportBatch: async (payload) => {
    try {
      setAuthHeader();
      const res = await axios.post('import/validate', payload);
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  reconcileImportBatch: async (payload) => {
    try {
      setAuthHeader();
      const res = await axios.post('import/reconcile', payload);
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  commitImportBatch: async (payload) => {
    try {
      setAuthHeader();
      const res = await axios.post('import/commit', payload);
      successHandler(res, { notifyOnSuccess: true, notifyOnFailed: true });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  getImportJobs: async (params) => {
    try {
      setAuthHeader();
      const res = await axios.get('import/jobs', { params });
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  getImportJob: async (jobId) => {
    try {
      setAuthHeader();
      const res = await axios.get(`import/job/${jobId}`);
      return res.data;
    } catch (err) {
      return errorHandler(err);
    }
  },

  exportImportJobReport: async (jobId, format = 'xlsx') => {
    try {
      setAuthHeader();
      const res = await axios.get(`import/job/${jobId}/export`, {
        params: { format },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${jobId}_audit_report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      return { success: true };
    } catch (err) {
      return errorHandler(err);
    }
  },
};
