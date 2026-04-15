import api from "./api";

export const placeBid = async (auction_id, bid_amount) => {
  const response = await api.post("/bids", { auction_id, bid_amount });
  return response.data;
};

export const getBidsByAuction = async (auction_id) => {
  const response = await api.get(`/bids/auction/${auction_id}`);
  return response.data;
};

export const getMyBids = async () => {
  const response = await api.get("/bids/my");
  return response.data;
};