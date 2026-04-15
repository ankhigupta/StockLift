import api from "./api";

export const getAuctions = async (status = "ACTIVE", category = null, page = 1) => {
  let url = `/auctions?status=${status}&page=${page}`;
  if (category) url += `&category=${category}`;
  const response = await api.get(url);
  return response.data;
};

export const getAuctionById = async (id) => {
  const response = await api.get(`/auctions/${id}`);
  return response.data;
};

export const createAuction = async (auctionData) => {
  const response = await api.post("/auctions", auctionData);
  return response.data;
};

export const updateAuction = async (id, auctionData) => {
  const response = await api.put(`/auctions/${id}`, auctionData);
  return response.data;
};

export const deleteAuction = async (id) => {
  const response = await api.delete(`/auctions/${id}`);
  return response.data;
};