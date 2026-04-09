import api from "./api";

// Buyer places a bid on an auction
export const placeBid = async (auction_id, bid_amount) => {
  const response = await api.post("/bids", { auction_id, bid_amount });
  return response.data;
};

// Getting all bids for a specific auction - shown on auction detail screen
export const getBidsByAuction = async (auction_id) => {
  const response = await api.get(`/bids/auction/${auction_id}`);
  return response.data;
};

// Getting current user's bids - shown on buyer dashboard
export const getMyBids = async () => {
  const response = await api.get("/bids/my");
  return response.data;
};