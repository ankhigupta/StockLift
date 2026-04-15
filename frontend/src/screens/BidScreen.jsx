import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function BidScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Bid Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F0EBE3" },
  text: { fontSize: 18, color: "#1A1208" },
});