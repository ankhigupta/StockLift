import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Image, Alert, TextInput, Modal,KeyboardAvoidingView, Platform
} from "react-native";
import { getPublicProfile, createReview, canReview } from "../services/review.service";

export default function PublicProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewable, setReviewable] = useState(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { auctionId } = route.params || {};

  useEffect(() => {
    fetchProfile();
    if (auctionId) fetchCanReview();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const data = await getPublicProfile(userId);
      setProfile(data.profile);
    } catch (err) {
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCanReview = async () => {
    try {
      const data = await canReview(auctionId);
      setReviewable(data);
    } catch (err) {
      // silently fail
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewable?.reviewed_id) return;
    setSubmitting(true);
    try {
      await createReview(auctionId, reviewable.reviewed_id, rating, comment);
      Alert.alert("Review submitted! ✅", "Thank you for your feedback.");
      setReviewModal(false);
      setComment("");
      setRating(5);
      fetchProfile();
      setReviewable({ ...reviewable, can_review: false, already_reviewed: true });
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating, interactive = false, size = 16) => {
    return (
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={interactive ? () => setRating(star) : undefined}
            disabled={!interactive}
            activeOpacity={interactive ? 0.7 : 1}
          >
            <Text style={{ fontSize: size, color: star <= rating ? "#F59E0B" : "#D1D5DB" }}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getReliabilityColor = (score) => {
    if (score >= 90) return "#2E7D32";
    if (score >= 70) return "#C8943A";
    return "#D94F2B";
  };

 const getReliabilityLabel = (score, hasOrders) => {
  if (!hasOrders) return "No orders yet";
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
};

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D94F2B" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Profile not found.</Text>
      </View>
    );
  }

  const isSeller = profile.role === "SELLER";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#D94F2B" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <View style={styles.headerCircle2} />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.avatarWrapper}>
          {profile.profile_image_url ? (
            <Image source={{ uri: profile.profile_image_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {profile.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.profileName}>{profile.name}</Text>
          {profile.is_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{profile.role}</Text>
        </View>

        {profile.is_suspended && (
          <View style={styles.suspendedBadge}>
            <Text style={styles.suspendedText}>⚠️ Suspended</Text>
          </View>
        )}

        {/* Rating summary */}
        {profile.review_count > 0 && (
          <View style={styles.ratingRow}>
            {renderStars(Math.round(profile.avg_rating), false, 14)}
            <Text style={styles.ratingText}>
              {profile.avg_rating} ({profile.review_count} review{profile.review_count !== 1 ? "s" : ""})
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* STATS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isSeller ? "Seller Stats" : "Buyer Stats"}
          </Text>

          {isSeller ? (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{profile.stats?.total_auctions || 0}</Text>
                <Text style={styles.statLabel}>Total{"\n"}Auctions</Text>
              </View>
              <View style={[styles.statCard, styles.statCardAccent]}>
                <Text style={[styles.statValue, { color: "#FFFFFF" }]}>
                  {profile.stats?.completed_auctions || 0}
                </Text>
                <Text style={[styles.statLabel, { color: "rgba(255,255,255,0.8)" }]}>
                  Completed{"\n"}Auctions
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{profile.stats?.active_auctions || 0}</Text>
                <Text style={styles.statLabel}>Active{"\n"}Now</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{profile.stats?.total_bids || 0}</Text>
                  <Text style={styles.statLabel}>Total{"\n"}Bids</Text>
                </View>
                <View style={[styles.statCard, styles.statCardAccent]}>
                  <Text style={[styles.statValue, { color: "#FFFFFF" }]}>
                    {profile.stats?.auctions_won || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: "rgba(255,255,255,0.8)" }]}>
                    Auctions{"\n"}Won
                  </Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{profile.stats?.auctions_participated || 0}</Text>
                  <Text style={styles.statLabel}>Auctions{"\n"}Joined</Text>
                </View>
              </View>

              {/* Reliability score */}
              <View style={styles.reliabilityCard}>
                <View>
                  <Text style={styles.reliabilityLabel}>Reliability Score</Text>
                  <Text style={styles.reliabilitySubLabel}>Based on payment history</Text>
                </View>
                <View style={styles.reliabilityRight}>
                  <Text style={[styles.reliabilityScore, { color: getReliabilityColor(profile.stats?.reliability_score || 100) }]}>
                    {parseInt(profile.stats?.auctions_won) > 0 ? `${profile.stats?.reliability_score}%` : "N/A"}
                </Text>
                <Text style={[styles.reliabilityBadge, { color: getReliabilityColor(profile.stats?.reliability_score || 100) }]}>
                    {getReliabilityLabel(profile.stats?.reliability_score || 100, parseInt(profile.stats?.auctions_won) > 0)}
                </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* REVIEWS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {reviewable?.can_review && (
              <TouchableOpacity
                style={styles.leaveReviewBtn}
                onPress={() => setReviewModal(true)}>
                <Text style={styles.leaveReviewText}>+ Leave Review</Text>
              </TouchableOpacity>
            )}
            {reviewable?.already_reviewed && (
              <Text style={styles.alreadyReviewed}>✓ Reviewed</Text>
            )}
          </View>

          {profile.reviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No reviews yet</Text>
              <Text style={styles.emptyText}>Be the first to leave a review</Text>
            </View>
          ) : (
            profile.reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    {review.reviewer_image ? (
                      <Image
                        source={{ uri: review.reviewer_image }}
                        style={{ width: 36, height: 36, borderRadius: 18 }}
                      />
                    ) : (
                      <Text style={styles.reviewAvatarText}>
                        {review.reviewer_name?.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </Text>
                  </View>
                  {renderStars(review.rating, false, 13)}
                </View>
                {review.comment ? (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* REVIEW MODAL */}
      <Modal
        visible={reviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModal(false)}
      >
    
  
   <KeyboardAvoidingView
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    style={{ flex: 1 }}
    >
    <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Leave a Review</Text>
            <Text style={styles.modalSub}>Rate your experience with {profile.name}</Text>

            <Text style={styles.modalLabel}>RATING</Text>
            <View style={{ marginBottom: 20 }}>
              {renderStars(rating, true, 36)}
            </View>

            <Text style={styles.modalLabel}>COMMENT (OPTIONAL)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Share your experience..."
              placeholderTextColor="#BBAB9F"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setReviewModal(false); setComment(""); setRating(5); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmitReview}
                disabled={submitting}>
                <Text style={styles.modalConfirmText}>
                  {submitting ? "Submitting..." : "Submit Review"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
    </KeyboardAvoidingView>
        
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0EBE3" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F0EBE3", gap: 12 },
  loadingText: { fontSize: 14, color: "#8A7968" },
  errorText: { fontSize: 14, color: "#C0392B" },
  header: {
    backgroundColor: "#D94F2B", paddingTop: 56, paddingBottom: 24,
    paddingHorizontal: 20, alignItems: "center", position: "relative", overflow: "hidden",
  },
  headerCircle: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", right: -50, top: -20,
  },
  headerCircle2: {
    position: "absolute", width: 150, height: 150, borderRadius: 75,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", left: -30, bottom: -30,
  },
  backButton: { alignSelf: "flex-start", marginBottom: 12 },
  backText: { fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  avatarWrapper: { marginBottom: 12 },
  avatarImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "#FFFFFF" },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.25)", borderWidth: 3, borderColor: "#FFFFFF",
    justifyContent: "center", alignItems: "center",
  },
  avatarInitial: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  profileName: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.3 },
  verifiedBadge: {
    backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 10,
  },
  verifiedText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
  roleBadge: {
    backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14,
    paddingVertical: 4, borderRadius: 20, marginBottom: 6,
  },
  roleText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF", letterSpacing: 1 },
  suspendedBadge: {
    backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 12,
    paddingVertical: 4, borderRadius: 20, marginBottom: 6,
  },
  suspendedText: { fontSize: 11, fontWeight: "700", color: "#FFD0C8" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  ratingText: { fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A1208", marginBottom: 10, marginTop: 16 },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
  },
  statCardAccent: { backgroundColor: "#D94F2B", borderColor: "#D94F2B" },
  statValue: { fontSize: 22, fontWeight: "800", color: "#1A1208", marginBottom: 4 },
  statLabel: { fontSize: 10, color: "#8A7968", fontWeight: "600", textAlign: "center", lineHeight: 14 },
  reliabilityCard: {
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
  },
  reliabilityLabel: { fontSize: 14, fontWeight: "700", color: "#1A1208" },
  reliabilitySubLabel: { fontSize: 11, color: "#8A7968", marginTop: 2 },
  reliabilityRight: { alignItems: "flex-end" },
  reliabilityScore: { fontSize: 28, fontWeight: "800" },
  reliabilityBadge: { fontSize: 11, fontWeight: "700" },
  leaveReviewBtn: {
    backgroundColor: "#D94F2B", paddingHorizontal: 14,
    paddingVertical: 7, borderRadius: 20,
  },
  leaveReviewText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  alreadyReviewed: { fontSize: 12, color: "#2E7D32", fontWeight: "600" },
  emptyCard: {
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 24,
    alignItems: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#1A1208", marginBottom: 4 },
  emptyText: { fontSize: 13, color: "#8A7968" },
  reviewCard: {
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#D94F2B", alignItems: "center", justifyContent: "center",
  },
  reviewAvatarText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  reviewMeta: { flex: 1 },
  reviewerName: { fontSize: 13, fontWeight: "600", color: "#1A1208" },
  reviewDate: { fontSize: 11, color: "#8A7968" },
  reviewComment: { fontSize: 13, color: "#4A3F35", lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#F0EBE3", borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#1A1208", marginBottom: 4 },
  modalSub: { fontSize: 14, color: "#8A7968", marginBottom: 20 },
  modalLabel: { fontSize: 10, fontWeight: "700", color: "#4A3F35", letterSpacing: 1.5, marginBottom: 8 },
  modalInput: {
    backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)", paddingHorizontal: 14, paddingVertical: 14,
    marginBottom: 24, fontSize: 15, color: "#1A1208", height: 100, textAlignVertical: "top",
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 50,
    borderWidth: 1.5, borderColor: "rgba(0,0,0,0.12)", alignItems: "center",
  },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: "#8A7968" },
  modalConfirmBtn: {
    flex: 2, paddingVertical: 16, borderRadius: 50,
    backgroundColor: "#D94F2B", alignItems: "center",
  },
  modalConfirmText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});