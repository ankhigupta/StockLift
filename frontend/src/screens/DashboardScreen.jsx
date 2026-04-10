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
import * as SecureStore from "expo-secure-store";
import api from "../services/api";

export default function DashboardScreen({ navigation }) {
  const [role, setRole] = useState(null);
  const [stats, setStats] = useState(null);
  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = async (userRole) => {
    try {
      if (userRole === "SELLER") {
        const [statsRes, auctionsRes] = await Promise.all([
          api.get("/dashboard/seller"),
          api.get("/auctions?status=ACTIVE"),
        ]);

        const d = statsRes.data.dashboard;
      setStats({
        totalAuctions: d.total_auctions,
        activeAuctions: d.auctions_by_status?.find(s => s.status === "ACTIVE")?.count || 0,
        completedAuctions: d.auctions_by_status?.find(s => s.status === "ENDED")?.count || 0,
        totalRevenue: d.total_revenue,
      });
      setListData(auctionsRes.data.auctions || []);
      } else {
        const [statsRes, bidsRes] = await Promise.all([
          api.get("/dashboard/buyer"),
          api.get("/bids/my"),
        ]);

        const d = statsRes.data.dashboard;
      setStats({
        activeBids: d.active_bids?.length || 0,
        wonAuctions: d.auctions_won,
        totalSpent: d.total_spent,
        pendingPayments: d.pending_orders?.length || 0,
      });
      setListData(bidsRes.data.bids || []);
      }
    } catch (err) {
      setError("Failed to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const storedRole = await SecureStore.getItemAsync("userRole");
        setRole(storedRole);
        await fetchDashboard(storedRole);
      } catch (err) {
        setError("Failed to load dashboard.");
        setLoading(false);
      }
    };
    init();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard(role);
  };

  const formatCurrency = (amount) => {
    if (!amount) return "₹0";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  const formatTimeLeft = (endTime) => {
    if (!endTime) return "N/A";
    const diff = new Date(endTime) - new Date();
    if (diff <= 0) return "Ended";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE": return "#D94F2B";
      case "UPCOMING": return "#C8943A";
      case "LEADING": return "#2E7D32";
      case "OUTBID": return "#D94F2B";
      case "WON": return "#1565C0";
      case "LOST": return "#8A7968";
      default: return "#8A7968";
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case "ACTIVE": return "#FFF5F3";
      case "UPCOMING": return "#FFF8EE";
      case "LEADING": return "#F1F8E9";
      case "OUTBID": return "#FFF5F3";
      case "WON": return "#E3F2FD";
      case "LOST": return "#F5F2EE";
      default: return "#F5F2EE";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D94F2B" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // ─────────────────────────────────────────
  // SELLER DASHBOARD
  // ─────────────────────────────────────────
  if (role === "SELLER") {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D94F2B" />
        }
      >
        <StatusBar barStyle="light-content" backgroundColor="#D94F2B" />

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerCircle} />
          <View style={styles.headerCircle2} />
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Good day, Seller 👋</Text>
              <Text style={styles.headerSub}>Here's your auction overview</Text>
            </View>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>S</Text>
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* STATS */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Auctions</Text>
            <Text style={styles.statNumber}>{stats?.totalAuctions || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Now</Text>
            <Text style={[styles.statNumber, { color: "#D94F2B" }]}>
              {stats?.activeAuctions || 0}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statNumber}>{stats?.completedAuctions || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Revenue</Text>
            <Text style={[styles.statNumber, { color: "#D94F2B", fontSize: 16 }]}>
              {formatCurrency(stats?.totalRevenue)}
            </Text>
          </View>
        </View>

        {/* CREATE BUTTON */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("CreateAuction")}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>＋  Create New Auction</Text>
          </TouchableOpacity>
        </View>

        {/* LIVE AUCTIONS LIST */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Live Auctions</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Auctions")}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {listData.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No active auctions</Text>
              <Text style={styles.emptyText}>
                Create your first auction to start selling your inventory
              </Text>
            </View>
          ) : (
            listData.map((auction) => (
              <TouchableOpacity
                key={auction.id}
                style={styles.auctionCard}
                onPress={() => navigation.navigate("AuctionDetail", { auctionId: auction.id })}
                activeOpacity={0.85}
              >
                <View style={styles.auctionCardTop}>
                  <View style={styles.auctionInfo}>
                    <Text style={styles.auctionTitle} numberOfLines={1}>
                      {auction.title}
                    </Text>
                    <Text style={styles.auctionCategory}>{auction.category}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(auction.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(auction.status) }]}>
                      {auction.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.auctionCardBottom}>
                  <View style={styles.auctionStat}>
                    <Text style={styles.auctionStatLabel}>Current Bid</Text>
                    <Text style={styles.auctionStatValue}>
                      {formatCurrency(auction.currentHighestBid || auction.basePrice)}
                    </Text>
                  </View>
                  <View style={styles.auctionDivider} />
                  <View style={styles.auctionStat}>
                    <Text style={styles.auctionStatLabel}>Base Price</Text>
                    <Text style={styles.auctionStatValue}>
                      {formatCurrency(auction.basePrice)}
                    </Text>
                  </View>
                  <View style={styles.auctionDivider} />
                  <View style={styles.auctionStat}>
                    <Text style={styles.auctionStatLabel}>Time Left</Text>
                    <Text style={[styles.auctionStatValue, { color: "#D94F2B" }]}>
                      {formatTimeLeft(auction.endTime)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────
  // BUYER DASHBOARD
  // ─────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D94F2B" />
      }
    >
      <StatusBar barStyle="light-content" backgroundColor="#D94F2B" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <View style={styles.headerCircle2} />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Good day, Buyer 👋</Text>
            <Text style={styles.headerSub}>Here's your bidding overview</Text>
          </View>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      {/* STATS */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active Bids</Text>
          <Text style={[styles.statNumber, { color: "#D94F2B" }]}>
            {stats?.activeBids || 0}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Auctions Won</Text>
          <Text style={styles.statNumber}>{stats?.wonAuctions || 0}</Text>
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

      {/* PENDING PAYMENT ALERT */}
      {stats?.pendingPayments > 0 && (
        <View style={styles.alertCard}>
          <Text style={styles.alertIcon}>⏰</Text>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Payment deadline approaching</Text>
            <Text style={styles.alertText}>
              You have {stats.pendingPayments} pending payment
              {stats.pendingPayments > 1 ? "s" : ""}. Pay within 24 hours.
            </Text>
          </View>
        </View>
      )}

      {/* BROWSE BUTTON */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("Auctions")}
          activeOpacity={0.85}
        >
          <Text style={styles.actionButtonText}>🔍  Browse Live Auctions</Text>
        </TouchableOpacity>
      </View>

      {/* MY BIDS LIST */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Recent Bids</Text>
        </View>

        {listData.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏷️</Text>
            <Text style={styles.emptyTitle}>No bids placed yet</Text>
            <Text style={styles.emptyText}>
              Browse live auctions and place your first bid
            </Text>
          </View>
        ) : (
          listData.slice(0, 5).map((bid) => (
            <TouchableOpacity
              key={bid.bidId}
              style={styles.auctionCard}
              onPress={() => navigation.navigate("AuctionDetail", { auctionId: bid.auctionId })}
              activeOpacity={0.85}
            >
              <View style={styles.auctionCardTop}>
                <View style={styles.auctionInfo}>
                  <Text style={styles.auctionTitle}>
                    Auction #{bid.auctionId?.slice(0, 8)}
                  </Text>
                  <Text style={styles.auctionCategory}>
                    {formatCurrency(bid.bidAmount)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBg(bid.status) }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(bid.status) }]}>
                    {bid.status}
                  </Text>
                </View>
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
  seeAll: {
    fontSize: 13,
    color: "#D94F2B",
    fontWeight: "600",
  },
  actionButton: {
    backgroundColor: "#D94F2B",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
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
  },
  auctionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  auctionCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  auctionInfo: {
    flex: 1,
    marginRight: 10,
  },
  auctionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1208",
    marginBottom: 3,
  },
  auctionCategory: {
    fontSize: 12,
    color: "#8A7968",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  auctionCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 12,
  },
  auctionStat: {
    flex: 1,
    alignItems: "center",
  },
  auctionStatLabel: {
    fontSize: 10,
    color: "#8A7968",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  auctionStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1208",
  },
  auctionDivider: {
    width: 0.5,
    height: 30,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
});