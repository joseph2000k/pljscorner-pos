import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BottomNavigation({
  onNavigateToReports,
  onNavigateToProducts,
  onNavigateToPOS,
  onOpenReceipts,
  onNavigateToSettings,
  keyboardVisible,
}) {
  const insets = useSafeAreaInsets();

  if (keyboardVisible) {
    return null;
  }

  return (
    <View
      style={[
        styles.bottomNavigation,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <TouchableOpacity style={styles.navButton} onPress={onNavigateToReports}>
        <Ionicons name="analytics-outline" size={24} color="#8E8E93" />
        <Text style={styles.navButtonText}>Reports</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navButton} onPress={onNavigateToProducts}>
        <Ionicons name="cube-outline" size={24} color="#8E8E93" />
        <Text style={styles.navButtonText}>Products</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.centerNavButton}
        onPress={onNavigateToPOS}
      >
        <View style={styles.centerNavCircle}>
          <Ionicons name="cart" size={32} color="#fff" />
        </View>
        <Text style={styles.navButtonText}>POS</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navButton} onPress={onOpenReceipts}>
        <Ionicons name="receipt-outline" size={24} color="#8E8E93" />
        <Text style={styles.navButtonText}>Receipts</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navButton} onPress={onNavigateToSettings}>
        <Ionicons name="settings-outline" size={24} color="#8E8E93" />
        <Text style={styles.navButtonText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavigation: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingTop: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 8,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
  },
  centerNavButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    marginTop: -30,
  },
  centerNavCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: "#fff",
  },
  navButtonText: {
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 4,
    fontWeight: "500",
  },
});
