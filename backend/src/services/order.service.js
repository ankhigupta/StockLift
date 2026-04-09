import api from "./api";

// Getting buyer's orders - shown on buyer dashboard
export const getMyOrders = async () => {
  const response = await api.get("/orders/my");
  return response.data;
};

// Getting seller's orders - shown on seller dashboard
export const getSellerOrders = async () => {
  const response = await api.get("/orders/seller");
  return response.data;
};

// Getting single order details
export const getOrderById = async (id) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

// Manually creating order when auction ends (used by admin/testing)
export const createOrderFromAuction = async (auction_id) => {
  const response = await api.post(`/orders/create-from-auction/${auction_id}`);
  return response.data;
};

// Promoting order to second bidder if payment deadline passed
export const promoteOrder = async (id) => {
  const response = await api.put(`/orders/${id}/promote`);
  return response.data;
};