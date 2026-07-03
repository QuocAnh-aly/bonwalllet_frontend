import axiosClient from './axiosClient';

const BASE = '/api/bills';

export const billApi = {
  getAll(params = {}) { return axiosClient.get(BASE, { params }); },
  getById(id)       { return axiosClient.get(`${BASE}/${id}`); },
  create(data)      { return axiosClient.post(BASE, data); },
  update(id, data)  { return axiosClient.put(`${BASE}/${id}`, data); },
  delete(id)        { return axiosClient.delete(`${BASE}/${id}`); },
  rescan(id)        { return axiosClient.post(`${BASE}/${id}/rescan`); },
  pay(id, data)     { return axiosClient.post(`${BASE}/${id}/pay`, data); },
};
