import api from "./api";

// Getting seller dashboard stats
// Returns total auctions, revenue, pending orders, recent auctions
export const getSellerDashboard = async () => {
  const response = await api.get("/dashboard/seller");
  return response.data;
};

// Getting buyer dashboard stats
// Returns total bids, auctions won, amount spent, active bids
export const getBuyerDashboard = async () => {
  const response = await api.get("/dashboard/buyer");
  return response.data;
};