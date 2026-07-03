import axiosClient from './axiosClient';

const BASE = '/api/budgets/savings';

export const piggyBankApi = {
  getAll()              { return axiosClient.get(BASE); },
  getById(id)           { return axiosClient.get(`${BASE}/${id}`); },
  create(data)          { return axiosClient.post(BASE, data); },
  update(id, data)      { return axiosClient.put(`${BASE}/${id}`, data); },
  delete(id)            { return axiosClient.delete(`/api/budgets/${id}`); },
  addMoney(id, data)    { return axiosClient.post(`${BASE}/${id}/add`, data); },
  removeMoney(id, data) { return axiosClient.post(`${BASE}/${id}/remove`, data); },
  resetHistory(id)      { return axiosClient.post(`${BASE}/${id}/reset`); },
  getEvents(id)         { return axiosClient.get(`${BASE}/${id}/events`); },
};
