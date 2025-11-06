import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getCategoryByName } from "../services/database";

const CartComponent = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  cartTotal,
}) => {
  // Calculate discount info
  const getDiscountInfo = () => {
    const itemsByCategory = {};

    cartItems.forEach((item) => {
      const category = item.category || "Uncategorized";
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = { items: [], totalQty: 0, regularTotal: 0 };
      }
      itemsByCategory[category].items.push(item);
      itemsByCategory[category].totalQty += item.quantity;
      itemsByCategory[category].regularTotal += item.price * item.quantity;
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
          const savings =
            categoryData.regularTotal -
            (bulkSets * discountPrice +
              (totalQty % discountQty) *
                (categoryData.regularTotal / totalQty));

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

  const discounts = getDiscountInfo();
  return (
    <View style={styles.cartSection}>
      <View style={styles.cartHeader}>
        <Text style={styles.cartTitle}>Shopping Cart</Text>
        {cartItems.length > 0 && (
          <TouchableOpacity
            style={styles.clearCartButton}
            onPress={() => {
              Alert.alert(
                "Clear Cart",
                "Are you sure you want to clear the cart?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear", onPress: onClearCart, style: "destructive" },
                ]
              );
            }}
          >
            <Text style={styles.clearCartText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.cartItems}>
        {cartItems.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartText}>Cart is empty</Text>
            <Text style={styles.emptyCartSubtext}>
              Scan products to add them to cart
            </Text>
          </View>
        ) : (
          cartItems.map((item) => (
            <View key={item.id} style={styles.cartItem}>
              <View style={styles.cartItemInfo}>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <Text style={styles.cartItemPrice}>
                  ₱{item.price.toFixed(2)} each
                </Text>
              </View>

              <View style={styles.cartItemControls}>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.cartItemSubtotal}>
                  ₱{(item.price * item.quantity).toFixed(2)}
                </Text>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemoveItem(item.id)}
                >
                  <Ionicons name="close" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Cart Footer */}
      <View style={styles.cartFooter}>
        {/* Discount Information */}
        {discounts.length > 0 && (
          <View style={styles.discountSection}>
            <View style={styles.discountTitleRow}>
              <Ionicons name="pricetags" size={16} color="#4CAF50" />
              <Text style={styles.discountTitle}>Bulk Discounts Applied!</Text>
            </View>
            {discounts.map((discount, index) => (
              <View key={index} style={styles.discountItem}>
                <Text style={styles.discountText}>
                  {discount.category}: {discount.bulkSets} set(s) of{" "}
                  {discount.discountQty} @ ₱{discount.discountPrice}
                </Text>
                <Text style={styles.savingsText}>
                  Save: ₱{discount.savings.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>₱{cartTotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.checkoutButton,
            cartItems.length === 0 && styles.checkoutButtonDisabled,
          ]}
          onPress={onCheckout}
          disabled={cartItems.length === 0}
        >
          <Text style={styles.checkoutButtonText}>Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cartSection: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 15,
    overflow: "hidden",
  },
  cartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#2a2a2a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  clearCartButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#ff4757",
    borderRadius: 8,
  },
  clearCartText: {
    color: "#fff",
    fontWeight: "600",
  },
  cartItems: {
    flex: 1,
    padding: 15,
  },
  emptyCart: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyCartText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
  cartItem: {
    backgroundColor: "#2a2a2a",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  cartItemInfo: {
    marginBottom: 12,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 14,
    color: "#888",
  },
  cartItemControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    backgroundColor: "#007AFF",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  quantityText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 15,
    minWidth: 25,
    textAlign: "center",
  },
  cartItemSubtotal: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  removeButton: {
    width: 32,
    height: 32,
    backgroundColor: "#ff4757",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  cartFooter: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 15,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  discountSection: {
    backgroundColor: "#2a4a2a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  discountTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  discountTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  discountItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  discountText: {
    fontSize: 12,
    color: "#fff",
    flex: 1,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  checkoutButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkoutButtonDisabled: {
    backgroundColor: "#555",
    shadowOpacity: 0,
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default CartComponent;
