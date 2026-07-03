import axiosClient from './axiosClient';

const BASE = '/api/rules';

export const ruleApi = {
  getAll()           { return axiosClient.get(BASE); },
  getById(id)        { return axiosClient.get(`${BASE}/${id}`); },
  create(data)       { return axiosClient.post(BASE, data); },
  update(id, data)   { return axiosClient.put(`${BASE}/${id}`, data); },
  delete(id)         { return axiosClient.delete(`${BASE}/${id}`); },
  toggle(id)         { return axiosClient.post(`${BASE}/${id}/toggle`); },
  test(id)           { return axiosClient.post(`${BASE}/${id}/test`); },
  trigger(id)        { return axiosClient.post(`${BASE}/${id}/trigger`); },
};

const GROUP_BASE = '/api/rule-groups';

export const ruleGroupApi = {
  getAll()           { return axiosClient.get(GROUP_BASE); },
  create(data)       { return axiosClient.post(GROUP_BASE, data); },
  update(id, data)   { return axiosClient.put(`${GROUP_BASE}/${id}`, data); },
  delete(id)         { return axiosClient.delete(`${GROUP_BASE}/${id}`); },
};
