import React, { useState, useEffect, useRef } from "react";
import { KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from "react-native";
import { Image, FlatList } from "react-native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl
} from "react-native";

import * as SecureStore from "expo-secure-store";
import { getAuctionById } from "../services/auction.service";
import { getBidsByAuction } from "../services/bid.service";
import { placeBid } from "../services/bid.service";
import io from "socket.io-client";

export default function AuctionDetailScreen({ route, navigation }) {
  const { auctionId } = route.params;
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);

  // bid modal state
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState("");
  const [bidSuccess, setBidSuccess] = useState("");

  const socketRef = useRef(null);

  const fetchData = async () => {
    try {
      const [auctionRes, bidsRes] = await Promise.all([
        getAuctionById(auctionId),
        getBidsByAuction(auctionId),
      ]);
      setAuction(auctionRes.auction);
      setBids(bidsRes.bids || []);
    } catch (err) {
      setError("Failed to load auction.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const storedRole = await SecureStore.getItemAsync("userRole");
      const token = await SecureStore.getItemAsync("accessToken");
      setRole(storedRole);

      await fetchData();

      // connect to socket
      if (token) {
        const socket = io("http://10.20.16.213:8000", {
          auth: { token },
          transports: ["websocket"],
        });
  //     if (token) {
  // const payload = JSON.parse(atob(token.split(".")[1]));
  // setUserId(payload.id || payload.userId);
  //   };

        socket.on("connect", () => {
          socket.emit("join:auction", auctionId);
        });

        // real time new bid
        socket.on("bid:new", (data) => {
          if (data.auction_id === auctionId) {
            setAuction((prev) => ({
              ...prev,
              current_highest_bid: data.current_highest_bid,
            }));
            setBids((prev) => [data.bid, ...prev]);
          }
        });

        // auction extended
        socket.on("auction:extended", (data) => {
          if (data.auction_id === auctionId) {
            setAuction((prev) => ({
              ...prev,
              end_time: data.new_end_time,
            }));
          }
        });

        socketRef.current = socket;
      }
    };

    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave:auction", auctionId);
        socketRef.current.disconnect();
      }
    };
  }, [auctionId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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

  const handlePlaceBid = async () => {
    setBidError("");
    setBidSuccess("");

    if (!bidAmount || isNaN(bidAmount)) {
      setBidError("Please enter a valid amount.");
      return;
    }

    const minBid = parseFloat(auction.current_highest_bid || auction.base_price);
    if (parseFloat(bidAmount) <= minBid) {
      setBidError(`Bid must be more than ${formatCurrency(minBid)}`);
      return;
    }

    setBidLoading(true);
    try {
      await placeBid(auctionId, parseFloat(bidAmount));
      setBidSuccess("Bid placed successfully! 🎉");
      setBidAmount("");
      setTimeout(() => {
        setBidModalVisible(false);
        setBidSuccess("");
      }, 1500);
    } catch (err) {
      setBidError(err.response?.data?.message || "Failed to place bid.");
    } finally {
      setBidLoading(false);
    }
  };

  const minBidAmount = auction
    ? parseFloat(auction.current_highest_bid || auction.base_price) + 1
    : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D94F2B" />
        <Text style={styles.loadingText}>Loading auction...</Text>
      </View>
    );
  }

  if (!auction) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Auction not found.</Text>
      </View>
    );
  }

  const isSeller = auction.seller_id === userId;
  const isActive = auction.status === "ACTIVE";

  return (
  <KeyboardAvoidingView 
    style={styles.container}
    behavior={Platform.OS === "ios" ? "padding" : "height"}>
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {auction.title}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D94F2B" />
        }
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* STATUS + CATEGORY */}
        <View style={styles.tagRow}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: auction.status === "ACTIVE" ? "#FFF5F3" : "#F5F2EE" }
          ]}>
            <Text style={[
              styles.statusText,
              { color: auction.status === "ACTIVE" ? "#D94F2B" : "#8A7968" }
            ]}>
              {auction.status}
            </Text>
          </View>
          {auction.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{auction.category}</Text>
            </View>
          )}
        </View>

        {/* PRICE CARDS */}
        <View style={styles.priceRow}>
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Base Price</Text>
            <Text style={styles.priceValue}>
              {formatCurrency(auction.base_price)}
            </Text>
          </View>
          <View style={[styles.priceCard, styles.priceCardAccent]}>
            <Text style={[styles.priceLabel, { color: "rgba(255,255,255,0.8)" }]}>
              Current Bid
            </Text>
            <Text style={[styles.priceValue, { color: "#FFFFFF" }]}>
              {formatCurrency(auction.current_highest_bid || auction.base_price)}
            </Text>
          </View>
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Time Left</Text>
            <Text style={[styles.priceValue, { color: "#D94F2B", fontSize: 14 }]}>
              {formatTimeLeft(auction.end_time)}
            </Text>
          </View>
        </View>
        
      {/* Images Section */}
        {auction.images && auction.images.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}>
            {auction.images.map((uri, index) => (
              <Image
                key={index}
                source={{ uri }}
                style={{
                  width: 300,
                  height: 200,
                  borderRadius: 12,
                  marginRight: 10,
                }}
              />
            ))}
          </ScrollView>
        )}

        {/* DESCRIPTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this lot</Text>
          <View style={styles.descCard}>
            <Text style={styles.descText}>
              {auction.description || "No description provided."}
            </Text>
          </View>
        </View>

        {/* AUCTION INFO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auction Details</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Seller</Text>
              <Text style={styles.infoValue}>{auction.seller_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Start Time</Text>
              <Text style={styles.infoValue}>{formatDate(auction.start_time)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>End Time</Text>
              <Text style={styles.infoValue}>{formatDate(auction.end_time)}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Total Bids</Text>
              <Text style={styles.infoValue}>{bids.length}</Text>
            </View>
          </View>
        </View>

        {/* BID HISTORY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bid History</Text>
          {bids.length === 0 ? (
            <View style={styles.emptyBids}>
              <Text style={styles.emptyBidsText}>No bids yet. Be the first!</Text>
            </View>
          ) : (
            bids.map((bid, index) => (
              <View key={bid.id} style={styles.bidRow}>
                <View style={styles.bidAvatar}>
                  <Text style={styles.bidAvatarText}>
                    {bid.bidder_name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.bidInfo}>
                  <Text style={styles.bidName}>{bid.bidder_name}</Text>
                  <Text style={styles.bidTime}>
                    {new Date(bid.created_at).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <View style={styles.bidAmountWrapper}>
                  <Text style={styles.bidAmount}>
                    {formatCurrency(bid.bid_amount)}
                  </Text>
                  {index === 0 && (
                    <Text style={styles.leadingBadge}>Leading</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* BOTTOM ACTION */}
      {role === "BUYER" && isActive && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarLeft}>
            <Text style={styles.bottomBarLabel}>Min. bid</Text>
            <Text style={styles.bottomBarValue}>
              {formatCurrency(minBidAmount)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.placeBidButton}
            onPress={() => setBidModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.placeBidText}>Place Bid →</Text>
          </TouchableOpacity>
        </View>
      )}

      {role === "SELLER" && (
        <View style={styles.bottomBar}>
          <Text style={styles.sellerNote}>
            {isActive
              ? `${bids.length} bids received so far`
              : `Auction ${auction.status.toLowerCase()}`}
          </Text>
        </View>
      )}

      {/* BID MODAL */}
      <Modal
        visible={bidModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBidModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Place Your Bid</Text>
            <Text style={styles.modalSub}>
              Current highest: {formatCurrency(auction.current_highest_bid || auction.base_price)}
            </Text>

            {bidError ? (
              <View style={styles.modalError}>
                <Text style={styles.modalErrorText}>⚠️ {bidError}</Text>
              </View>
            ) : null}

            {bidSuccess ? (
              <View style={styles.modalSuccess}>
                <Text style={styles.modalSuccessText}>{bidSuccess}</Text>
              </View>
            ) : null}

            <Text style={styles.modalLabel}>YOUR BID AMOUNT (₹)</Text>
            <View style={styles.modalInput}>
              <Text style={styles.modalInputPrefix}>₹</Text>
              <TextInput
                style={styles.modalInputText}
                placeholder={`Min. ${formatCurrency(minBidAmount)}`}
                placeholderTextColor="#BBAB9F"
                value={bidAmount}
                onChangeText={(t) => {
                  setBidAmount(t);
                  setBidError("");
                }}
                keyboardType="numeric"
                autoFocus
                returnKeyType="done"   
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setBidModalVisible(false);
                  setBidAmount("");
                  setBidError("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  bidLoading && styles.modalConfirmBtnDisabled,
                ]}
                onPress={handlePlaceBid}
                disabled={bidLoading}
              >
                <Text style={styles.modalConfirmText}>
                  {bidLoading ? "Placing..." : "Confirm Bid"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
   </KeyboardAvoidingView>
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
    paddingTop: 56,
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
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
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
  tagRow: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F5F2EE",
  },
  categoryBadgeText: {
    fontSize: 11,
    color: "#8A7968",
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  priceCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  priceCardAccent: {
    backgroundColor: "#D94F2B",
    borderColor: "#D94F2B",
  },
  priceLabel: {
    fontSize: 9,
    color: "#8A7968",
    fontWeight: "600",
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1208",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1208",
    marginBottom: 10,
    marginTop: 8,
  },
  descCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  descText: {
    fontSize: 14,
    color: "#4A3F35",
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  infoLabel: {
    fontSize: 13,
    color: "#8A7968",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1208",
  },
  emptyBids: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  emptyBidsText: {
    fontSize: 13,
    color: "#8A7968",
  },
  bidRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    gap: 12,
  },
  bidAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D94F2B",
    alignItems: "center",
    justifyContent: "center",
  },
  bidAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bidInfo: {
    flex: 1,
  },
  bidName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1208",
  },
  bidTime: {
    fontSize: 11,
    color: "#8A7968",
    marginTop: 2,
  },
  bidAmountWrapper: {
    alignItems: "flex-end",
    gap: 4,
  },
  bidAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1208",
  },
  leadingBadge: {
    fontSize: 9,
    color: "#2E7D32",
    fontWeight: "700",
    backgroundColor: "#F1F8E9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
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
  bottomBarLeft: {
    gap: 2,
  },
  bottomBarLabel: {
    fontSize: 11,
    color: "#8A7968",
  },
  bottomBarValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1208",
  },
  placeBidButton: {
    backgroundColor: "#D94F2B",
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  placeBidText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sellerNote: {
    fontSize: 14,
    color: "#8A7968",
    textAlign: "center",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#F0EBE3",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1208",
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 14,
    color: "#8A7968",
    marginBottom: 20,
  },
  modalError: {
    backgroundColor: "#FFE5E5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFBBBB",
  },
  modalErrorText: {
    fontSize: 13,
    color: "#C0392B",
  },
  modalSuccess: {
    backgroundColor: "#F1F8E9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  modalSuccessText: {
    fontSize: 13,
    color: "#2E7D32",
    fontWeight: "600",
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4A3F35",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  modalInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 24,
    gap: 8,
  },
  modalInputPrefix: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D94F2B",
  },
  modalInputText: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1208",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.12)",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8A7968",
  },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 50,
    backgroundColor: "#D94F2B",
    alignItems: "center",
  },
  modalConfirmBtnDisabled: {
    backgroundColor: "#E8A090",
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});