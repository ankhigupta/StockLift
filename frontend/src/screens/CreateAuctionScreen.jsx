import { useState ,useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, ActivityIndicator,
  Image, SafeAreaView, Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import api from "../services/api";
import { createAuction } from "../services/auction.service";

const CATEGORIES = ["Electronics", "Apparel", "FMCG", "Furniture", "Machinery", "Other"];
const CONDITIONS = ["NEW", "LIKE NEW", "GOOD", "FAIR"];
const DURATIONS = [
  { label: "24 Hours", hours: 24 },
  { label: "48 Hours", hours: 48 },
  { label: "72 Hours", hours: 72 },
  { label: "7 Days", hours: 168 },
];

export default function CreateAuctionScreen({ navigation,route }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [condition, setCondition] = useState("NEW");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [minBidIncrement, setMinBidIncrement] = useState("100");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState(DURATIONS[1]);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const { auctionId, isEdit } = route.params || {};

  // Start time state
  const [startNow, setStartNow] = useState(true); // true = start immediately, false = schedule
  const [startDate, setStartDate] = useState(new Date(Date.now() + 60 * 60 * 1000)); // 1hr from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);


  useEffect(() => {
    if (isEdit && auctionId) {
      const loadAuction = async () => {
        try {
          const res = await api.get(`/auctions/${auctionId}`);
          const a = res.data.auction;
          setTitle(a.title || "");
          setCategory(a.category || "");
          setQuantity(a.quantity?.toString() || "");
          setCondition(a.condition?.replace("_", " ") || "NEW");
          setDescription(a.description || "");
          setBasePrice(a.base_price?.toString() || "");
          setMinBidIncrement(a.min_bid_increment?.toString() || "100");
          setLocation(a.location || "");
          setImages(a.images || []);
          // Handle start time
          if (a.start_time) {
            const start = new Date(a.start_time);
            const isInFuture = start > new Date();
            setStartNow(!isInFuture);
            setStartDate(start);
          }
        } catch (err) {
          Alert.alert("Error", "Failed to load auction data");
        }
      };
      loadAuction();
    }
  }, [isEdit, auctionId]);

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow access to your photo library");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 8,
    });
    if (!result.canceled) uploadImages(result.assets);
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow access to your camera");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) uploadImages(result.assets);
  };

  const showImageOptions = () => {
    Alert.alert("Add Photos", "Choose how you want to add photos", [
      { text: "📷 Take Photo", onPress: pickFromCamera },
      { text: "🖼️ Choose from Gallery", onPress: pickFromGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const uploadImages = async (assets) => {
    setUploading(true);
    try {
      const formData = new FormData();
      assets.forEach((asset, index) => {
        formData.append("images", {
          uri: asset.uri,
          type: "image/jpeg",
          name: `image_${index}.jpg`,
        });
      });
      const response = await api.post("/upload/images", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImages(prev => [...prev, ...response.data.images]);
      Alert.alert("Success", `${response.data.images.length} image(s) uploaded!`);
    } catch (err) {
      Alert.alert("Error", "Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => setImages(prev => prev.filter((_, i) => i !== index));

  const formatStartDate = (date) => {
    return date.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const formatStartTime = (date) => {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit",
    });
  };

  const validateFields = () => {
    if (!title || !basePrice || !category || !quantity || !description || !location) {
      Alert.alert("Missing Fields", "Please fill in title, category, quantity, description, location and base price.");
      return false;
    }
    if (!startNow && startDate <= new Date()) {
      Alert.alert("Invalid Start Time", "Scheduled start time must be in the future.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (asDraft = false) => {
  if (!validateFields()) return;

  try {
    setLoading(true);
    const startTime = startNow ? new Date() : startDate;
    const endTime = new Date(startTime.getTime() + duration.hours * 60 * 60 * 1000);
    const status = asDraft ? "DRAFT" : "UPCOMING";

    const payload = {
      title, description, category,
      base_price: parseFloat(basePrice),
      quantity: parseInt(quantity),
      condition: condition.replace(" ", "_").toUpperCase(),
      min_bid_increment: parseFloat(minBidIncrement),
      location,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      images,
      status,
    };

    if (isEdit && auctionId) {
      await api.put(`/auctions/${auctionId}`, payload);
    } else {
      await createAuction(payload);
    }

    const message = asDraft
      ? "Auction saved as draft."
      : startNow ? "Your auction is now live!" : "Your auction has been scheduled.";

    Alert.alert(asDraft ? "Draft Saved 📝" : "Success! 🎉", message, [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  } catch (err) {
    Alert.alert("Error", err.response?.data?.message || "Failed to save auction");
  } finally {
    setLoading(false);
  }
};

         
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isEdit ? "Edit Auction" : "New Auction"}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* PRODUCT INFO */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📦</Text>
            <Text style={styles.cardTitle}>Product Info</Text>
          </View>

          <Text style={styles.label}>LOT / PRODUCT NAME *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Industrial Cable Reels ×240"
            placeholderTextColor="#bbb"
            value={title}
            onChangeText={setTitle}
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>CATEGORY *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowDurationDropdown(false); }}>
                <Text style={category ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {category || "Select..."}
                </Text>
                <Text style={styles.dropdownChevron}>▾</Text>
              </TouchableOpacity>
              {showCategoryDropdown && (
                <View style={styles.dropdownMenu}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.dropdownOption}
                      onPress={() => { setCategory(cat); setShowCategoryDropdown(false); }}>
                      <Text style={styles.dropdownOptionText}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>QUANTITY *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 240"
                placeholderTextColor="#bbb"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.label}>CONDITION *</Text>
          <View style={styles.conditionRow}>
            {CONDITIONS.map(cond => (
              <TouchableOpacity
                key={cond}
                style={[styles.conditionBtn, condition === cond && styles.conditionBtnActive]}
                onPress={() => setCondition(cond)}>
                <Text style={[styles.conditionText, condition === cond && styles.conditionTextActive]}>
                  {cond}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>DESCRIPTION *</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Condition notes, storage info, certifications..."
            placeholderTextColor="#bbb"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>LOCATION *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Delhi NCR Warehouse"
            placeholderTextColor="#bbb"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* IMAGES */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🖼️</Text>
            <Text style={styles.cardTitle}>Product Images</Text>
          </View>

          {images.length === 0 ? (
            <TouchableOpacity style={styles.uploadBox} onPress={showImageOptions} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator color="#D94F2B" size="large" />
              ) : (
                <>
                  <Text style={styles.uploadIcon}>📷</Text>
                  <Text style={styles.uploadTitle}>Tap to upload photos</Text>
                  <Text style={styles.uploadHint}>PNG, JPG up to 5MB · Max 8 images</Text>
                  <TouchableOpacity style={styles.choosePhotosBtn} onPress={showImageOptions}>
                    <Text style={styles.choosePhotosBtnText}>Choose Photos</Text>
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View>
              <View style={styles.imageGrid}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.imageWrap}>
                    <Image source={{ uri }} style={styles.imageTile} />
                    <TouchableOpacity style={styles.imageRemove} onPress={() => removeImage(index)}>
                      <Text style={styles.imageRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              {images.length < 8 && (
                <TouchableOpacity style={styles.addMoreBtn} onPress={showImageOptions}>
                  <Text style={styles.addMoreText}>+ Add More Photos</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* AUCTION SETTINGS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>⚙️</Text>
            <Text style={styles.cardTitle}>Auction Settings</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>RESERVE PRICE *</Text>
              <View style={styles.priceBox}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  value={basePrice}
                  onChangeText={setBasePrice}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#bbb"
                />
              </View>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>BID INCREMENT *</Text>
              <View style={styles.priceBox}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  value={minBidIncrement}
                  onChangeText={setMinBidIncrement}
                  keyboardType="numeric"
                  placeholder="100"
                  placeholderTextColor="#bbb"
                />
              </View>
            </View>
          </View>

          <Text style={styles.label}>DURATION *</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => { setShowDurationDropdown(!showDurationDropdown); setShowCategoryDropdown(false); }}>
            <Text style={styles.dropdownValue}>{duration.label}</Text>
            <Text style={styles.dropdownChevron}>▾</Text>
          </TouchableOpacity>
          {showDurationDropdown && (
            <View style={styles.dropdownMenu}>
              {DURATIONS.map(d => (
                <TouchableOpacity
                  key={d.label}
                  style={styles.dropdownOption}
                  onPress={() => { setDuration(d); setShowDurationDropdown(false); }}>
                  <Text style={styles.dropdownOptionText}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* START TIME */}
          <Text style={styles.label}>START TIME *</Text>
          <View style={styles.startTimeToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, startNow && styles.toggleBtnActive]}
              onPress={() => setStartNow(true)}>
              <Text style={[styles.toggleText, startNow && styles.toggleTextActive]}>
                Start Now
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !startNow && styles.toggleBtnActive]}
              onPress={() => setStartNow(false)}>
              <Text style={[styles.toggleText, !startNow && styles.toggleTextActive]}>
                Schedule
              </Text>
            </TouchableOpacity>
          </View>

          {!startNow && (
            <View style={styles.scheduleBox}>
              <TouchableOpacity
                style={styles.dateTimeBtn}
                onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateTimeIcon}>📅</Text>
                <View>
                  <Text style={styles.dateTimeLabel}>DATE</Text>
                  <Text style={styles.dateTimeValue}>{formatStartDate(startDate)}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.dateTimeDivider} />

              <TouchableOpacity
                style={styles.dateTimeBtn}
                onPress={() => setShowTimePicker(true)}>
                <Text style={styles.dateTimeIcon}>🕐</Text>
                <View>
                  <Text style={styles.dateTimeLabel}>TIME</Text>
                  <Text style={styles.dateTimeValue}>{formatStartTime(startDate)}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {showDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="spinner"
              minimumDate={new Date()}
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) {
                  const updated = new Date(startDate);
                  updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                  setStartDate(updated);
                }
              }}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={startDate}
              mode="time"
              display="spinner"
              onChange={(event, date) => {
                setShowTimePicker(false);
                if (date) {
                  const updated = new Date(startDate);
                  updated.setHours(date.getHours(), date.getMinutes());
                  setStartDate(updated);
                }
              }}
            />
          )}
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.draftBtn, loading && styles.btnDisabled]}
            onPress={() => handleSubmit(true)}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#D94F2B" />
            ) : (
              <Text style={styles.draftBtnText}>Save as Draft</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.publishBtn, loading && styles.btnDisabled]}
            onPress={() => handleSubmit(false)}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.publishBtnText}>
                {startNow ? "Publish Now →" : "Schedule →"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAF7F2" },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: "#FAF7F2",
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  backArrow: { fontSize: 18, color: "#333" },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 19, fontWeight: "700", color: "#1a1a1a" },
  headerSubtitle: { fontSize: 12, color: "#aaa", marginTop: 1 },
  draftBadge: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1.5, borderColor: "#D94F2B",
  },
  draftText: { color: "#D94F2B", fontSize: 12, fontWeight: "600" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  card: {
    backgroundColor: "#fff", borderRadius: 18, padding: 20,
    marginBottom: 14,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  cardIcon: { fontSize: 20, marginRight: 10 },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  label: {
    fontSize: 10, fontWeight: "700", color: "#aaa",
    letterSpacing: 1, marginBottom: 7, marginTop: 14,
  },
  input: {
    backgroundColor: "#F5F3EF", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: "#1a1a1a",
  },
  textarea: { height: 95, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  dropdown: {
    backgroundColor: "#F5F3EF", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  dropdownValue: { fontSize: 15, color: "#1a1a1a" },
  dropdownPlaceholder: { fontSize: 15, color: "#bbb" },
  dropdownChevron: { fontSize: 11, color: "#999" },
  dropdownMenu: {
    backgroundColor: "#fff", borderRadius: 12, marginTop: 4,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
    zIndex: 999,
  },
  dropdownOption: {
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "#F5F3EF",
  },
  dropdownOptionText: { fontSize: 15, color: "#1a1a1a" },
  conditionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  conditionBtn: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 22, backgroundColor: "#F5F3EF",
  },
  conditionBtnActive: { backgroundColor: "#D94F2B" },
  conditionText: { fontSize: 13, color: "#777", fontWeight: "500" },
  conditionTextActive: { color: "#fff", fontWeight: "700" },
  uploadBox: {
    borderWidth: 2, borderColor: "#E0D5C8", borderStyle: "dashed",
    borderRadius: 16, padding: 36, alignItems: "center",
    backgroundColor: "#FAF7F2",
  },
  uploadIcon: { fontSize: 38, marginBottom: 10 },
  uploadTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 5 },
  uploadHint: { fontSize: 12, color: "#aaa", marginBottom: 18 },
  choosePhotosBtn: {
    paddingHorizontal: 22, paddingVertical: 9,
    borderRadius: 22, borderWidth: 1.5, borderColor: "#D94F2B",
  },
  choosePhotosBtnText: { color: "#D94F2B", fontSize: 14, fontWeight: "600" },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  imageWrap: { position: "relative" },
  imageTile: { width: 88, height: 88, borderRadius: 10 },
  imageRemove: {
    position: "absolute", top: -6, right: -6,
    backgroundColor: "#D94F2B", borderRadius: 10,
    width: 20, height: 20, alignItems: "center", justifyContent: "center",
  },
  imageRemoveText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  addMoreBtn: {
    marginTop: 12, padding: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#D94F2B",
    borderStyle: "dashed", alignItems: "center",
  },
  addMoreText: { color: "#D94F2B", fontSize: 14, fontWeight: "600" },
  priceBox: {
    backgroundColor: "#F5F3EF", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: "row", alignItems: "center",
  },
  rupee: { fontSize: 16, color: "#D94F2B", fontWeight: "700", marginRight: 6 },
  priceInput: { flex: 1, fontSize: 15, color: "#1a1a1a" },
  startTimeToggle: {
    flexDirection: "row",
    backgroundColor: "#F5F3EF",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: "#D94F2B" },
  toggleText: { fontSize: 14, fontWeight: "600", color: "#aaa" },
  toggleTextActive: { color: "#fff" },
  scheduleBox: {
    flexDirection: "row",
    backgroundColor: "#F5F3EF",
    borderRadius: 12,
    marginTop: 10,
    overflow: "hidden",
  },
  dateTimeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    padding: 14, gap: 10,
  },
  dateTimeDivider: { width: 1, backgroundColor: "#E0D5C8", marginVertical: 10 },
  dateTimeIcon: { fontSize: 20 },
  dateTimeLabel: { fontSize: 9, color: "#aaa", fontWeight: "700", letterSpacing: 1 },
  dateTimeValue: { fontSize: 13, color: "#1a1a1a", fontWeight: "600", marginTop: 2 },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  draftBtn: {
    flex: 1, padding: 18, borderRadius: 16,
    alignItems: "center", borderWidth: 1.5, borderColor: "#D94F2B",
    backgroundColor: "#fff",
  },
  draftBtnText: { color: "#D94F2B", fontSize: 15, fontWeight: "700" },
  publishBtn: {
    flex: 2, padding: 18, borderRadius: 16,
    alignItems: "center", backgroundColor: "#D94F2B",
    shadowColor: "#D94F2B", shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  publishBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnDisabled: { opacity: 0.6 },
});