import axiosClient from './axiosClient';

const BASE = '/api/currencies';

export const currencyApi = {
  getAll()              { return axiosClient.get(BASE); },
  getPrimary()          { return axiosClient.get(`${BASE}/primary`); },
  getByCode(code)       { return axiosClient.get(`${BASE}/${code}`); },
  create(data)          { return axiosClient.post(BASE, data); },
  update(code, data)    { return axiosClient.put(`${BASE}/${code}`, data); },
  delete(code)          { return axiosClient.delete(`${BASE}/${code}`); },
  setPrimary(code)      { return axiosClient.post(`${BASE}/${code}/primary`); },
  enable(code)          { return axiosClient.post(`${BASE}/${code}/enable`); },
  disable(code)         { return axiosClient.post(`${BASE}/${code}/disable`); },
};
