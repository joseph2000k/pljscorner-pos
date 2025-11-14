import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProductsScreen({
  products,
  loading,
  onBack,
  onEditProduct,
  onDeleteProduct,
  lowStockThreshold = 10,
  showLowStockOnly = false,
  onUpdateStock,
}) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [stockValues, setStockValues] = useState({});

  const handleStockChange = (productId, value) => {
    setStockValues({ ...stockValues, [productId]: value });
  };

  const handleStockBlur = (productId, originalStock) => {
    const newValue = stockValues[productId];
    if (newValue !== undefined && newValue !== "") {
      const newStock = parseInt(newValue);
      if (!isNaN(newStock) && newStock >= 0 && newStock !== originalStock) {
        onUpdateStock(productId, newStock);
      }
    }
    // Clear the edited value
    const newStockValues = { ...stockValues };
    delete newStockValues[productId];
    setStockValues(newStockValues);
  };

  // Filter products based on search query and low stock filter
  const filteredProducts = products.filter((product) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(searchLower) ||
      product.category.toLowerCase().includes(searchLower) ||
      product.qr.toLowerCase().includes(searchLower);

    const matchesLowStock = showLowStockOnly
      ? product.stock_quantity < lowStockThreshold
      : true;

    return matchesSearch && matchesLowStock;
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Products</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Low Stock Filter Indicator */}
      {showLowStockOnly && (
        <View style={styles.filterBanner}>
          <Ionicons name="alert-circle" size={20} color="#FF3B30" />
          <Text style={styles.filterBannerText}>
            Showing Low Stock Items (below {lowStockThreshold})
          </Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#8E8E93"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products by name, category, or QR..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#8E8E93"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.searchClearButton}
          >
            <Ionicons name="close-circle" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loaderText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item: product }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => onEditProduct(product)}
            >
              <View style={styles.productCardContent}>
                {product.image_uri && (
                  <Image
                    source={{ uri: product.image_uri }}
                    style={styles.productCardImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.productCardDetails}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productCardName}>{product.name}</Text>
                    <Text style={styles.productCardPrice}>
                      ₱{product.price}
                    </Text>
                  </View>
                  <Text style={styles.productCardCategory}>
                    {product.category}
                  </Text>
                  <Text style={styles.productCardQR}>QR: {product.qr}</Text>
                  <View style={styles.productCardFooter}>
                    <View style={styles.stockInfo}>
                      <Text style={styles.stockLabel}>Stock:</Text>
                      <TextInput
                        style={styles.stockInput}
                        value={
                          stockValues[product.id] !== undefined
                            ? stockValues[product.id]
                            : product.stock_quantity.toString()
                        }
                        onChangeText={(value) =>
                          handleStockChange(product.id, value)
                        }
                        onBlur={() =>
                          handleStockBlur(product.id, product.stock_quantity)
                        }
                        keyboardType="number-pad"
                        maxLength={5}
                      />
                      <View
                        style={[
                          styles.stockIndicator,
                          {
                            backgroundColor:
                              product.stock_quantity < lowStockThreshold
                                ? "#ff4757"
                                : "#2ed573",
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.productActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onEditProduct(product)}
                        accessibilityLabel="Edit product"
                      >
                        <Ionicons name="pencil" size={16} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onDeleteProduct(product)}
                        accessibilityLabel="Delete product"
                      >
                        <Ionicons name="trash" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery ? "No products found" : "No products available"}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery
                  ? "Try a different search term"
                  : "Scan a QR to add products"}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
        />
      )}

      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "#007AFF",
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  placeholder: {
    width: 50,
  },
  filterBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3F3",
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD7D7",
    gap: 8,
  },
  filterBannerText: {
    fontSize: 14,
    color: "#FF3B30",
    fontWeight: "500",
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 5,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  searchClearButton: {
    padding: 5,
  },
  listContent: {
    padding: 15,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
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
  },
  emptyStateText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "600",
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
  productCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  productCardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  productCardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  productCardDetails: {
    flex: 1,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  productCardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  productCardPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
  productCardCategory: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  productCardQR: {
    fontSize: 12,
    color: "#888",
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
    gap: 6,
  },
  stockLabel: {
    fontSize: 14,
    color: "#666",
  },
  stockInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    minWidth: 50,
    textAlign: "center",
    backgroundColor: "#fff",
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  productActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
});
