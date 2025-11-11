import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getAllSales,
  getSaleDetails,
  getCategoryByName,
} from "../services/database";
import ReceiptModal from "../components/ReceiptModal";

const ReceiptHistoryScreen = ({ onBack }) => {
  const [sales, setSales] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptDetail, setShowReceiptDetail] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = () => {
    setLoading(true);
    setTimeout(() => {
      const allSales = getAllSales();
      setSales(allSales);
      setLoading(false);
    }, 500);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSales();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDiscountsForItems = (items) => {
    // Group items by category
    const itemsByCategory = {};

    items.forEach((item) => {
      const category = item.category || "Uncategorized";
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = { items: [], totalQty: 0, regularTotal: 0 };
      }
      itemsByCategory[category].items.push(item);
      itemsByCategory[category].totalQty += item.quantity;
      itemsByCategory[category].regularTotal += item.unit_price * item.quantity;
    });

    const discounts = [];

    Object.keys(itemsByCategory).forEach((categoryName) => {
      const categoryData = itemsByCategory[categoryName];
      const categoryInfo = getCategoryByName(categoryName);

      if (
        categoryInfo &&
        categoryInfo.bulk_discount_quantity > 0 &&
        categoryInfo.bulk_discount_price > 0
      ) {
        const totalQty = categoryData.totalQty;
        const discountQty = categoryInfo.bulk_discount_quantity;
        const discountPrice = categoryInfo.bulk_discount_price;

        if (totalQty >= discountQty) {
          const bulkSets = Math.floor(totalQty / discountQty);
          const remainingQty = totalQty % discountQty;

          // Calculate savings
          const avgPrice = categoryData.regularTotal / totalQty;
          const discountedTotal =
            bulkSets * discountPrice + remainingQty * avgPrice;
          const savings = categoryData.regularTotal - discountedTotal;

          discounts.push({
            category: categoryName,
            quantity: totalQty,
            bulkSets: bulkSets,
            discountQty: discountQty,
            discountPrice: discountPrice,
            savings: savings,
          });
        }
      }
    });

    return discounts;
  };

  const handleViewReceipt = (sale) => {
    // Get full sale details with items
    const { sale: saleDetail, items } = getSaleDetails(sale.id);

    if (!saleDetail) {
      return;
    }

    // Calculate discounts based on items
    const discounts = calculateDiscountsForItems(items);

    // Calculate subtotal (before discounts)
    const subtotal = items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );
    const totalSavings = discounts.reduce((sum, d) => sum + d.savings, 0);

    // Convert sale data to receipt format
    const receipt = {
      saleId: saleDetail.id,
      items: items.map((item) => ({
        id: item.product_id,
        name: item.product_name,
        quantity: item.quantity,
        price: item.unit_price,
        category: item.category,
      })),
      subtotal,
      discounts: discounts.length > 0 ? discounts : null,
      totalSavings,
      totalAmount: saleDetail.total_amount,
      paymentMethod: saleDetail.payment_method,
      amountPaid: saleDetail.amount_paid || saleDetail.total_amount,
      change: saleDetail.change_amount || 0,
      date: saleDetail.created_at,
    };

    setSelectedReceipt(receipt);
    setShowReceiptDetail(true);
  };

  const getPaymentIcon = (method) => {
    switch (method?.toLowerCase()) {
      case "cash":
        return "cash";
      case "card":
        return "card";
      case "gcash":
        return "phone-portrait";
      default:
        return "wallet";
    }
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receipt History</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loaderText}>Loading receipts...</Text>
            </View>
          ) : sales.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No sales yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Completed transactions will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.salesList}>
              <View style={styles.statsCard}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{sales.length}</Text>
                  <Text style={styles.statLabel}>Total Sales</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    ₱
                    {sales
                      .reduce((sum, sale) => sum + sale.total_amount, 0)
                      .toFixed(2)}
                  </Text>
                  <Text style={styles.statLabel}>Total Revenue</Text>
                </View>
              </View>

              {sales.map((sale) => (
                <TouchableOpacity
                  key={sale.id}
                  style={styles.saleCard}
                  onPress={() => handleViewReceipt(sale)}
                >
                  <View style={styles.saleHeader}>
                    <View style={styles.saleLeft}>
                      <Text style={styles.saleId}>Receipt #{sale.id}</Text>
                      <Text style={styles.saleDate}>
                        {formatDate(sale.created_at)}
                      </Text>
                    </View>
                    <View style={styles.saleRight}>
                      <Text style={styles.saleAmount}>
                        ₱{sale.total_amount.toFixed(2)}
                      </Text>
                      <View style={styles.paymentBadge}>
                        <Ionicons
                          name={getPaymentIcon(sale.payment_method)}
                          size={14}
                          color="#007AFF"
                          style={styles.paymentIcon}
                        />
                        <Text style={styles.paymentText}>
                          {sale.payment_method?.toUpperCase() || "CASH"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.saleDetails}>
                    <View style={styles.saleInfo}>
                      <Text style={styles.saleInfoLabel}>Items:</Text>
                      <Text style={styles.saleInfoValue}>
                        {sale.item_count || 0}
                      </Text>
                    </View>
                    {sale.customer_name && (
                      <View style={styles.saleInfo}>
                        <Text style={styles.saleInfoLabel}>Customer:</Text>
                        <Text style={styles.saleInfoValue}>
                          {sale.customer_name}
                        </Text>
                      </View>
                    )}
                  </View>

                  {sale.products && (
                    <View style={styles.productsPreview}>
                      <Text
                        style={styles.productsPreviewText}
                        numberOfLines={1}
                      >
                        {sale.products}
                      </Text>
                    </View>
                  )}

                  <View style={styles.viewReceiptButton}>
                    <Text style={styles.viewReceiptText}>View Receipt →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      <ReceiptModal
        visible={showReceiptDetail}
        onClose={() => setShowReceiptDetail(false)}
        receipt={selectedReceipt}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 150,
  },
  loaderText: {
    marginTop: 15,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  salesList: {
    padding: 15,
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 15,
  },
  saleCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  saleLeft: {
    flex: 1,
  },
  saleId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  saleDate: {
    fontSize: 13,
    color: "#666",
  },
  saleRight: {
    alignItems: "flex-end",
  },
  saleAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 6,
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
  },
  saleDetails: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 20,
  },
  saleInfo: {
    flexDirection: "row",
  },
  saleInfoLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 5,
  },
  saleInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  productsPreview: {
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  productsPreviewText: {
    fontSize: 13,
    color: "#666",
  },
  viewReceiptButton: {
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  viewReceiptText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
});

export default ReceiptHistoryScreen;
