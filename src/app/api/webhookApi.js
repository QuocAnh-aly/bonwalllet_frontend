import axiosClient from './axiosClient';

const BASE = '/api/webhooks';

export const webhookApi = {
  getAll()                  { return axiosClient.get(BASE); },
  getById(id)               { return axiosClient.get(`${BASE}/${id}`); },
  create(data)              { return axiosClient.post(BASE, data); },
  update(id, data)          { return axiosClient.put(`${BASE}/${id}`, data); },
  delete(id)                { return axiosClient.delete(`${BASE}/${id}`); },
  messages(id, take = 50)   { return axiosClient.get(`${BASE}/${id}/messages`, { params: { take } }); },
  submit(id, payload)       { return axiosClient.post(`${BASE}/${id}/submit`, payload ?? {}); },
};
