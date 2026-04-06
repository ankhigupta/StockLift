import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import api from "../services/api";

export default function BuyerDashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      const [statsRes, bidsRes] = await Promise.all([
        api.get("/dashboard/buyer"),
        api.get("/bids/my"),
      ]);
      setStats(statsRes.data);
      setBids(bidsRes.data || []);
    } catch (err) {
      setError("Failed to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "LEADING": return "#2E7D32";
      case "OUTBID": return "#D94F2B";
      case "WON": return "#1565C0";
      case "LOST": return "#8A7968";
      default: return "#8A7968";
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case "LEADING": return "#F1F8E9";
      case "OUTBID": return "#FFF5F3";
      case "WON": return "#E3F2FD";
      case "LOST": return "#F5F2EE";
      default: return "#F5F2EE";
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return "₹0";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return "N/A";
    const diff = new Date(deadline) - new Date();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D94F2B" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#D94F2B"
        />
      }
    >
      <StatusBar barStyle="light-content" backgroundColor="#D94F2B" />

      {/* ORANGE HEADER */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <View style={styles.headerCircle2} />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Good day, Buyer </Text>
            <Text style={styles.headerSub}>Here's your bidding overview</Text>
          </View>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
        </View>
      </View>

      {/* error banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      {/* STATS CARDS */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active Bids</Text>
          <Text style={[styles.statNumber, { color: "#D94F2B" }]}>
            {stats?.activeBids || 0}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Auctions Won</Text>
          <Text style={styles.statNumber}>
            {stats?.wonAuctions || 0}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Spent</Text>
          <Text style={[styles.statNumber, { color: "#D94F2B", fontSize: 16 }]}>
            {formatCurrency(stats?.totalSpent)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pending Payments</Text>
          <Text style={[styles.statNumber, { color: "#C8943A" }]}>
            {stats?.pendingPayments || 0}
          </Text>
        </View>
      </View>

      {/* PENDING PAYMENTS ALERT */}
      {stats?.pendingPayments > 0 && (
        <View style={styles.alertCard}>
          <Text style={styles.alertIcon}></Text>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Payment deadline approaching</Text>
            <Text style={styles.alertText}>
              You have {stats.pendingPayments} pending payment
              {stats.pendingPayments > 1 ? "s" : ""}. Pay within 24 hours to
              avoid losing your won auction.
            </Text>
          </View>
        </View>
      )}

      {/* PENDING PAYMENT DEADLINES */}
      {stats?.pendingPaymentDeadlines?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Payments</Text>
          </View>
          {stats.pendingPaymentDeadlines.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.paymentCard}
              onPress={() =>
                navigation.navigate("Payment", { auctionId: item.auctionId })
              }
              activeOpacity={0.85}
            >
              <View style={styles.paymentLeft}>
                <Text style={styles.paymentAmount}>
                  {formatCurrency(item.amount)}
                </Text>
                <Text style={styles.paymentDeadline}>
                  ⏳ {formatDeadline(item.deadline)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.payNowButton}
                onPress={() =>
                  navigation.navigate("Payment", { auctionId: item.auctionId })
                }
              >
                <Text style={styles.payNowText}>Pay Now</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* BROWSE AUCTIONS BUTTON */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate("Auctions")}
          activeOpacity={0.85}
        >
          <Text style={styles.browseButtonIcon}></Text>
          <Text style={styles.browseButtonText}>Browse Live Auctions</Text>
        </TouchableOpacity>
      </View>

      {/* MY BIDS */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Recent Bids</Text>
        </View>

        {bids.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}></Text>
            <Text style={styles.emptyTitle}>No bids placed yet</Text>
            <Text style={styles.emptyText}>
              Browse live auctions and place your first bid
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate("Auctions")}
            >
              <Text style={styles.emptyButtonText}>Browse Auctions</Text>
            </TouchableOpacity>
          </View>
        ) : (
          bids.slice(0, 5).map((bid) => (
            <TouchableOpacity
              key={bid.bidId}
              style={styles.bidCard}
              onPress={() =>
                navigation.navigate("AuctionDetail", {
                  auctionId: bid.auctionId,
                })
              }
              activeOpacity={0.85}
            >
              <View style={styles.bidCardLeft}>
                <Text style={styles.bidTitle} numberOfLines={1}>
                  Auction #{bid.auctionId?.slice(0, 8)}
                </Text>
                <Text style={styles.bidAmount}>
                  {formatCurrency(bid.bidAmount)}
                </Text>
              </View>
              <View
                style={[
                  styles.bidStatusBadge,
                  { backgroundColor: getStatusBg(bid.status) },
                ]}
              >
                <Text
                  style={[
                    styles.bidStatusText,
                    { color: getStatusColor(bid.status) },
                  ]}
                >
                  {bid.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
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

  // header
  header: {
    backgroundColor: "#D94F2B",
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 24,
    position: "relative",
    overflow: "hidden",
  },
  headerCircle: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    right: -50,
    top: -20,
  },
  headerCircle2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    right: 20,
    top: 60,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    marginTop: 4,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // error
  errorBanner: {
    backgroundColor: "#FFE5E5",
    margin: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFBBBB",
  },
  errorText: {
    fontSize: 13,
    color: "#C0392B",
  },

  // stats
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  statLabel: {
    fontSize: 12,
    color: "#8A7968",
    marginBottom: 8,
    fontWeight: "500",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1208",
  },

  // alert card
  alertCard: {
    flexDirection: "row",
    backgroundColor: "#FFF8EE",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F5D78E",
    gap: 10,
    alignItems: "flex-start",
  },
  alertIcon: {
    fontSize: 20,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7B5800",
    marginBottom: 4,
  },
  alertText: {
    fontSize: 11,
    color: "#A07830",
    lineHeight: 16,
  },

  // section
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1208",
  },

  // payment card
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentLeft: {
    gap: 4,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1208",
  },
  paymentDeadline: {
    fontSize: 12,
    color: "#C8943A",
    fontWeight: "600",
  },
  payNowButton: {
    backgroundColor: "#D94F2B",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  payNowText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // browse button
  browseButton: {
    backgroundColor: "#D94F2B",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  browseButtonIcon: {
    fontSize: 18,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // empty state
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1208",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: "#8A7968",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: "#D94F2B",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // bid card
  bidCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bidCardLeft: {
    gap: 4,
  },
  bidTitle: {
    fontSize: 13,
    color: "#8A7968",
  },
  bidAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1208",
  },
  bidStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  bidStatusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

