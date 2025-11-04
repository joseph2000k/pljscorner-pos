import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import { getAllCategories } from "../services/database";

const AddProductModal = ({
  visible,
  onClose,
  onSave,
  productData,
  onChangeText,
  onOpenCategories,
}) => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const loadCategories = () => {
    const allCategories = getAllCategories();
    setCategories(allCategories.map((cat) => cat.name));
  };

  return (
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
          <Text style={styles.modalTitle}>Add New Product</Text>
          <TouchableOpacity onPress={onSave}>
            <Text style={styles.modalSaveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Product Name *</Text>
            <TextInput
              style={styles.textInput}
              value={productData.name}
              onChangeText={(text) => onChangeText("name", text)}
              placeholder="Enter product name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Barcode *</Text>
            <TextInput
              style={styles.textInput}
              value={productData.barcode}
              onChangeText={(text) => onChangeText("barcode", text)}
              placeholder="Enter or scan barcode"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Price *</Text>
            <TextInput
              style={styles.textInput}
              value={productData.price}
              onChangeText={(text) => onChangeText("price", text)}
              placeholder="0.00"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Stock Quantity</Text>
            <TextInput
              style={styles.textInput}
              value={productData.stock}
              onChangeText={(text) => onChangeText("stock", text)}
              placeholder="0"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.categoryHeader}>
              <Text style={styles.inputLabel}>Category</Text>
              {onOpenCategories && (
                <TouchableOpacity onPress={onOpenCategories}>
                  <Text style={styles.manageCategoriesLink}>
                    Manage Categories
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {categories.length === 0 ? (
                <TouchableOpacity
                  style={styles.categoryChip}
                  onPress={onOpenCategories}
                >
                  <Text style={styles.categoryChipText}>+ Add Categories</Text>
                </TouchableOpacity>
              ) : (
                categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      productData.category === category &&
                        styles.categoryChipSelected,
                    ]}
                    onPress={() => onChangeText("category", category)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        productData.category === category &&
                          styles.categoryChipTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={productData.description}
              onChangeText={(text) => onChangeText("description", text)}
              placeholder="Enter product description"
              placeholderTextColor="#999"
              multiline={true}
              numberOfLines={3}
            />
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
  inputGroup: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  manageCategoriesLink: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
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

export default AddProductModal;
