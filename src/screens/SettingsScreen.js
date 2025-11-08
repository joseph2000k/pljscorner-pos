import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen({
  onBackPress,
  onBackupDatabase,
  onRestoreBackup,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Backup & Restore Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={onBackupDatabase}
          >
            <View style={styles.settingIconContainer}>
              <Ionicons
                name="cloud-download-outline"
                size={24}
                color="#4CAF50"
              />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Backup Database</Text>
              <Text style={styles.settingDescription}>
                Export all data, products, and images
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={onRestoreBackup}
          >
            <View style={styles.settingIconContainer}>
              <Ionicons name="cloud-upload-outline" size={24} color="#FF9800" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Restore Backup</Text>
              <Text style={styles.settingDescription}>
                Import data from a backup file
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoContainer}>
            <Text style={styles.appName}>PLJ's Corner POS</Text>
            <Text style={styles.appVersion}>Version 2.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#007AFF",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    backgroundColor: "#fff",
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f5f5f5",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingIconContainer: {
    width: 40,
    alignItems: "center",
  },
  settingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: "#666",
  },
  infoContainer: {
    padding: 16,
    alignItems: "center",
  },
  appName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
  },
});
