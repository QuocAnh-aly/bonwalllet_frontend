import axiosClient from './axiosClient';
import { readThrough, isNetworkError } from '../offline/offlineCache';
import { enqueueMutation } from '../sync/syncQueue';

export const transactionApi = {
  getAll(params) {
    const url = '/api/transactions';
    return readThrough(
      `transactions:getAll:${JSON.stringify(params ?? {})}`,
      () => axiosClient.get(url, { params }),
    );
  },

  getByRange(from, to) {
    const url = '/api/transactions/range';
    return axiosClient.get(url, { params: { from, to } });
  },

  getByRangeAndAccount(accountId, from, to) {
    const url = '/api/transactions/range/account';
    return axiosClient.get(url, { params: { accountId, from, to } });
  },

  // Giao dịch đã được gán cho một ngân sách cụ thể
  getByBudget(budgetId) {
    const url = `/api/transactions/budget/${budgetId}`;
    return axiosClient.get(url);
  },

  getById(id) {
    const url = `/api/transactions/${id}`;
    return axiosClient.get(url);
  },

  getCashFlow(from, to) {
    const url = '/api/transactions/cashflow';
    return axiosClient.get(url, { params: { from, to } });
  },

  async create(data) {
    const url = '/api/transactions';
    try {
      return await axiosClient.post(url, data);
    } catch (err) {
      // Offline / mất mạng → đưa vào hàng đợi, đồng bộ sau khi có mạng.
      if (isNetworkError(err)) {
        await enqueueMutation({ method: 'post', url, data });
        return { __offline: true };
      }
      throw err;
    }
  },

  update(id, data) {
    const url = `/api/transactions/${id}`;
    return axiosClient.put(url, data);
  },

  delete(id) {
    const url = `/api/transactions/${id}`;
    return axiosClient.delete(url);
  },
};
