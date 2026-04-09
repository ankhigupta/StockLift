import api from "./api";

// Get all auctions - buyers browse this
// status can be ACTIVE, UPCOMING, ENDED, SOLD, EXPIRED
export const getAuctions = async (status = "ACTIVE", category = null, page = 1) => {
  let url = `/auctions?status=${status}&page=${page}`;
  if (category) url += `&category=${category}`;
  const response = await api.get(url);
  return response.data;
};

// Get single auction details
export const getAuctionById = async (id) => {
  const response = await api.get(`/auctions/${id}`);
  return response.data;
};

// Seller creates a new auction
export const createAuction = async (auctionData) => {
  const response = await api.post("/auctions", auctionData);
  return response.data;
};

// Seller updates their auction (only UPCOMING)
export const updateAuction = async (id, auctionData) => {
  const response = await api.put(`/auctions/${id}`, auctionData);
  return response.data;
};

// Seller deletes their auction (only UPCOMING)
export const deleteAuction = async (id) => {
  const response = await api.delete(`/auctions/${id}`);
  return response.data;
};