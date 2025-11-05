import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";

const CashPaymentModal = ({ visible, onClose, total, onComplete }) => {
  const [amountPaid, setAmountPaid] = useState("");

  const handleComplete = () => {
    const paid = parseFloat(amountPaid);

    if (!amountPaid || isNaN(paid) || paid <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }

    if (paid < total) {
      Alert.alert(
        "Insufficient Amount",
        `Amount paid (₱${paid.toFixed(2)}) is less than total (₱${total.toFixed(
          2
        )})`
      );
      return;
    }

    const change = paid - total;
    onComplete(paid, change);
    setAmountPaid("");
  };

  const handleCancel = () => {
    setAmountPaid("");
    onClose();
  };

  // Quick amount buttons
  const suggestedAmounts = [
    Math.ceil(total),
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 20) * 20,
    Math.ceil(total / 50) * 50,
  ].filter((val, idx, arr) => arr.indexOf(val) === idx); // Remove duplicates

  const change =
    amountPaid && !isNaN(parseFloat(amountPaid))
      ? parseFloat(amountPaid) - total
      : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Cash Payment</Text>

          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalAmount}>₱{total.toFixed(2)}</Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Amount Paid:</Text>
            <TextInput
              style={styles.input}
              value={amountPaid}
              onChangeText={setAmountPaid}
              placeholder="0.00"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmounts}>
            <Text style={styles.quickLabel}>Quick Select:</Text>
            <View style={styles.quickButtons}>
              {suggestedAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickButton}
                  onPress={() => setAmountPaid(amount.toString())}
                >
                  <Text style={styles.quickButtonText}>₱{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Change Display */}
          {amountPaid && !isNaN(parseFloat(amountPaid)) && (
            <View
              style={[
                styles.changeSection,
                change < 0 && styles.changeNegative,
              ]}
            >
              <Text style={styles.changeLabel}>Change:</Text>
              <Text
                style={[
                  styles.changeAmount,
                  change < 0 && styles.changeAmountNegative,
                ]}
              >
                ₱{Math.abs(change).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.completeButton]}
              onPress={handleComplete}
            >
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  totalSection: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007AFF",
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  quickAmounts: {
    marginBottom: 20,
  },
  quickLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  quickButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickButton: {
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  quickButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  changeSection: {
    backgroundColor: "#e8f5e9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  changeNegative: {
    backgroundColor: "#ffebee",
    borderLeftColor: "#f44336",
  },
  changeLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  changeAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  changeAmountNegative: {
    color: "#f44336",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  completeButton: {
    backgroundColor: "#4CAF50",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CashPaymentModal;
