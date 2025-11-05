import { useState } from "react";
import { Alert } from "react-native";
import {
  createSale,
  addSaleItem,
  updateProductStock,
  getCategoryByName,
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
    // Group items by category
    const itemsByCategory = {};
    
    cartItems.forEach((item) => {
      const category = item.category || "Uncategorized";
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = [];
      }
      itemsByCategory[category].push(item);
    });

    let total = 0;

    // Calculate total for each category, applying bulk discounts
    Object.keys(itemsByCategory).forEach((categoryName) => {
      const categoryItems = itemsByCategory[categoryName];
      
      // Get category discount info
      const categoryInfo = getCategoryByName(categoryName);
      
      if (
        categoryInfo &&
        categoryInfo.bulk_discount_quantity > 0 &&
        categoryInfo.bulk_discount_price > 0
      ) {
        // Calculate total quantity for this category
        const totalQuantity = categoryItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        );

        const discountQty = categoryInfo.bulk_discount_quantity;
        const discountPrice = categoryInfo.bulk_discount_price;

        // Calculate how many bulk discounts apply
        const bulkSets = Math.floor(totalQuantity / discountQty);
        const remainingItems = totalQuantity % discountQty;

        // Calculate total for this category
        let categoryTotal = bulkSets * discountPrice;

        // Add remaining items at regular price
        if (remainingItems > 0) {
          // Calculate regular price for remaining items
          let remainingQty = remainingItems;
          for (const item of categoryItems) {
            if (remainingQty <= 0) break;
            const itemQtyToCharge = Math.min(item.quantity, remainingQty);
            categoryTotal += item.price * itemQtyToCharge;
            remainingQty -= itemQtyToCharge;
          }
        }

        total += categoryTotal;
      } else {
        // No bulk discount, calculate normally
        const categoryTotal = categoryItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        total += categoryTotal;
      }
    });

    return total;
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
