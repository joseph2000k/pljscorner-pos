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
import {
  initializeDatabase,
  getProductByBarcode,
  getAllProducts,
  getDashboardStats,
  addProduct,
  deleteProduct,
  updateProduct,
  getAllCategories,
} from "./database";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("home"); // 'home', 'camera', 'products', 'add-product'
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
    category: "General",
    description: "",
  });

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

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setScannedData(data);

    // Look up product by barcode
    const product = getProductByBarcode(data);
    setScannedProduct(product);

    if (product) {
      Alert.alert(
        "Product Found!",
        `Name: ${product.name}\nPrice: $${product.price}\nStock: ${product.stock_quantity}`,
        [
          { text: "Scan Again", onPress: () => setScanned(false) },
          { text: "Add to Cart", onPress: () => addToCart(product) },
          { text: "Back to Home", onPress: () => setCurrentScreen("home") },
        ]
      );
    } else {
      Alert.alert(
        "Product Not Found",
        `Barcode: ${data}\nProduct not in database.`,
        [
          { text: "Scan Again", onPress: () => setScanned(false) },
          { text: "Add Product", onPress: () => addNewProduct(data) },
          { text: "Back to Home", onPress: () => setCurrentScreen("home") },
        ]
      );
    }
  };

  const addToCart = (product) => {
    // For now, just show an alert. In a full POS system, this would add to cart
    Alert.alert("Added to Cart", `${product.name} added to cart!`);
    setScanned(false);
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

  const goBackHome = () => {
    setCurrentScreen("home");
    loadDashboardData(); // Refresh data when returning home
  };

  const openAddProductModal = () => {
    setNewProduct({
      name: "",
      barcode: "",
      price: "",
      stock: "",
      category: "General",
      description: "",
    });
    setShowAddProductModal(true);
  };

  const closeAddProductModal = () => {
    setShowAddProductModal(false);
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

  // Render different screens
  let screenContent;

  // Home Screen
  if (currentScreen === "home") {
    screenContent = (
      <ScrollView style={styles.homeContainer}>
        <View style={styles.homeHeader}>
          <Text style={styles.homeTitle}>POS Corner</Text>
          <Text style={styles.homeSubtitle}>Point of Sale System</Text>
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
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  ${dashboardStats.totalRevenue || "0.00"}
                </Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
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
            <TouchableOpacity style={styles.primaryButton} onPress={openCamera}>
              <Text style={styles.primaryButtonText}>📷 Scan Product</Text>
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
          </View>

          {/* Last Scanned Product */}
          {scannedProduct && (
            <View style={styles.lastScanContainer}>
              <Text style={styles.lastScanTitle}>Last Scanned Product:</Text>
              <Text style={styles.lastScanData}>{scannedProduct.name}</Text>
              <Text style={styles.lastScanPrice}>
                Price: ${scannedProduct.price}
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
                    <Text style={styles.productPrice}>${product.price}</Text>
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
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <Text style={styles.productCardName}>{product.name}</Text>
                  <Text style={styles.productCardPrice}>${product.price}</Text>
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
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteProduct(product)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

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
          <TouchableOpacity style={styles.backButton} onPress={goBackHome}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>QR Code Scanner</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "pdf417"],
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
            <Text style={styles.instructionText}>Point camera at QR code</Text>
          )}

          {scanned && (
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.scanButtonText}>Scan Again</Text>
            </TouchableOpacity>
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
      <Modal
        visible={showAddProductModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeAddProductModal}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add New Product</Text>
            <TouchableOpacity onPress={handleAddProduct}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Product Name *</Text>
              <TextInput
                style={styles.textInput}
                value={newProduct.name}
                onChangeText={(text) =>
                  setNewProduct({ ...newProduct, name: text })
                }
                placeholder="Enter product name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Barcode *</Text>
              <TextInput
                style={styles.textInput}
                value={newProduct.barcode}
                onChangeText={(text) =>
                  setNewProduct({ ...newProduct, barcode: text })
                }
                placeholder="Enter or scan barcode"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Price *</Text>
              <TextInput
                style={styles.textInput}
                value={newProduct.price}
                onChangeText={(text) =>
                  setNewProduct({ ...newProduct, price: text })
                }
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Stock Quantity</Text>
              <TextInput
                style={styles.textInput}
                value={newProduct.stock}
                onChangeText={(text) =>
                  setNewProduct({ ...newProduct, stock: text })
                }
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {[
                  "General",
                  "Food & Beverages",
                  "Electronics",
                  "Clothing",
                  "Health & Beauty",
                  "Home & Garden",
                ].map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      newProduct.category === category &&
                        styles.categoryChipSelected,
                    ]}
                    onPress={() =>
                      setNewProduct({ ...newProduct, category: category })
                    }
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        newProduct.category === category &&
                          styles.categoryChipTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newProduct.description}
                onChangeText={(text) =>
                  setNewProduct({ ...newProduct, description: text })
                }
                placeholder="Enter product description"
                placeholderTextColor="#999"
                multiline={true}
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
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
});
