import axiosClient from './axiosClient';

// Đính kèm (ảnh hóa đơn/chứng từ). Backend đa hình theo attachable_type + id.
// type ∈ "transaction" | "bill" | "budget" | "account" | "piggy" | "tag".
export const attachmentApi = {
  listByAttachable(type, id) {
    return axiosClient.get(`/api/attachments/by/${type}/${id}`);
  },

  upload(type, id, file, { title, notes } = {}) {
    const form = new FormData();
    form.append('attachable_type', type);
    form.append('attachable_id', String(id));
    if (title) form.append('title', title);
    if (notes) form.append('notes', notes);
    form.append('file', file);
    // Bỏ Content-Type mặc định (application/json) để axios tự set multipart + boundary.
    return axiosClient.post('/api/attachments', form, {
      headers: { 'Content-Type': undefined },
    });
  },

  // Tải nội dung file dạng Blob (endpoint có [Authorize] nên phải đi qua axios
  // để gắn token, không dùng <img src> trực tiếp được).
  download(id) {
    return axiosClient.get(`/api/attachments/${id}/download`, {
      responseType: 'blob',
    });
  },

  update(id, { title, notes } = {}) {
    return axiosClient.put(`/api/attachments/${id}`, { title, notes });
  },

  remove(id) {
    return axiosClient.delete(`/api/attachments/${id}`);
  },
};
