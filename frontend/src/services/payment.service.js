import api from "./api";

// Creating a payment order for an existing order
// Returns payment record with id to use in verify
export const createPaymentOrder = async (order_id) => {
  const response = await api.post("/payments/create-order", { order_id });
  return response.data;
};

// Verifying/simulating payment completion
// Later this will be replaced with Razorpay verification
export const verifyPayment = async (payment_id) => {
  const response = await api.post("/payments/verify", { payment_id });
  return response.data;
};

// Getting payment status for an order
export const getPaymentByOrder = async (order_id) => {
  const response = await api.get(`/payments/order/${order_id}`);
  return response.data;
};