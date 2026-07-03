import axiosClient from './axiosClient';
import { readThrough } from '../offline/offlineCache';

export const dashboardApi = {
  getSummary() {
    const url = '/api/dashboard';
    return readThrough('dashboard:getSummary', () => axiosClient.get(url));
  },

  getRecentTransactions(count = 5) {
    const url = '/api/dashboard/recent';
    return readThrough(
      `dashboard:recent:${count}`,
      () => axiosClient.get(url, { params: { count } }),
    );
  },

  getSpendingByCategory(from, to) {
    const url = '/api/dashboard/spending';
    return axiosClient.get(url, { params: { from, to } });
  },

  getMonthlyTrend(months = 6) {
    const url = '/api/dashboard/trend';
    return axiosClient.get(url, { params: { months } });
  },
};
