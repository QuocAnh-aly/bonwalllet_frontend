import axiosClient from './axiosClient';

const BASE = '/api/exchange-rates';

export const exchangeRateApi = {
  getAll()                              { return axiosClient.get(BASE); },
  getByPair(from, to)                   { return axiosClient.get(`${BASE}/pair`, { params: { from, to } }); },
  convert({ amount, from, to, date })   { return axiosClient.get(`${BASE}/convert`, { params: { amount, from, to, date } }); },
  create(data)                          { return axiosClient.post(BASE, data); },
  bulk({ rates, rate_date })            { return axiosClient.post(`${BASE}/bulk`, { rates, rate_date }); },
  update(id, data)                      { return axiosClient.put(`${BASE}/${id}`, data); },
  delete(id)                            { return axiosClient.delete(`${BASE}/${id}`); },
};
