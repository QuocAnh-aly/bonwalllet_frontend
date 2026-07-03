import axiosClient from './axiosClient';

const BASE = '/api/insight';

// All endpoints accept optional ?from=&to= (ISO yyyy-MM-dd).
// Backend defaults to current month when range omitted.
export const insightApi = {
  expenseTotal(params = {})   { return axiosClient.get(`${BASE}/expense/total`,    { params }); },
  incomeTotal(params = {})    { return axiosClient.get(`${BASE}/income/total`,     { params }); },
  expenseByCategory(params = {}) { return axiosClient.get(`${BASE}/expense/category`, { params }); },
  incomeByCategory(params = {})  { return axiosClient.get(`${BASE}/income/category`,  { params }); },
  expenseByTag(params = {})   { return axiosClient.get(`${BASE}/expense/tag`,      { params }); },
  incomeByTag(params = {})    { return axiosClient.get(`${BASE}/income/tag`,       { params }); },
  monthly(params = {})        { return axiosClient.get(`${BASE}/monthly`,          { params }); },
};
