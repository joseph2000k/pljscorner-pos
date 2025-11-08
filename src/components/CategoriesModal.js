import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getAllCategories,
  addCategory,
  updateCategory,
} from "../services/database";

const CategoriesModal = ({ visible, onClose, onCategoryAdded }) => {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [bulkDiscountQuantity, setBulkDiscountQuantity] = useState("");
  const [bulkDiscountPrice, setBulkDiscountPrice] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const loadCategories = () => {
    const allCategories = getAllCategories();
    setCategories(allCategories);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    // Validate discount fields
    const quantity = parseInt(bulkDiscountQuantity) || 0;
    const price = parseFloat(bulkDiscountPrice) || 0;

    if (quantity < 0 || price < 0) {
      Alert.alert("Error", "Discount values cannot be negative");
      return;
    }

    if ((quantity > 0 && price === 0) || (quantity === 0 && price > 0)) {
      Alert.alert(
        "Error",
        "Please enter both quantity and price for bulk discount, or leave both empty"
      );
      return;
    }

    if (editingCategory) {
      // Update existing category
      const result = updateCategory(
        editingCategory.id,
        newCategoryName.trim(),
        newCategoryDescription.trim(),
        quantity,
        price
      );

      if (result.success) {
        Alert.alert("Success", "Category updated successfully");
        resetForm();
        loadCategories();
        if (onCategoryAdded) {
          onCategoryAdded();
        }
      } else {
        Alert.alert("Error", result.error || "Failed to update category.");
      }
    } else {
      // Add new category
      const result = addCategory(
        newCategoryName.trim(),
        newCategoryDescription.trim(),
        quantity,
        price
      );

      if (result.success) {
        Alert.alert("Success", "Category added successfully");
        resetForm();
        loadCategories();
        if (onCategoryAdded) {
          onCategoryAdded();
        }
      } else {
        Alert.alert(
          "Error",
          result.error ||
            "Failed to add category. Category name might already exist."
        );
      }
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryDescription(category.description || "");
    setBulkDiscountQuantity(
      category.bulk_discount_quantity > 0
        ? category.bulk_discount_quantity.toString()
        : ""
    );
    setBulkDiscountPrice(
      category.bulk_discount_price > 0
        ? category.bulk_discount_price.toString()
        : ""
    );
    setIsAddingCategory(true);
  };

  const resetForm = () => {
    setNewCategoryName("");
    setNewCategoryDescription("");
    setBulkDiscountQuantity("");
    setBulkDiscountPrice("");
    setIsAddingCategory(false);
    setEditingCategory(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.modalCancelText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Manage Categories</Text>
          <TouchableOpacity
            onPress={() => {
              if (isAddingCategory) {
                resetForm();
              } else {
                setIsAddingCategory(true);
              }
            }}
          >
            <Text style={styles.modalSaveText}>
              {isAddingCategory ? "Cancel" : "New"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Add New Category Form */}
          {isAddingCategory && (
            <View style={styles.addCategoryForm}>
              <Text style={styles.formTitle}>
                {editingCategory ? "Edit Category" : "Add New Category"}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Enter category name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newCategoryDescription}
                  onChangeText={setNewCategoryDescription}
                  placeholder="Enter category description"
                  placeholderTextColor="#999"
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              {/* Bulk Discount Section */}
              <View style={styles.discountSection}>
                <View style={styles.discountSectionTitleRow}>
                  <Ionicons name="pricetags" size={18} color="#4CAF50" />
                  <Text style={styles.discountSectionTitle}>
                    Bulk Discount (Optional)
                  </Text>
                </View>
                <Text style={styles.discountExplanation}>
                  Set a special price when customers buy multiple items from
                  this category
                </Text>

                <View style={styles.discountRow}>
                  <View style={styles.discountInputGroup}>
                    <Text style={styles.inputLabel}>Quantity</Text>
                    <TextInput
                      style={styles.textInput}
                      value={bulkDiscountQuantity}
                      onChangeText={setBulkDiscountQuantity}
                      placeholder="e.g., 3"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                    />
                    <Text style={styles.inputHint}>Items to buy</Text>
                  </View>

                  <View style={styles.discountInputGroup}>
                    <Text style={styles.inputLabel}>Total Price</Text>
                    <TextInput
                      style={styles.textInput}
                      value={bulkDiscountPrice}
                      onChangeText={setBulkDiscountPrice}
                      placeholder="e.g., 100"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.inputHint}>Discounted price</Text>
                  </View>
                </View>

                <View style={styles.discountExample}>
                  <Text style={styles.discountExampleTitle}>Example:</Text>
                  <Text style={styles.discountExampleText}>
                    If item price is ₱35 and you set:{"\n"}• Quantity: 3{"\n"}•
                    Total Price: ₱100{"\n"}
                    Customer pays ₱100 for 3 items (saves ₱5!)
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddCategory}
              >
                <Text style={styles.addButtonText}>
                  {editingCategory ? "Update Category" : "Add Category"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Categories List */}
          <View style={styles.categoriesListContainer}>
            <Text style={styles.sectionTitle}>
              Existing Categories ({categories.length})
            </Text>

            {categories.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No categories yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Add your first category to get started
                </Text>
              </View>
            ) : (
              categories.map((category) => (
                <View key={category.id} style={styles.categoryCard}>
                  <View style={styles.categoryIcon}>
                    <Text style={styles.categoryIconText}>
                      {category.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    {category.description ? (
                      <Text style={styles.categoryDescription}>
                        {category.description}
                      </Text>
                    ) : null}
                    {category.bulk_discount_quantity > 0 &&
                    category.bulk_discount_price > 0 ? (
                      <View style={styles.discountBadge}>
                        <Ionicons
                          name="pricetags"
                          size={12}
                          color="#4CAF50"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.discountBadgeText}>
                          Buy {category.bulk_discount_quantity} for ₱
                          {category.bulk_discount_price}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.categoryDate}>
                      Added:{" "}
                      {new Date(category.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditCategory(category)}
                  >
                    <Ionicons name="pencil" size={20} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
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
  modalSaveText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  addCategoryForm: {
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
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#f9f9f9",
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
  addButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  categoriesListContainer: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  categoryIconText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  discountBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  categoryDate: {
    fontSize: 12,
    color: "#999",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
  },
  discountSection: {
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#007AFF20",
  },
  discountSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  discountSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  discountExplanation: {
    fontSize: 13,
    color: "#666",
    marginBottom: 15,
    lineHeight: 18,
  },
  discountRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },
  discountInputGroup: {
    flex: 1,
  },
  inputHint: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  discountExample: {
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },
  discountExampleTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  discountExampleText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CategoriesModal;
