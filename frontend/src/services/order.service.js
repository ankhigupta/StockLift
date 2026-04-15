import api from "./api";

export const getMyOrders = async () => {
  const response = await api.get("/orders/my");
  return response.data;
};

export const getSellerOrders = async () => {
  const response = await api.get("/orders/seller");
  return response.data;
};

export const getOrderById = async (id) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

export const createOrderFromAuction = async (auction_id) => {
  const response = await api.post(`/orders/create-from-auction/${auction_id}`);
  return response.data;
};

export const promoteOrder = async (id) => {
  const response = await api.put(`/orders/${id}/promote`);
  return response.data;
};