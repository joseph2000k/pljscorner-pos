import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CashPaymentModal from "./CashPaymentModal";

const CheckoutModal = ({
  visible,
  onClose,
  cartItems,
  cartTotal,
  onCompleteCheckout,
}) => {
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

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Checkout</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.checkoutContent}>
            <Text style={styles.checkoutTotal}>
              Total: ₱{cartTotal.toFixed(2)}
            </Text>

            <View style={styles.checkoutItems}>
              <Text style={styles.checkoutItemsTitle}>Items:</Text>
              {cartItems.map((item) => (
                <View key={item.id} style={styles.checkoutItem}>
                  <Text style={styles.checkoutItemName}>
                    {item.name} x {item.quantity}
                  </Text>
                  <Text style={styles.checkoutItemPrice}>
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.paymentMethodTitle}>Payment Method:</Text>
            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={styles.paymentButton}
                onPress={() => setShowCashModal(true)}
              >
                <View style={styles.paymentButtonContent}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="cash" size={28} color="#fff" />
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#007AFF",
  },
  placeholder: {
    width: 60,
  },
  checkoutContent: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  checkoutTotal: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4CAF50",
    textAlign: "center",
    marginVertical: 20,
  },
  checkoutItems: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  checkoutItemsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
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
  paymentMethodTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
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
