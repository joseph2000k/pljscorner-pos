import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
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
}) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter products based on search query
  const filteredProducts = products.filter((product) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.category.toLowerCase().includes(searchLower) ||
      product.qr.toLowerCase().includes(searchLower)
    );
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

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loaderText}>Loading products...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
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
        ) : (
          filteredProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
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
                      <Text style={styles.productCardStock}>
                        Stock: {product.stock_quantity}
                      </Text>
                      <View
                        style={[
                          styles.stockIndicator,
                          {
                            backgroundColor:
                              product.stock_quantity < 10
                                ? "#ff4757"
                                : "#2ed573",
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.productActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => onEditProduct(product)}
                      >
                        <Ionicons name="pencil" size={16} color="#007AFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => onDeleteProduct(product)}
                      >
                        <Ionicons name="trash" size={16} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

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
  content: {
    flex: 1,
    padding: 15,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 300,
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
  },
  productCardStock: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  productActions: {
    flexDirection: "row",
    gap: 10,
  },
  editButton: {
    padding: 8,
    backgroundColor: "#E3F2FD",
    borderRadius: 6,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: "#FFEBEE",
    borderRadius: 6,
  },
});
