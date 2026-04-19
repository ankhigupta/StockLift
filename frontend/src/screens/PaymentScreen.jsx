import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { createPaymentOrder, verifyPayment } from "../services/payment.service";
import { getOrderById } from "../services/order.service";

export default function PaymentScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const fetchOrder = async () => {
    try {
      const data = await getOrderById(orderId);
      setOrder(data.order);
    } catch (err) {
      setError("Failed to load order details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, []);

  const formatCurrency = (amount) => {
    if (!amount) return "₹0";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeLeft = (deadline) => {
    if (!deadline) return "N/A";
    const diff = new Date(deadline) - new Date();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const handlePayment = async () => {
    setError("");
    setPayLoading(true);
    try {
      // create payment order
      const paymentData = await createPaymentOrder(orderId);

      // verify payment (simulated for now — Razorpay will be added later)
      await verifyPayment(paymentData.payment.id);

      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Payment failed. Please try again.");
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D94F2B" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successText}>
            Your payment has been confirmed. The seller will be notified.
          </Text>
          <TouchableOpacity
            style={styles.successButton}
            onPress={() => navigation.replace("Main")}
          >
            <Text style={styles.successButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#D94F2B" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Payment</Text>
        <Text style={styles.headerSub}>Secure your winning bid</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* DEADLINE WARNING */}
        {order && (
          <View style={styles.deadlineCard}>
            <Text style={styles.deadlineIcon}>⏰</Text>
            <View style={styles.deadlineContent}>
              <Text style={styles.deadlineTitle}>Payment Deadline</Text>
              <Text style={styles.deadlineTime}>
                {formatTimeLeft(order.payment_deadline)}
              </Text>
              <Text style={styles.deadlineDate}>
                Due by {formatDate(order.payment_deadline)}
              </Text>
            </View>
          </View>
        )}

        {/* ORDER SUMMARY */}
        {order && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Auction</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>
                  {order.auction_title}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Category</Text>
                <Text style={styles.summaryValue}>{order.category}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Seller</Text>
                <Text style={styles.summaryValue}>{order.seller_name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Order ID</Text>
                <Text style={styles.summaryValue}>
                  #{order.id?.slice(0, 8)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Order Date</Text>
                <Text style={styles.summaryValue}>
                  {formatDate(order.created_at)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>Total Amount</Text>
                <Text style={styles.summaryTotalValue}>
                  {formatCurrency(order.final_amount)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* PAYMENT METHOD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentMethodCard}>
            <View style={styles.paymentMethodRow}>
              <Text style={styles.paymentMethodIcon}>💳</Text>
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodName}>Razorpay</Text>
                <Text style={styles.paymentMethodSub}>
                  UPI, Cards, Net Banking, Wallets
                </Text>
              </View>
              <View style={styles.paymentMethodCheck}>
                <Text style={styles.paymentMethodCheckText}>✓</Text>
              </View>
            </View>
          </View>
        </View>

        {/* TERMS NOTE */}
        <View style={styles.termsNote}>
          <Text style={styles.termsText}>
            By completing this payment you agree to our terms of service.
            Payment is non-refundable once confirmed.
          </Text>
        </View>
      </ScrollView>

      {/* BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <Text style={styles.bottomLabel}>Total to pay</Text>
          <Text style={styles.bottomAmount}>
            {formatCurrency(order?.final_amount)}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.payButton,
            payLoading && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={payLoading}
          activeOpacity={0.85}
        >
          <Text style={styles.payButtonText}>
            {payLoading ? "Processing..." : "Pay Now →"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EBE3",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0EBE3",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#8A7968",
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0EBE3",
    padding: 24,
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    width: "100%",
  },
  successIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1208",
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: "#8A7968",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: "#D94F2B",
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  header: {
    backgroundColor: "#D94F2B",
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: "relative",
    overflow: "hidden",
  },
  headerCircle: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    right: -50,
    top: -20,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    marginTop: 3,
  },
  scroll: {
    flex: 1,
  },
  errorBanner: {
    backgroundColor: "#FFE5E5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFBBBB",
  },
  errorText: {
    fontSize: 13,
    color: "#C0392B",
  },
  deadlineCard: {
    flexDirection: "row",
    backgroundColor: "#FFF8EE",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F5D78E",
    gap: 12,
    alignItems: "flex-start",
  },
  deadlineIcon: {
    fontSize: 24,
  },
  deadlineContent: {
    flex: 1,
  },
  deadlineTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7B5800",
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  deadlineTime: {
    fontSize: 18,
    fontWeight: "800",
    color: "#C8943A",
    marginBottom: 2,
  },
  deadlineDate: {
    fontSize: 11,
    color: "#A07830",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1208",
    marginBottom: 10,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  summaryTotal: {
    borderBottomWidth: 0,
    backgroundColor: "#FFF5F3",
    paddingVertical: 16,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#8A7968",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1208",
    maxWidth: "60%",
    textAlign: "right",
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1208",
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#D94F2B",
  },
  paymentMethodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  paymentMethodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentMethodIcon: {
    fontSize: 24,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1208",
  },
  paymentMethodSub: {
    fontSize: 12,
    color: "#8A7968",
    marginTop: 2,
  },
  paymentMethodCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D94F2B",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentMethodCheckText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  termsNote: {
    padding: 4,
    marginBottom: 8,
  },
  termsText: {
    fontSize: 11,
    color: "#8A7968",
    textAlign: "center",
    lineHeight: 18,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.08)",
    padding: 16,
    paddingBottom: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomLeft: {
    gap: 2,
  },
  bottomLabel: {
    fontSize: 11,
    color: "#8A7968",
  },
  bottomAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1208",
  },
  payButton: {
    backgroundColor: "#D94F2B",
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  payButtonDisabled: {
    backgroundColor: "#E8A090",
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});