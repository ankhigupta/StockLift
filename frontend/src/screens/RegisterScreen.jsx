import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { registerUser } from "../services/auth.service";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("BUYER");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");

    if (!name || !email || !password || !confirmPassword || !phone) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await registerUser(name, email, password, phone, role);
      navigation.replace("Main");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // <KeyboardAvoidingView
    //   style={{ flex: 1 }}
    //   behavior={Platform.OS === "ios" ? "padding" : "height"}
    // >
      
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle="light-content" backgroundColor="#D94F2B" />

        {/* ORANGE HEADER */}
        <View style={styles.header}>
          <View style={styles.headerCircle} />
          <View style={styles.headerCircle2} />
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
          <Text style={styles.brandName}>StockLift</Text>
          <Text style={styles.brandSub}>B2B Inventory Auctions</Text>
        </View>

        {/* BODY */}
        <View style={styles.body}>

          <Text style={styles.pageTitle}>Create account</Text>
          <Text style={styles.pageSub}>Join India's B2B auction network</Text>

          {/* error banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* role selector */}
          <Text style={styles.fieldLabel}>I AM A</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === "BUYER" && styles.roleButtonActive,
              ]}
              onPress={() => setRole("BUYER")}
              activeOpacity={0.8}
            >
              <Text style={styles.roleIcon}></Text>
              <Text style={[
                styles.roleText,
                role === "BUYER" && styles.roleTextActive,
              ]}>
                BUYER
              </Text>
              <Text style={[
                styles.roleDesc,
                role === "BUYER" && styles.roleDescActive,
              ]}>
                I want to bid
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                role === "SELLER" && styles.roleButtonActive,
              ]}
              onPress={() => setRole("SELLER")}
              activeOpacity={0.8}
            >
              <Text style={styles.roleIcon}></Text>
              <Text style={[
                styles.roleText,
                role === "SELLER" && styles.roleTextActive,
              ]}>
                SELLER
              </Text>
              <Text style={[
                styles.roleDesc,
                role === "SELLER" && styles.roleDescActive,
              ]}>
                I want to auction
              </Text>
            </TouchableOpacity>
          </View>

          {/* full name */}
          <Text style={styles.fieldLabel}>FULL NAME</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}></Text>
            <TextInput
              style={styles.input}
              placeholder="Rajesh Kumar"
              placeholderTextColor="#BBAB9F"
              value={name}
              onChangeText={(t) => { setName(t); setError(""); }}
              autoCapitalize="words"
            />
          </View>

          {/* phone */}
          <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}></Text>
            <TextInput
              style={styles.input}
              placeholder="9876543210"
              placeholderTextColor="#BBAB9F"
              value={phone}
              onChangeText={(t) => { setPhone(t); setError(""); }}
              keyboardType="phone-pad"
            />
          </View>

          {/* email */}
          <Text style={styles.fieldLabel}>WORK EMAIL</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}></Text>
            <TextInput
              style={styles.input}
              placeholder="rajesh@company.com"
              placeholderTextColor="#BBAB9F"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* password */}
          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}></Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 8 characters"
              placeholderTextColor="#BBAB9F"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(""); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.showToggle}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* confirm password */}
          <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}></Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat your password"
              placeholderTextColor="#BBAB9F"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>

          {/* register button */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              loading && styles.registerButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.registerButtonText}>
              {loading ? "Creating account..." : "Create Account →"}
            </Text>
          </TouchableOpacity>

          {/* divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* login link */}
          <TouchableOpacity
            style={styles.loginRow}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.loginText}>
              Already have an account?{" "}
              <Text style={styles.loginLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    // </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
  flexGrow: 1,
},
  container: {
    flex: 1,
    backgroundColor: "#F0EBE3",
  },
  header: {
    backgroundColor: "#D94F2B",
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  headerCircle: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    right: -60,
    top: 10,
  },
  headerCircle2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    right: -20,
    top: 60,
  },
  logoBox: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoLetter: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  brandName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    marginTop: 4,
  },
  body: {
    backgroundColor: "#F0EBE3",
    padding: 24,
    paddingTop: 28,
    paddingBottom: 60,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1A1208",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    marginBottom: 5,
  },
  pageSub: {
    fontSize: 14,
    color: "#8A7968",
    marginBottom: 22,
  },
  errorBanner: {
    backgroundColor: "#FFE5E5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#FFBBBB",
  },
  errorText: {
    fontSize: 13,
    color: "#C0392B",
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4A3F35",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 16,
  },
  roleRow: {
    flexDirection: "row",
    gap: 12,
  },
  roleButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  roleButtonActive: {
    borderColor: "#D94F2B",
    backgroundColor: "#FFF5F3",
  },
  roleIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8A7968",
  },
  roleTextActive: {
    color: "#D94F2B",
  },
  roleDesc: {
    fontSize: 11,
    color: "#BBAB9F",
  },
  roleDescActive: {
    color: "#E8907A",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  inputIcon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1A1208",
  },
  showToggle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D94F2B",
  },
  registerButton: {
    backgroundColor: "#D94F2B",
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 28,
  },
  registerButtonDisabled: {
    backgroundColor: "#E8A090",
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: "#C9BDB3",
  },
  dividerText: {
    fontSize: 12,
    color: "#8A7968",
  },
  loginRow: {
    alignItems: "center",
    marginTop: 18,
  },
  loginText: {
    fontSize: 13,
    color: "#8A7968",
  },
  loginLink: {
    color: "#D94F2B",
    fontWeight: "700",
  },
});