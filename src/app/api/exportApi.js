import axiosClient from './axiosClient';

const BASE = '/api/data';

// All export endpoints accept ?format=csv|json|xlsx and return a Blob.
export const exportApi = {
  transactions({ from, to, format = 'csv' } = {}) {
    return axiosClient.get(`${BASE}/export/transactions`, {
      params: { from, to, format },
      responseType: 'blob',
    });
  },
  accounts({ format = 'csv' } = {}) {
    return axiosClient.get(`${BASE}/export/accounts`, {
      params: { format },
      responseType: 'blob',
    });
  },
  budgets({ format = 'csv' } = {}) {
    return axiosClient.get(`${BASE}/export/budgets`, {
      params: { format },
      responseType: 'blob',
    });
  },
};

export function downloadBlob(blob, filename) {
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Map UI format → extension used in the downloaded filename.
export const FORMAT_EXT = {
  csv:   'csv',
  json:  'json',
  excel: 'xls',   // backend currently emits SpreadsheetML 2003 (.xls extension)
};
