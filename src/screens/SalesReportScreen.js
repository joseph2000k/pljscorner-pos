import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SalesReportScreen({
  onBackPress,
  salesByPaymentMethod,
  revenuePeriod,
}) {
  const getTotalTransactions = () => {
    return salesByPaymentMethod.reduce(
      (sum, item) => sum + item.transaction_count,
      0
    );
  };

  const getTotalRevenue = () => {
    return salesByPaymentMethod.reduce(
      (sum, item) => sum + parseFloat(item.total_amount),
      0
    );
  };

  const getPaymentMethodIcon = (method) => {
    switch (method.toLowerCase()) {
      case "cash":
        return "cash-outline";
      case "card":
        return "card-outline";
      case "gcash":
        return "wallet-outline";
      default:
        return "help-circle-outline";
    }
  };

  const getPaymentMethodColor = (method) => {
    switch (method.toLowerCase()) {
      case "cash":
        return "#4CAF50";
      case "card":
        return "#2196F3";
      case "gcash":
        return "#FF9800";
      default:
        return "#999";
    }
  };

  const getPeriodLabel = () => {
    switch (revenuePeriod) {
      case "daily":
        return "Today";
      case "weekly":
        return "This Week";
      case "monthly":
        return "This Month";
      case "yearly":
        return "This Year";
      default:
        return "All Time";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Sales Report</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Period Info */}
        <View style={styles.periodBadge}>
          <Ionicons name="calendar-outline" size={16} color="#007AFF" />
          <Text style={styles.periodText}>{getPeriodLabel()}</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Ionicons name="receipt-outline" size={32} color="#007AFF" />
            <Text style={styles.summaryNumber}>{getTotalTransactions()}</Text>
            <Text style={styles.summaryLabel}>Total Transactions</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="cash-outline" size={32} color="#4CAF50" />
            <Text style={styles.summaryNumber}>
              ₱{getTotalRevenue().toFixed(2)}
            </Text>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
          </View>
        </View>

        {/* Payment Method Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method Breakdown</Text>

          {salesByPaymentMethod.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No sales data</Text>
              <Text style={styles.emptyStateSubtext}>
                Sales will appear here once transactions are made
              </Text>
            </View>
          ) : (
            salesByPaymentMethod.map((item, index) => {
              const percentage =
                getTotalRevenue() > 0
                  ? (
                      (parseFloat(item.total_amount) / getTotalRevenue()) *
                      100
                    ).toFixed(1)
                  : 0;

              return (
                <View key={index} style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <View
                      style={[
                        styles.paymentIconContainer,
                        {
                          backgroundColor:
                            getPaymentMethodColor(item.payment_method) + "20",
                        },
                      ]}
                    >
                      <Ionicons
                        name={getPaymentMethodIcon(item.payment_method)}
                        size={24}
                        color={getPaymentMethodColor(item.payment_method)}
                      />
                    </View>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentMethodName}>
                        {item.payment_method.charAt(0).toUpperCase() +
                          item.payment_method.slice(1)}
                      </Text>
                      <Text style={styles.paymentPercentage}>
                        {percentage}% of total
                      </Text>
                    </View>
                  </View>

                  <View style={styles.paymentStats}>
                    <View style={styles.paymentStatItem}>
                      <Text style={styles.paymentStatLabel}>Transactions</Text>
                      <Text style={styles.paymentStatValue}>
                        {item.transaction_count}
                      </Text>
                    </View>
                    <View style={styles.paymentStatDivider} />
                    <View style={styles.paymentStatItem}>
                      <Text style={styles.paymentStatLabel}>Total Amount</Text>
                      <Text style={styles.paymentStatValue}>
                        ₱{parseFloat(item.total_amount).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${percentage}%`,
                          backgroundColor: getPaymentMethodColor(
                            item.payment_method
                          ),
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          )}
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
    paddingTop: Platform.OS === "android" ? 48 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
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
  periodBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  periodText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    marginLeft: 8,
  },
  summaryContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  section: {
    marginTop: 8,
    backgroundColor: "#fff",
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 4,
    textAlign: "center",
  },
  paymentCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  paymentPercentage: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  paymentStats: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  paymentStatItem: {
    flex: 1,
    alignItems: "center",
  },
  paymentStatDivider: {
    width: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 8,
  },
  paymentStatLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  paymentStatValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
});
