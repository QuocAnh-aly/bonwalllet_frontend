import axiosClient from './axiosClient';

export const budgetApi = {
  // Expense Budgets
  getExpenseBudgets(params = {}) {
    return axiosClient.get('/api/budgets/expense', { params });
  },

  getExpenseBudgetById(id) {
    return axiosClient.get(`/api/budgets/expense/${id}`);
  },

  createExpenseBudget(data) {
    return axiosClient.post('/api/budgets/expense', data);
  },

  updateExpenseBudget(id, data) {
    return axiosClient.put(`/api/budgets/expense/${id}`, data);
  },

  deleteBudget(id) {
    return axiosClient.delete(`/api/budgets/${id}`);
  },

  // Savings Goals
  getSavingsGoals(params = {}) {
    return axiosClient.get('/api/budgets/savings', { params });
  },

  getSavingsGoalById(id) {
    return axiosClient.get(`/api/budgets/savings/${id}`);
  },

  createSavingsGoal(data) {
    return axiosClient.post('/api/budgets/savings', data);
  },

  updateSavingsGoal(id, data) {
    return axiosClient.put(`/api/budgets/savings/${id}`, data);
  },
};
