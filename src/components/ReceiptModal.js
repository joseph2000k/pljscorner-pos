import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ReceiptModal = ({ visible, onClose, receipt }) => {
  if (!receipt) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Receipt</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.receiptContent}>
          <View style={styles.receipt}>
            {/* Store Header */}
            <View style={styles.storeHeader}>
              <Text style={styles.storeName}>PLJS CORNER</Text>
              <Text style={styles.storeSubtitle}>Point of Sale</Text>
              <Text style={styles.divider}>━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
            </View>

            {/* Receipt Info */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Receipt #:</Text>
                <Text style={styles.infoValue}>{receipt.saleId}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>{formatDate(receipt.date)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payment:</Text>
                <Text style={styles.infoValue}>
                  {receipt.paymentMethod.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.divider}>━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>

            {/* Items */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>ITEMS</Text>
              {receipt.items.map((item, index) => (
                <View key={index} style={styles.item}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemNameContainer}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.isFree && (
                        <View style={styles.freeTag}>
                          <Text style={styles.freeTagText}>FREE</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.itemTotal,
                        item.isFree && styles.itemTotalFree,
                      ]}
                    >
                      {item.isFree
                        ? "FREE"
                        : `₱${(item.price * item.quantity).toFixed(2)}`}
                    </Text>
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemDetailText}>
                      {item.quantity} x{" "}
                      {item.isFree ? "FREE" : `₱${item.price.toFixed(2)}`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.divider}>━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>

            {/* Totals */}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalValue}>
                  ₱{(receipt.subtotal || receipt.totalAmount).toFixed(2)}
                </Text>
              </View>

              {/* Bulk Discounts */}
              {receipt.discounts && receipt.discounts.length > 0 && (
                <>
                  <View style={styles.discountHeader}>
                    <Ionicons
                      name="pricetags"
                      size={14}
                      color="#4CAF50"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.discountHeaderText}>
                      Bulk Discounts Applied
                    </Text>
                  </View>
                  {receipt.discounts.map((discount, index) => (
                    <View key={index} style={styles.discountRow}>
                      <Text style={styles.discountText}>
                        {discount.category} ({discount.bulkSets} set
                        {discount.bulkSets > 1 ? "s" : ""} of{" "}
                        {discount.discountQty})
                      </Text>
                      <Text style={styles.discountValue}>
                        -₱{discount.savings.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                  {receipt.totalSavings > 0 && (
                    <View style={styles.totalSavingsRow}>
                      <Text style={styles.totalSavingsLabel}>
                        Total Savings:
                      </Text>
                      <Text style={styles.totalSavingsValue}>
                        -₱{receipt.totalSavings.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </>
              )}

              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text style={styles.grandTotalLabel}>TOTAL:</Text>
                <Text style={styles.grandTotalValue}>
                  ₱{receipt.totalAmount.toFixed(2)}
                </Text>
              </View>

              {receipt.paymentMethod === "cash" && (
                <>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Amount Paid:</Text>
                    <Text style={styles.totalValue}>
                      ₱{receipt.amountPaid.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Change:</Text>
                    <Text style={styles.changeValue}>
                      ₱{receipt.change.toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <Text style={styles.divider}>━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>

            {/* Footer */}
          </View>
        </ScrollView>

        {/* Action Button */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
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
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 20,
    color: "#666",
  },
  receiptContent: {
    flex: 1,
  },
  receipt: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeHeader: {
    alignItems: "center",
    marginBottom: 15,
  },
  storeName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  storeSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  divider: {
    fontSize: 12,
    color: "#ddd",
    textAlign: "center",
    marginVertical: 10,
  },
  infoSection: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  itemsSection: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 10,
    letterSpacing: 1,
  },
  item: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  itemNameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  freeTag: {
    backgroundColor: "#FF9500",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeTagText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  itemTotalFree: {
    color: "#FF9500",
  },
  itemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemDetailText: {
    fontSize: 13,
    color: "#888",
  },
  totalsSection: {
    marginBottom: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 15,
    color: "#666",
  },
  totalValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  discountHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f8f0",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },
  discountHeaderText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  discountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    paddingLeft: 10,
  },
  discountText: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  discountValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4CAF50",
  },
  totalSavingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    paddingLeft: 10,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    marginBottom: 5,
  },
  totalSavingsLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  totalSavingsValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  grandTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    marginBottom: 12,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  changeValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  footer: {
    alignItems: "center",
    marginTop: 10,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 3,
  },
  actions: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  doneButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ReceiptModal;
