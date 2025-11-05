import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from "react-native";
import { CameraView, Camera } from "expo-camera";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import {
  initializeDatabase,
  getProductByBarcode,
  getAllProducts,
  getDashboardStats,
  addProduct,
  deleteProduct,
  updateProduct,
  getAllCategories,
  getCategoryByName,
  createSale,
  addSaleItem,
  updateProductStock,
  resetDatabase,
  searchProducts,
} from "./src/services/database";
import CheckoutModal from "./src/components/CheckoutModal";
import ReceiptModal from "./src/components/ReceiptModal";
import ReceiptHistoryModal from "./src/components/ReceiptHistoryModal";
import CategoriesModal from "./src/components/CategoriesModal";
import AddProductModal from "./src/components/AddProductModal";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("home"); // 'home', 'camera', 'products', 'add-product', 'pos'
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState("");
  const [dashboardStats, setDashboardStats] = useState({});
  const [products, setProducts] = useState([]);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    barcode: "",
    price: "",
    stock: "",
    category: "Food & Beverages",
    description: "",
  });

  // Cart state
  const [cartItems, setCartItems] = useState([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState("");
  const [scanCooldown, setScanCooldown] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptHistory, setShowReceiptHistory] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [hideRevenue, setHideRevenue] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [resetTapCount, setResetTapCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    // Initialize database on app start
    initializeDatabase();
    loadDashboardData();
  }, []);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    // Only request permissions when camera screen is opened
    if (currentScreen === "camera") {
      getCameraPermissions();
    }
  }, [currentScreen]);

  const loadDashboardData = () => {
    const stats = getDashboardStats();
    setDashboardStats(stats);
    const allProducts = getAllProducts();
    setProducts(allProducts);
    const allCategories = getAllCategories();
    setCategories(allCategories);
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    // Prevent multiple scans and cooldown
    if (scanned || scanCooldown) return;

    // Prevent scanning the same barcode repeatedly within 300ms
    if (data === lastScannedBarcode) {
      return;
    }

    setScanned(true);
    setScannedData(data);
    setLastScannedBarcode(data);
    setScanCooldown(true);

    // Play beep sound and haptic feedback
    try {
      // Haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      // Play beep sound from assets
      const { sound } = await Audio.Sound.createAsync(
        require("./assets/sounds/beep_sound.mp3"),
        { shouldPlay: true, volume: 1.0 }
      );
      setTimeout(() => sound.unloadAsync(), 500);
    } catch (error) {
      console.log("Beep/haptic error:", error);
    } // Look up product by barcode
    const product = getProductByBarcode(data);

    if (product) {
      // Check stock availability
      if (product.stock_quantity <= 0) {
        Alert.alert(
          "Out of Stock",
          `${product.name} is currently out of stock.`,
          [
            {
              text: "Scan Again",
              onPress: () => {
                setScanned(false);
                setScanCooldown(false);
              },
            },
            {
              text: "Back to POS",
              onPress: () => {
                setCurrentScreen("pos");
                setScanCooldown(false);
              },
            },
          ]
        );
        return;
      }

      // Add to cart automatically
      addToCart(product);

      // Reset scanner immediately for faster scanning
      setScanned(false);

      // Clear cooldown and last scanned after 300ms
      setTimeout(() => {
        setScanCooldown(false);
        setLastScannedBarcode("");
      }, 300);
    } else {
      Alert.alert(
        "Product Not Found",
        `Barcode: ${data}\nProduct not in database.`,
        [
          {
            text: "Scan Again",
            onPress: () => {
              setScanned(false);
              setScanCooldown(false);
            },
          },
          {
            text: "Add Product",
            onPress: () => {
              addNewProduct(data);
              setScanCooldown(false);
            },
          },
          {
            text: "Back to POS",
            onPress: () => {
              setCurrentScreen("pos");
              setScanCooldown(false);
            },
          },
        ]
      );
    }
  };

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
          // Calculate average price for remaining items
          const totalRegularPrice = categoryItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );
          const avgPrice = totalRegularPrice / totalQuantity;
          categoryTotal += remainingItems * avgPrice;
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

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert("Empty Cart", "Please add items to cart before checkout.");
      return;
    }
    setShowCheckoutModal(true);
  };

  const completeCheckout = (
    paymentMethod = "cash",
    amountPaid = 0,
    change = 0
  ) => {
    const totalAmount = calculateCartTotal();
    const discounts = getDiscountInfo();

    // Calculate subtotal (before discounts)
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const totalSavings = discounts.reduce((sum, d) => sum + d.savings, 0);

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

      // Create receipt data
      const receipt = {
        saleId,
        items: [...cartItems],
        subtotal,
        discounts: discounts.length > 0 ? discounts : null,
        totalSavings,
        totalAmount,
        paymentMethod,
        amountPaid: paymentMethod === "cash" ? amountPaid : totalAmount,
        change: paymentMethod === "cash" ? change : 0,
        date: new Date().toISOString(),
      };

      // Clear cart and show receipt
      clearCart();
      setShowCheckoutModal(false);
      setReceiptData(receipt);
      setShowReceipt(true);
      loadDashboardData();
    } else {
      Alert.alert("Error", "Failed to complete sale: " + saleResult.error);
    }
  };

  const addNewProduct = (barcode) => {
    // Open the add product modal with the scanned barcode pre-filled
    setNewProduct({
      name: "",
      barcode: barcode,
      price: "",
      stock: "",
      category: "General",
      description: "",
    });
    setShowAddProductModal(true);
  };

  const openCamera = () => {
    setCurrentScreen("camera");
    setScanned(false);
    setScannedData("");
  };

  const openPOS = () => {
    setCurrentScreen("pos");
  };

  const goBackHome = () => {
    setCurrentScreen("home");
    loadDashboardData(); // Refresh data when returning home
  };

  const goBackToPOS = () => {
    setCurrentScreen("pos");
  };

  const openAddProductModal = () => {
    setNewProduct({
      name: "",
      barcode: "",
      price: "",
      stock: "",
      category: "Food & Beverages",
      description: "",
    });
    setShowAddProductModal(true);
  };

  const closeAddProductModal = () => {
    setShowAddProductModal(false);
  };

  const handleProductFormChange = (field, value) => {
    setNewProduct({ ...newProduct, [field]: value });
  };

  const handleOpenCategoriesFromProduct = () => {
    // Keep the product modal open, just show categories modal
    setShowCategoriesModal(true);
  };

  const handleCategoryAdded = () => {
    // Reload categories when a new one is added
    loadDashboardData();
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price || !newProduct.barcode) {
      Alert.alert("Error", "Please fill in name, barcode, and price");
      return;
    }

    if (isNaN(newProduct.price) || parseFloat(newProduct.price) < 0) {
      Alert.alert("Error", "Please enter a valid price");
      return;
    }

    if (isNaN(newProduct.stock) || parseInt(newProduct.stock) < 0) {
      Alert.alert("Error", "Please enter a valid stock quantity");
      return;
    }

    const result = addProduct(
      newProduct.name,
      newProduct.barcode,
      parseFloat(newProduct.price),
      parseInt(newProduct.stock) || 0,
      newProduct.category,
      newProduct.description
    );

    if (result.success) {
      Alert.alert("Success", "Product added successfully!");
      closeAddProductModal();
      loadDashboardData();
    } else {
      Alert.alert("Error", "Could not add product: " + result.error);
    }
  };

  const handleDeleteProduct = (product) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const result = deleteProduct(product.id);
            if (result.success) {
              Alert.alert("Success", "Product deleted successfully!");
              loadDashboardData();
            } else {
              Alert.alert("Error", "Could not delete product: " + result.error);
            }
          },
        },
      ]
    );
  };

  const handleEditProduct = (product) => {
    setEditingProduct({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      price: product.price.toString(),
      stock: product.stock_quantity.toString(),
      category: product.category || "Food & Beverages",
      description: product.description || "",
    });
    setShowEditProductModal(true);
  };

  const handleUpdateProduct = () => {
    if (
      !editingProduct.name ||
      !editingProduct.price ||
      !editingProduct.stock
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const result = updateProduct(
      editingProduct.id,
      editingProduct.name,
      editingProduct.barcode,
      parseFloat(editingProduct.price),
      parseInt(editingProduct.stock),
      editingProduct.category,
      editingProduct.description
    );

    if (result.success) {
      Alert.alert("Success", "Product updated successfully!");
      setShowEditProductModal(false);
      setEditingProduct(null);
      loadDashboardData();
    } else {
      Alert.alert("Error", "Could not update product: " + result.error);
    }
  };

  const handleResetDatabase = () => {
    Alert.alert(
      "⚠️ Reset All Data",
      "This will DELETE ALL products, sales, categories, and receipts. This action cannot be undone!\n\nAre you absolutely sure?",
      [
        { text: "Cancel", style: "cancel", onPress: () => setResetTapCount(0) },
        {
          text: "RESET ALL DATA",
          style: "destructive",
          onPress: () => {
            const result = resetDatabase();
            if (result.success) {
              setCartItems([]);
              setProducts([]);
              setCategories([]);
              setDashboardStats({});
              setResetTapCount(0);
              loadDashboardData();
              Alert.alert("Success", "All data has been cleared!");
            } else {
              Alert.alert("Error", "Failed to reset: " + result.error);
            }
          },
        },
      ]
    );
  };

  const handleDevResetTap = () => {
    const newCount = resetTapCount + 1;
    setResetTapCount(newCount);

    if (newCount >= 5) {
      handleResetDatabase();
    } else {
      const remaining = 5 - newCount;
      Alert.alert(
        "Dev Mode",
        `Tap ${remaining} more time${
          remaining > 1 ? "s" : ""
        } to reset all data`
      );

      // Reset counter after 3 seconds
      setTimeout(() => setResetTapCount(0), 3000);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);

    if (query.trim().length > 0) {
      const results = searchProducts(query);
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleAddFromSearch = (product) => {
    // Check stock availability
    if (product.stock_quantity <= 0) {
      Alert.alert("Out of Stock", `${product.name} is currently out of stock.`);
      return;
    }

    addToCart(product);
    // Clear search after adding
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Render different screens
  let screenContent;

  // Home Screen
  if (currentScreen === "home") {
    screenContent = (
      <ScrollView style={styles.homeContainer}>
        <View style={styles.homeHeader}>
          <TouchableOpacity
            onPress={handleDevResetTap}
            style={styles.devResetArea}
          >
            <Text style={styles.homeTitle}>POS Corner Store</Text>
            <Text style={styles.homeSubtitle}>Point of Sale System</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.homeContent}>
          {/* Dashboard Stats */}
          <View style={styles.dashboardContainer}>
            <Text style={styles.sectionTitle}>📊 Dashboard</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {dashboardStats.totalProducts || 0}
                </Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {dashboardStats.totalSales || 0}
                </Text>
                <Text style={styles.statLabel}>Sales</Text>
              </View>
              <TouchableOpacity
                style={styles.statBox}
                onPress={() => setHideRevenue(!hideRevenue)}
              >
                <Text style={styles.statNumber}>
                  {hideRevenue
                    ? "••••••"
                    : `₱${dashboardStats.totalRevenue || "0.00"}`}
                </Text>
                <View style={styles.statLabelRow}>
                  <Text style={styles.statLabel}>Revenue</Text>
                  <Text style={styles.hideIcon}>
                    {hideRevenue ? "👁️" : "🙈"}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {dashboardStats.lowStockProducts || 0}
                </Text>
                <Text style={styles.statLabel}>Low Stock</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={openPOS}>
              <Text style={styles.primaryButtonText}>� Open POS</Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.halfButton]}
                onPress={() => setCurrentScreen("products")}
              >
                <Text style={styles.secondaryButtonText}>📦 Products</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, styles.halfButton]}
                onPress={openAddProductModal}
              >
                <Text style={styles.secondaryButtonText}>➕ Add Product</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.halfButton]}
                onPress={() => setShowCategoriesModal(true)}
              >
                <Text style={styles.secondaryButtonText}>🏷️ Categories</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, styles.halfButton]}
                onPress={() => setShowReceiptHistory(true)}
              >
                <Text style={styles.secondaryButtonText}>📋 History</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Last Scanned Product */}
          {scannedProduct && (
            <View style={styles.lastScanContainer}>
              <Text style={styles.lastScanTitle}>Last Scanned Product:</Text>
              <Text style={styles.lastScanData}>{scannedProduct.name}</Text>
              <Text style={styles.lastScanPrice}>
                Price: ₱{scannedProduct.price}
              </Text>
              <Text style={styles.lastScanStock}>
                Stock: {scannedProduct.stock_quantity}
              </Text>
            </View>
          )}

          {/* Recent Products */}
          {products.length > 0 && (
            <View style={styles.recentProductsContainer}>
              <Text style={styles.sectionTitle}>Recent Products</Text>
              {products.slice(0, 3).map((product) => (
                <View key={product.id} style={styles.productItem}>
                  <View>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productCategory}>
                      {product.category}
                    </Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productPrice}>₱{product.price}</Text>
                    <Text style={styles.productStock}>
                      Stock: {product.stock_quantity}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <StatusBar style="dark" />
      </ScrollView>
    );
  }

  // Products Screen
  else if (currentScreen === "products") {
    screenContent = (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBackHome}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>Products</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.productsContent}>
          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No products found</Text>
              <Text style={styles.emptyStateSubtext}>
                Scan a barcode to add products
              </Text>
            </View>
          ) : (
            products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => handleEditProduct(product)}
              >
                <View style={styles.productHeader}>
                  <Text style={styles.productCardName}>{product.name}</Text>
                  <Text style={styles.productCardPrice}>₱{product.price}</Text>
                </View>
                <Text style={styles.productCardCategory}>
                  {product.category}
                </Text>
                <Text style={styles.productCardBarcode}>
                  Barcode: {product.barcode}
                </Text>
                <View style={styles.productCardFooter}>
                  <View style={styles.stockInfo}>
                    <Text style={styles.productCardStock}>
                      Stock: {product.stock_quantity}
                    </Text>
                    <View
                      style={[
                        styles.stockIndicator,
                        {
                          backgroundColor:
                            product.stock_quantity < 10 ? "#ff4757" : "#2ed573",
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.productActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditProduct(product)}
                    >
                      <Text style={styles.editButtonText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteProduct(product)}
                    >
                      <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <StatusBar style="light" />
      </View>
    );
  }

  // POS Screen with Cart
  else if (currentScreen === "pos") {
    const cartTotal = calculateCartTotal();
    const discounts = getDiscountInfo();

    screenContent = (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBackHome}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>Point of Sale</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.posContainer}>
          {/* Scan Button */}
          <TouchableOpacity style={styles.scanButtonLarge} onPress={openCamera}>
            <Text style={styles.scanButtonLargeText}>📷 Scan Product</Text>
          </TouchableOpacity>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products by name, barcode, or category..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results */}
          {showSearchResults && searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <ScrollView style={styles.searchResultsList}>
                {searchResults.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.searchResultItem}
                    onPress={() => handleAddFromSearch(product)}
                  >
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>
                        {product.name}
                      </Text>
                      <Text style={styles.searchResultCategory}>
                        {product.category}
                      </Text>
                      <Text style={styles.searchResultBarcode}>
                        Barcode: {product.barcode}
                      </Text>
                    </View>
                    <View style={styles.searchResultPricing}>
                      <Text style={styles.searchResultPrice}>
                        ₱{product.price.toFixed(2)}
                      </Text>
                      <Text
                        style={[
                          styles.searchResultStock,
                          product.stock_quantity < 10 &&
                            styles.searchResultStockLow,
                        ]}
                      >
                        Stock: {product.stock_quantity}
                      </Text>
                      <Text style={styles.addToCartHint}>Tap to add</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* No Results Message */}
          {showSearchResults &&
            searchResults.length === 0 &&
            searchQuery.length > 0 && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No products found</Text>
                <Text style={styles.noResultsSubtext}>
                  Try a different search term
                </Text>
              </View>
            )}

          {/* Cart Section */}
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
                        {
                          text: "Clear",
                          onPress: clearCart,
                          style: "destructive",
                        },
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
                    Scan or search for products to add them to cart
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
                          onPress={() =>
                            updateCartItemQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Text style={styles.quantityButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() =>
                            updateCartItemQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Text style={styles.quantityButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.cartItemSubtotal}>
                        ₱{(item.price * item.quantity).toFixed(2)}
                      </Text>

                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeFromCart(item.id)}
                      >
                        <Text style={styles.removeButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>

          {/* Cart Total and Checkout */}
          <View style={styles.cartFooter}>
            {/* Discount Information */}
            {discounts.length > 0 && (
              <View style={styles.discountSection}>
                <Text style={styles.discountTitle}>
                  💰 Bulk Discounts Applied!
                </Text>
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
              onPress={handleCheckout}
              disabled={cartItems.length === 0}
            >
              <Text style={styles.checkoutButtonText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <StatusBar style="light" />
      </View>
    );
  }

  // Camera Screen
  else if (hasPermission === null) {
    screenContent = (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          Requesting camera permission...
        </Text>
      </View>
    );
  } else if (hasPermission === false) {
    screenContent = (
      <View style={styles.container}>
        <Text style={styles.permissionText}>No access to camera</Text>
        <TouchableOpacity style={styles.backButton} onPress={goBackHome}>
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    screenContent = (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBackToPOS}>
            <Text style={styles.backButtonText}>← Back to POS</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>Scanner</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: [
                "qr",
                "pdf417",
                "ean13",
                "ean8",
                "code128",
                "code39",
              ],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />

          <View style={styles.overlay}>
            <View style={styles.scanArea} />
          </View>
        </View>

        <View style={styles.footer}>
          {scannedData ? (
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>Last Scanned:</Text>
              <Text style={styles.resultText}>{scannedData}</Text>
            </View>
          ) : (
            <Text style={styles.instructionText}>Point camera at barcode</Text>
          )}
        </View>

        <StatusBar style="light" />
      </View>
    );
  }

  // Return the screen content with the modal
  return (
    <>
      {screenContent}

      {/* Add Product Modal - Available on all screens */}
      <AddProductModal
        visible={showAddProductModal}
        onClose={closeAddProductModal}
        onSave={handleAddProduct}
        productData={newProduct}
        onChangeText={handleProductFormChange}
        onOpenCategories={handleOpenCategoriesFromProduct}
      />

      {/* Edit Product Modal */}
      <AddProductModal
        visible={showEditProductModal}
        onClose={() => {
          setShowEditProductModal(false);
          setEditingProduct(null);
        }}
        onSave={handleUpdateProduct}
        productData={
          editingProduct || {
            name: "",
            barcode: "",
            price: "",
            stock: "",
            category: "Food & Beverages",
            description: "",
          }
        }
        onChangeText={(field, value) => {
          if (editingProduct) {
            setEditingProduct({ ...editingProduct, [field]: value });
          }
        }}
        onOpenCategories={() => setShowCategoriesModal(true)}
        isEditing={true}
      />

      {/* Categories Modal */}
      <CategoriesModal
        visible={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        onCategoryAdded={handleCategoryAdded}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        visible={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        cartItems={cartItems}
        cartTotal={calculateCartTotal()}
        onCompleteCheckout={completeCheckout}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        visible={showReceipt}
        onClose={() => setShowReceipt(false)}
        receipt={receiptData}
      />

      {/* Receipt History Modal */}
      <ReceiptHistoryModal
        visible={showReceiptHistory}
        onClose={() => setShowReceiptHistory(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Home Screen Styles
  homeContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  homeHeader: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  devResetArea: {
    alignItems: "center",
  },
  homeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  homeSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  homeContent: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  featureContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  featureText: {
    fontSize: 16,
    color: "#555",
    marginBottom: 8,
    lineHeight: 24,
  },
  openCameraButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  openCameraButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  lastScanContainer: {
    backgroundColor: "#e8f5e8",
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  lastScanTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2e7d32",
    marginBottom: 5,
  },
  lastScanData: {
    fontSize: 14,
    color: "#1b5e20",
    lineHeight: 20,
    fontWeight: "bold",
  },
  lastScanPrice: {
    fontSize: 12,
    color: "#1b5e20",
    marginTop: 2,
  },
  lastScanStock: {
    fontSize: 12,
    color: "#1b5e20",
    marginTop: 2,
  },

  // Dashboard Styles
  dashboardContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statBox: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  hideIcon: {
    fontSize: 12,
    marginLeft: 5,
  },

  // Action Buttons
  actionsContainer: {
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfButton: {
    width: "48%",
  },
  fullButton: {
    width: "100%",
    marginTop: 10,
  },

  // Recent Products
  recentProductsContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  productCategory: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  productInfo: {
    alignItems: "flex-end",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
  productStock: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },

  // Products Screen
  productsContent: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
  productCard: {
    backgroundColor: "#1a1a1a",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  productCardName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  productCardPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  productCardCategory: {
    fontSize: 14,
    color: "#888",
    marginBottom: 5,
  },
  productCardBarcode: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
  productCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stockInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  productCardStock: {
    fontSize: 14,
    color: "#fff",
    marginRight: 8,
  },
  stockIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  productActions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    backgroundColor: "#5f27cd",
    padding: 8,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: "#ff4757",
    padding: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 16,
  },

  // Camera Screen Styles
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  placeholder: {
    width: 60, // Same width as back button for centering
  },
  permissionText: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#00ff00",
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  footer: {
    padding: 20,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    minHeight: 120,
  },
  instructionText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  resultContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  resultLabel: {
    fontSize: 14,
    color: "#888",
    marginBottom: 5,
  },
  resultText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  scanButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  scanButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Modal Styles
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
  modalSaveText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  categoryScroll: {
    flexDirection: "row",
  },
  categoryChip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  categoryChipSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  categoryChipText: {
    fontSize: 14,
    color: "#666",
  },
  categoryChipTextSelected: {
    color: "#fff",
  },

  // POS Screen Styles
  posContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scanButtonLarge: {
    backgroundColor: "#007AFF",
    paddingVertical: 20,
    margin: 15,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanButtonLargeText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 15,
    marginBottom: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 15,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingVertical: 12,
  },
  clearSearchButton: {
    padding: 8,
  },
  clearSearchText: {
    color: "#888",
    fontSize: 18,
    fontWeight: "bold",
  },
  searchResultsContainer: {
    maxHeight: 250,
    marginHorizontal: 15,
    marginBottom: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    overflow: "hidden",
  },
  searchResultsList: {
    padding: 10,
  },
  searchResultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  searchResultInfo: {
    flex: 1,
    marginRight: 12,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  searchResultCategory: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  searchResultBarcode: {
    fontSize: 11,
    color: "#666",
  },
  searchResultPricing: {
    alignItems: "flex-end",
  },
  searchResultPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 4,
  },
  searchResultStock: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  searchResultStockLow: {
    color: "#ff4757",
  },
  addToCartHint: {
    fontSize: 10,
    color: "#007AFF",
    fontStyle: "italic",
  },
  noResultsContainer: {
    alignItems: "center",
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  noResultsText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: "#888",
  },
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
  discountTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 8,
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
