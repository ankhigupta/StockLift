import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { getAuctions } from "../services/auction.service";

const CATEGORIES = ["All", "Clothing", "Electronics", "FMCG", "Furniture", "Food", "Other"];
const TABS = ["ACTIVE", "UPCOMING", "ENDED"];

export default function AuctionListScreen({ navigation }) {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState(null);
  const [activeTab, setActiveTab] = useState("ACTIVE");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchText, setSearchText] = useState("");

  const fetchAuctions = async (status, category) => {
    try {
      const cat = category === "All" ? null : category;
      const data = await getAuctions(status, cat, 1);
      setAuctions(data.auctions || []);
    } catch (err) {
      setError("Failed to load auctions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const storedRole = await SecureStore.getItemAsync("userRole");
      setRole(storedRole);
      fetchAuctions(activeTab, selectedCategory);
    };
    init();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAuctions(activeTab, selectedCategory);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setLoading(true);
    fetchAuctions(tab, selectedCategory);
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setLoading(true);
    fetchAuctions(activeTab, cat);
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
      case "ENDED": return "#8A7968";
      default: return "#8A7968";
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case "ACTIVE": return "#FFF5F3";
      case "UPCOMING": return "#FFF8EE";
      case "ENDED": return "#F5F2EE";
      default: return "#F5F2EE";
    }
  };

  const filteredAuctions = auctions.filter((a) =>
    a.title?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#D94F2B" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <View style={styles.headerCircle2} />
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Live Auctions</Text>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}></Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search auctions..."
            placeholderTextColor="#BBAB9F"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* TABS */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabChange(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CATEGORY FILTER */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryChip,
              selectedCategory === cat && styles.categoryChipActive,
            ]}
            onPress={() => handleCategoryChange(cat)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat && styles.categoryChipTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* AUCTION LIST */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D94F2B" />
          <Text style={styles.loadingText}>Loading auctions...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D94F2B" />
          }
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {filteredAuctions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}></Text>
              <Text style={styles.emptyTitle}>No auctions found</Text>
              <Text style={styles.emptyText}>
                Try changing the filter or check back later
              </Text>
            </View>
          ) : (
            filteredAuctions.map((auction) => (
              <TouchableOpacity
                key={auction.id}
                style={styles.auctionCard}
                onPress={() =>
                  navigation.navigate("AuctionDetail", {
                    auctionId: auction.id,
                    role,
                  })
                }
                activeOpacity={0.85}
              >
                {/* CARD TOP */}
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {auction.title}
                    </Text>
                    <Text style={styles.cardSeller}>by {auction.seller_name}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(auction.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(auction.status) }]}>
                      {auction.status}
                    </Text>
                  </View>
                </View>

                {/* CATEGORY TAG */}
                {auction.category && (
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{auction.category}</Text>
                  </View>
                )}

                {/* CARD BOTTOM */}
                <View style={styles.cardBottom}>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatLabel}>Base Price</Text>
                    <Text style={styles.cardStatValue}>
                      {formatCurrency(auction.base_price)}
                    </Text>
                  </View>
                  <View style={styles.cardDivider} />
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatLabel}>Current Bid</Text>
                    <Text style={[styles.cardStatValue, { color: "#D94F2B" }]}>
                      {formatCurrency(auction.current_highest_bid || auction.base_price)}
                    </Text>
                  </View>
                  <View style={styles.cardDivider} />
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatLabel}>
                      {auction.status === "UPCOMING" ? "Starts" : "Time Left"}
                    </Text>
                    <Text style={[
                      styles.cardStatValue,
                      auction.status === "ACTIVE" && { color: "#D94F2B" }
                    ]}>
                      {auction.status === "UPCOMING"
                        ? formatTimeLeft(auction.start_time)
                        : formatTimeLeft(auction.end_time)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* CREATE AUCTION BUTTON — seller only */}
      {role === "SELLER" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("CreateAuction")}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EBE3",
  },
  header: {
    backgroundColor: "#D94F2B",
    paddingTop: 60,
    paddingBottom: 16,
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
  headerCircle2: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    right: 20,
    top: 60,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
  },
  clearBtn: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "700",
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#D94F2B",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8A7968",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: "#D94F2B",
  },
  categoryScroll: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    maxHeight: 50,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F5F2EE",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  categoryChipActive: {
    backgroundColor: "#D94F2B",
    borderColor: "#D94F2B",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8A7968",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#8A7968",
  },
  listScroll: {
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
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginTop: 20,
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
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardInfo: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1208",
    marginBottom: 3,
  },
  cardSeller: {
    fontSize: 11,
    color: "#8A7968",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  categoryTag: {
    alignSelf: "flex-start",
    backgroundColor: "#F5F2EE",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 12,
  },
  categoryTagText: {
    fontSize: 10,
    color: "#8A7968",
    fontWeight: "600",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 12,
  },
  cardStat: {
    flex: 1,
    alignItems: "center",
  },
  cardStatLabel: {
    fontSize: 9,
    color: "#8A7968",
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  cardStatValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1208",
  },
  cardDivider: {
    width: 0.5,
    height: 28,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#D94F2B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D94F2B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});