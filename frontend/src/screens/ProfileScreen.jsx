import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import { getUserProfile, updateProfileImage } from "../services/user.service";

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchProfile = async () => {
  try {
    const data = await getUserProfile();
    console.log("profile data:", JSON.stringify(data));
    setProfile(data.user);
    setStats(data.stats);
  } catch (err) {
    console.log("profile error:", err.response?.status, err.response?.data);
    setError("Failed to load profile.");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageLoading(true);
      try {
        const data = await updateProfileImage(uri);
        // instead of just updating the image, refetch the full profile
        await fetchProfile();
      } catch (err) {
        console.log("image upload error:", err.response?.status, err.response?.data, err.message);
        Alert.alert("Error", "Failed to update profile picture.");
      }finally {
    setImageLoading(false); 
     }
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync("accessToken");
          await SecureStore.deleteItemAsync("refreshToken");
          await SecureStore.deleteItemAsync("userRole");
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        },
      },
    ]);
  };

  const formatCurrency = (amount) => {
    if (!amount) return "₹0";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D94F2B" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const isSeller = profile?.role === "SELLER";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#D94F2B" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <View style={styles.headerCircle2} />
        <Text style={styles.headerTitle}>Profile</Text>

        {/* AVATAR */}
        <View style={styles.avatarWrapper}>
          <TouchableOpacity onPress={handlePickImage} disabled={imageLoading} activeOpacity={0.85}>
            {imageLoading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : profile?.profile_image_url ? (
              <Image source={{ uri: profile.profile_image_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {profile?.name?.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>✏️</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.profileName}>{profile?.name}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{profile?.role}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* CONTACT INFO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile?.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{profile?.phone || "Not set"}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Member since</Text>
              <Text style={styles.infoValue}>
                {new Date(profile?.created_at).toLocaleDateString("en-IN", {
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* STATS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isSeller ? "Seller Stats" : "Buyer Stats"}
          </Text>

          {isSeller ? (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats?.total_auctions || 0}</Text>
                  <Text style={styles.statLabel}>Total{"\n"}Auctions</Text>
                </View>
                <View style={[styles.statCard, styles.statCardAccent]}>
                  <Text style={[styles.statValue, { color: "#FFFFFF" }]}>
                    {stats?.active_auctions || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: "rgba(255,255,255,0.8)" }]}>
                    Active{"\n"}Now
                  </Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats?.ended_auctions || 0}</Text>
                  <Text style={styles.statLabel}>Ended{"\n"}Auctions</Text>
                </View>
              </View>
              <View style={styles.revenueCard}>
                <Text style={styles.revenueLabel}>Total Revenue</Text>
                <Text style={styles.revenueValue}>
                  {formatCurrency(stats?.total_revenue)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.total_bids || 0}</Text>
                <Text style={styles.statLabel}>Total{"\n"}Bids</Text>
              </View>
              <View style={[styles.statCard, styles.statCardAccent]}>
                <Text style={[styles.statValue, { color: "#FFFFFF" }]}>
                  {stats?.auctions_participated || 0}
                </Text>
                <Text style={[styles.statLabel, { color: "rgba(255,255,255,0.8)" }]}>
                  Auctions{"\n"}Joined
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.auctions_won || 0}</Text>
                <Text style={styles.statLabel}>Auctions{"\n"}Won</Text>
              </View>
            </View>
          )}
        </View>
        {/* STRIKE WARNING — buyers only */}
        {!isSeller && profile?.strike_count > 0 && (
          <View style={styles.section}>
            <View style={[
              styles.strikeCard,
              profile.strike_count >= 3 && styles.strikeCardDanger
            ]}>
              <Text style={styles.strikeIcon}>
                {profile.strike_count >= 3 ? "🚨" : "⚠️"}
              </Text>
              <View style={styles.strikeContent}>
                <Text style={styles.strikeTitle}>
                  {profile.is_suspended
                    ? "Account Suspended"
                    : `${profile.strike_count} Strike${profile.strike_count > 1 ? "s" : ""}`}
                </Text>
                <Text style={styles.strikeText}>
                  {profile.is_suspended
                    ? "Your account has been suspended due to repeated non-payment. Contact support."
                    : `${4 - profile.strike_count} more strike${4 - profile.strike_count > 1 ? "s" : ""} will result in account suspension.`}
                </Text>
              </View>
              <View style={styles.strikeBadge}>
                <Text style={styles.strikeBadgeText}>
                  {profile.strike_count}/4
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* LOGOUT */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0EBE3" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0EBE3",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#8A7968" },
  header: {
    backgroundColor: "#D94F2B",
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: "center",
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
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    left: -30,
    bottom: -30,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  avatarWrapper: { marginBottom: 12 },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 32, fontWeight: "800", color: "#FFFFFF" },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  editBadgeText: { fontSize: 11 },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  roleBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF", letterSpacing: 1 },
  scroll: { flex: 1 },
  errorBanner: {
    backgroundColor: "#FFE5E5",
    margin: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFBBBB",
  },
  errorText: { fontSize: 13, color: "#C0392B" },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1208",
    marginBottom: 10,
    marginTop: 16,
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
  infoLabel: { fontSize: 13, color: "#8A7968" },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#1A1208", maxWidth: "60%", textAlign: "right" },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  statCardAccent: { backgroundColor: "#D94F2B", borderColor: "#D94F2B" },
  statValue: { fontSize: 24, fontWeight: "800", color: "#1A1208", marginBottom: 4 },
  statLabel: { fontSize: 10, color: "#8A7968", fontWeight: "600", textAlign: "center", lineHeight: 14 },
  revenueCard: {
    backgroundColor: "#D94F2B",
    borderRadius: 12,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  revenueLabel: { fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  revenueValue: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
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
  },
  logoutButton: {
    backgroundColor: "#FFF0ED",
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D94F2B",
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#D94F2B" },
  strikeCard: {
    backgroundColor: "#FFF8EE",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#F5D78E",
  },
  strikeCardDanger: {
    backgroundColor: "#FFF0ED",
    borderColor: "#FFB8A8",
  },
  strikeIcon: { fontSize: 24 },
  strikeContent: { flex: 1 },
  strikeTitle: { fontSize: 14, fontWeight: "700", color: "#1A1208", marginBottom: 3 },
  strikeText: { fontSize: 12, color: "#8A7968", lineHeight: 17 },
  strikeBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  strikeBadgeText: { fontSize: 13, fontWeight: "800", color: "#D94F2B" },
});