import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CashPaymentModal from "./CashPaymentModal";

const CheckoutModal = ({
  visible,
  onClose,
  cartItems,
  cartTotal,
  onCompleteCheckout,
}) => {
  const insets = useSafeAreaInsets();
  const [showCashModal, setShowCashModal] = useState(false);

  const handleCashPayment = (amountPaid, change) => {
    setShowCashModal(false);
    onCompleteCheckout("cash", amountPaid, change);
  };

  const handleCardPayment = () => {
    onCompleteCheckout("card", cartTotal, 0);
  };

  const handleGCashPayment = () => {
    onCompleteCheckout("gcash", cartTotal, 0);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.modalTitle}>Checkout</Text>
            </View>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.checkoutContent}
            contentContainerStyle={styles.checkoutContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.summaryCard}>
              <View style={styles.summaryContainer}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.checkoutTotal}>
                  ₱{cartTotal.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.checkoutItems}>
              <View style={styles.itemsHeader}>
                <Ionicons name="list-outline" size={20} color="#333" />
                <Text style={styles.checkoutItemsTitle}>Order Summary</Text>
                <View style={styles.itemCountBadge}>
                  <Ionicons name="cart-outline" size={14} color="#fff" />
                  <Text style={styles.itemCountText}>{totalItems}</Text>
                </View>
              </View>
              <ScrollView
                style={styles.itemsScrollView}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {cartItems.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.checkoutItem,
                      index === cartItems.length - 1 && styles.lastItem,
                    ]}
                  >
                    <View style={styles.itemDetails}>
                      <Text style={styles.checkoutItemName}>{item.name}</Text>
                      <Text style={styles.itemQuantity}>
                        Qty: {item.quantity}
                      </Text>
                    </View>
                    <Text style={styles.checkoutItemPrice}>
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.paymentSection}>
              <View style={styles.paymentHeader}>
                <Ionicons name="wallet-outline" size={20} color="#333" />
                <Text style={styles.paymentMethodTitle}>
                  Select Payment Method
                </Text>
              </View>
              <View style={styles.paymentMethods}>
                <TouchableOpacity
                  style={styles.paymentButton}
                  onPress={() => setShowCashModal(true)}
                >
                  <View style={styles.paymentButtonContent}>
                    <View style={styles.iconContainer}>
                      <Text style={styles.pesoIcon}>₱</Text>
                    </View>
                    <Text style={styles.paymentButtonText}>Cash</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.paymentButton}
                  onPress={handleCardPayment}
                >
                  <View style={styles.paymentButtonContent}>
                    <View style={styles.iconContainer}>
                      <Image
                        source={require("../../assets/visamaster.png")}
                        style={styles.paymentImage}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.paymentButtonText}>Card</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.paymentButton}
                  onPress={handleGCashPayment}
                >
                  <View style={styles.paymentButtonContent}>
                    <View style={styles.iconContainer}>
                      <Image
                        source={require("../../assets/gcash.png")}
                        style={styles.paymentImage}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.paymentButtonText}>GCash</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <CashPaymentModal
        visible={showCashModal}
        onClose={() => setShowCashModal(false)}
        total={cartTotal}
        onComplete={handleCashPayment}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#007AFF",
  },
  titleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "400",
  },
  placeholder: {
    width: 50,
  },
  checkoutContent: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  checkoutContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryContainer: {
    alignItems: "center",
  },
  itemCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  itemCountText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  checkoutTotal: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4CAF50",
    textAlign: "center",
  },
  itemCount: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  checkoutItems: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  itemsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  itemsScrollView: {
    maxHeight: 140,
  },
  checkoutItemsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  checkoutItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  checkoutItemName: {
    fontSize: 16,
    color: "#333",
  },
  checkoutItemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  paymentSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  paymentMethodTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  paymentMethods: {
    gap: 12,
  },
  paymentButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  pesoIcon: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  paymentImage: {
    width: 48,
    height: 48,
  },
  paymentButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default CheckoutModal;
