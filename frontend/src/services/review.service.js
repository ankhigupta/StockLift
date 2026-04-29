import api from "./api";

export const getPublicProfile = async (userId) => {
  const res = await api.get(`/users/${userId}/public-profile`);
  return res.data;
};

export const createReview = async (auctionId, reviewedId, rating, comment) => {
  const res = await api.post("/reviews", {
    auction_id: auctionId,
    reviewed_id: reviewedId,
    rating,
    comment,
  });
  return res.data;
};

export const canReview = async (auctionId) => {
  const res = await api.get(`/reviews/can-review/${auctionId}`);
  return res.data;
};