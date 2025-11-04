import { useState } from "react";
import { Alert } from "react-native";
import {
  createSale,
  addSaleItem,
  updateProductStock,
} from "../services/database";

export const useCart = (onCheckoutComplete) => {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (product) => {
    setCartItems((prevItems) => {
      // Check if product already in cart
      const existingItemIndex = prevItems.findIndex(
        (item) => item.id === product.id
      );

      if (existingItemIndex >= 0) {
        // Product already in cart, increase quantity
        const updatedItems = [...prevItems];
        const currentQty = updatedItems[existingItemIndex].quantity;

        // Check if we have enough stock
        if (currentQty >= product.stock_quantity) {
          Alert.alert(
            "Stock Limit",
            `Only ${product.stock_quantity} units available in stock.`
          );
          return prevItems;
        }

        updatedItems[existingItemIndex].quantity += 1;
        return updatedItems;
      } else {
        // New product, add to cart
        return [
          ...prevItems,
          {
            ...product,
            quantity: 1,
            subtotal: product.price,
          },
        ];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId)
    );
  };

  const updateCartItemQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === productId) {
          // Check stock availability
          if (newQuantity > item.stock_quantity) {
            Alert.alert(
              "Stock Limit",
              `Only ${item.stock_quantity} units available.`
            );
            return item;
          }
          return {
            ...item,
            quantity: newQuantity,
            subtotal: item.price * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const calculateCartTotal = () => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const completeCheckout = (
    paymentMethod = "cash",
    amountPaid = 0,
    onChange = 0
  ) => {
    const totalAmount = calculateCartTotal();

    // Create sale record
    const saleResult = createSale(totalAmount, paymentMethod);

    if (saleResult.success) {
      const saleId = saleResult.id;

      // Add sale items and update stock
      cartItems.forEach((item) => {
        addSaleItem(
          saleId,
          item.id,
          item.quantity,
          item.price,
          item.price * item.quantity
        );

        // Update product stock
        const newStock = item.stock_quantity - item.quantity;
        updateProductStock(item.id, newStock);
      });

      // Return receipt data
      const receipt = {
        saleId,
        items: cartItems,
        totalAmount,
        paymentMethod,
        amountPaid,
        change: onChange,
        date: new Date().toISOString(),
      };

      clearCart();
      if (onCheckoutComplete) {
        onCheckoutComplete(receipt);
      }

      return { success: true, receipt };
    } else {
      Alert.alert("Error", "Failed to complete sale: " + saleResult.error);
      return { success: false };
    }
  };

  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    calculateCartTotal,
    clearCart,
    completeCheckout,
  };
};
