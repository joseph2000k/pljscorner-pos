import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import XLSX from "xlsx-js-style";

export default function ExportReportScreen({
  onBackPress,
  onGenerateReport,
  getAllProducts,
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Get date one week ago
  const getLastWeekDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split("T")[0];
  };

  // Get date one month ago
  const getLastMonthDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  };

  const handleQuickSelect = (type) => {
    const today = getTodayDate();
    switch (type) {
      case "today":
        setStartDate(today);
        setEndDate(today);
        break;
      case "week":
        setStartDate(getLastWeekDate());
        setEndDate(today);
        break;
      case "month":
        setStartDate(getLastMonthDate());
        setEndDate(today);
        break;
    }
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      Alert.alert("Error", "Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      Alert.alert("Error", "Start date cannot be after end date");
      return;
    }

    setIsGenerating(true);

    try {
      const salesData = onGenerateReport(startDate, endDate);

      if (!salesData || salesData.length === 0) {
        Alert.alert("No Data", "No sales found for the selected date range");
        setIsGenerating(false);
        return;
      }

      // Group sales by sale_id and calculate discounts
      const salesGrouped = {};
      const categoryQuantities = {}; // Track quantities per category per sale

      salesData.forEach((item) => {
        if (!salesGrouped[item.sale_id]) {
          salesGrouped[item.sale_id] = {
            saleId: item.sale_id,
            date: new Date(item.created_at).toLocaleString(),
            paymentMethod: item.payment_method,
            customerName: item.customer_name || "N/A",
            totalAmount: item.total_amount,
            amountPaid: item.amount_paid || item.total_amount,
            change: item.change_amount || 0,
            items: [],
            categoryData: {}, // Track category info per sale
          };
          categoryQuantities[item.sale_id] = {};
        }

        if (item.product_id) {
          // Track total quantity per category for this sale
          if (!categoryQuantities[item.sale_id][item.category]) {
            categoryQuantities[item.sale_id][item.category] = {
              totalQty: 0,
              regularTotal: 0,
              bulkDiscountQty: item.bulk_discount_quantity || 0,
              bulkDiscountPrice: item.bulk_discount_price || 0,
            };
          }

          categoryQuantities[item.sale_id][item.category].totalQty +=
            item.quantity;
          categoryQuantities[item.sale_id][item.category].regularTotal +=
            item.original_price * item.quantity;

          salesGrouped[item.sale_id].items.push({
            product: item.product_name,
            category: item.category,
            quantity: item.quantity,
            originalPrice: item.original_price,
            price: item.price,
            subtotal: item.subtotal,
            bulkDiscountQty: item.bulk_discount_quantity || 0,
            bulkDiscountPrice: item.bulk_discount_price || 0,
          });
        }
      });

      // Calculate actual discounts based on bulk pricing rules
      Object.keys(salesGrouped).forEach((saleId) => {
        const sale = salesGrouped[saleId];
        const catQty = categoryQuantities[saleId];

        sale.items.forEach((item) => {
          const categoryInfo = catQty[item.category];
          let discountAmount = 0;

          if (
            categoryInfo &&
            categoryInfo.bulkDiscountQty > 0 &&
            categoryInfo.bulkDiscountPrice > 0
          ) {
            const totalQty = categoryInfo.totalQty;
            const discountQty = categoryInfo.bulkDiscountQty;
            const discountPrice = categoryInfo.bulkDiscountPrice;
            const regularTotal = categoryInfo.regularTotal;

            if (totalQty >= discountQty) {
              // Calculate total savings for the category
              const bulkSets = Math.floor(totalQty / discountQty);
              const remainingQty = totalQty % discountQty;
              const avgUnitPrice = regularTotal / totalQty;

              const actualTotal =
                bulkSets * discountPrice + remainingQty * avgUnitPrice;
              const totalSavings = regularTotal - actualTotal;

              // Distribute savings proportionally to this item
              const itemRegularTotal = item.originalPrice * item.quantity;
              discountAmount = totalSavings * (itemRegularTotal / regularTotal);
            }
          }

          item.discountAmount = discountAmount;
          item.hasDiscount = discountAmount > 0;
        });
      });

      // Create Excel data for detailed transactions
      const excelData = [];

      // Add header
      excelData.push([
        "Sale ID",
        "Date",
        "Payment Method",
        "Customer",
        "Product",
        "Qty",
        "Original Price",
        "Actual Price",
        "Discount",
        "Subtotal",
        "Total",
        "Amount Paid",
        "Change",
      ]);

      // Add sales data
      Object.values(salesGrouped).forEach((sale) => {
        if (sale.items.length > 0) {
          sale.items.forEach((item, index) => {
            // Calculate actual subtotal (after discount)
            const actualSubtotal = item.subtotal - item.discountAmount;

            excelData.push([
              index === 0 ? sale.saleId : "",
              index === 0 ? sale.date : "",
              index === 0 ? sale.paymentMethod : "",
              index === 0 ? sale.customerName : "",
              item.product,
              item.quantity,
              item.originalPrice.toFixed(2),
              item.price.toFixed(2),
              item.discountAmount.toFixed(2),
              actualSubtotal.toFixed(2),
              index === 0 ? sale.totalAmount.toFixed(2) : "",
              index === 0 ? sale.amountPaid.toFixed(2) : "",
              index === 0 ? sale.change.toFixed(2) : "",
            ]);
          });
        } else {
          excelData.push([
            sale.saleId,
            sale.date,
            sale.paymentMethod,
            sale.customerName,
            "No items",
            0,
            0,
            0,
            0,
            0,
            sale.totalAmount.toFixed(2),
            sale.amountPaid.toFixed(2),
            sale.change.toFixed(2),
          ]);
        }
      });

      // Create summary data by product using the calculated discounts
      const productSummary = {};

      Object.values(salesGrouped).forEach((sale) => {
        sale.items.forEach((item) => {
          if (!productSummary[item.product]) {
            productSummary[item.product] = {
              totalQuantity: 0,
              totalRevenue: 0,
              totalDiscount: 0,
              transactionCount: 0,
            };
          }
          productSummary[item.product].totalQuantity += item.quantity;
          // Actual revenue = original subtotal - discount
          const actualRevenue = item.subtotal - item.discountAmount;
          productSummary[item.product].totalRevenue += actualRevenue;
          productSummary[item.product].totalDiscount += item.discountAmount;
          productSummary[item.product].transactionCount += 1;
        });
      });

      // Create summary sheet data
      const summaryData = [];
      summaryData.push([
        "Product Name",
        "Total Quantity Sold",
        "Total Revenue",
        "Total Discount Given",
        "Number of Transactions",
        "Average Price per Unit",
      ]);

      // Sort products by quantity sold (descending)
      const sortedProducts = Object.entries(productSummary).sort(
        (a, b) => b[1].totalQuantity - a[1].totalQuantity
      );

      sortedProducts.forEach(([productName, summary]) => {
        const avgPrice =
          summary.totalQuantity > 0
            ? summary.totalRevenue / summary.totalQuantity
            : 0;
        summaryData.push([
          productName,
          summary.totalQuantity,
          summary.totalRevenue.toFixed(2),
          summary.totalDiscount.toFixed(2),
          summary.transactionCount,
          avgPrice.toFixed(2),
        ]);
      });

      // Add totals row
      const totalQuantity = Object.values(productSummary).reduce(
        (sum, item) => sum + item.totalQuantity,
        0
      );
      const totalRevenue = Object.values(productSummary).reduce(
        (sum, item) => sum + item.totalRevenue,
        0
      );
      const totalDiscount = Object.values(productSummary).reduce(
        (sum, item) => sum + item.totalDiscount,
        0
      );
      const totalTransactions = Object.values(productSummary).reduce(
        (sum, item) => sum + item.transactionCount,
        0
      );

      summaryData.push([]);
      summaryData.push([
        "TOTAL",
        totalQuantity,
        totalRevenue.toFixed(2),
        totalDiscount.toFixed(2),
        totalTransactions,
        "",
      ]);

      // Create workbook with two sheets
      const wb = XLSX.utils.book_new();

      // Add detailed transactions sheet
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // Apply cell styles for header row (black text, bold)
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = {
          font: {
            bold: true,
            color: { rgb: "FF000000" },
            name: "Calibri",
            sz: 11,
          },
          fill: {
            patternType: "solid",
            fgColor: { rgb: "FFFFFFFF" },
          },
          alignment: {
            vertical: "center",
            horizontal: "center",
          },
        };
      }

      XLSX.utils.book_append_sheet(wb, ws, "Detailed Transactions");

      // Add summary sheet
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

      // Style header row in summary sheet
      const summaryRange = XLSX.utils.decode_range(wsSummary["!ref"]);
      for (let col = summaryRange.s.c; col <= summaryRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!wsSummary[cellAddress]) continue;
        wsSummary[cellAddress].s = {
          font: {
            bold: true,
            color: { rgb: "FF000000" },
            name: "Calibri",
            sz: 11,
          },
          fill: {
            patternType: "solid",
            fgColor: { rgb: "FFFFFFFF" },
          },
          alignment: {
            vertical: "center",
            horizontal: "center",
          },
        };
      }

      // Style TOTAL row (last row) - black text, bold
      const totalRowIndex = summaryRange.e.r;
      for (let col = summaryRange.s.c; col <= summaryRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({
          r: totalRowIndex,
          c: col,
        });
        if (!wsSummary[cellAddress]) continue;
        wsSummary[cellAddress].s = {
          font: {
            bold: true,
            color: { rgb: "FF000000" },
            name: "Calibri",
            sz: 11,
          },
          fill: {
            patternType: "solid",
            fgColor: { rgb: "FFFFFFFF" },
          },
          alignment: {
            vertical: "center",
            horizontal: "center",
          },
        };
      }

      XLSX.utils.book_append_sheet(wb, wsSummary, "Product Summary");

      // Create Product Inventory sheet
      const allProducts = getAllProducts();
      const inventoryData = [];

      // Add header
      inventoryData.push([
        "Product Name",
        "Category",
        "Price",
        "Stock Quantity",
        "QR Code",
        "Description",
      ]);

      // Sort products by category then name
      const sortedInventory = allProducts.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });

      // Add product data
      sortedInventory.forEach((product) => {
        inventoryData.push([
          product.name,
          product.category,
          product.price.toFixed(2),
          product.stock_quantity,
          product.qr || "",
          product.description || "",
        ]);
      });

      // Add totals row
      const totalProducts = allProducts.length;
      const totalStockValue = allProducts.reduce(
        (sum, product) => sum + product.price * product.stock_quantity,
        0
      );
      const totalStockQty = allProducts.reduce(
        (sum, product) => sum + product.stock_quantity,
        0
      );

      inventoryData.push([]);
      inventoryData.push([
        "TOTAL",
        `${totalProducts} Products`,
        `₱${totalStockValue.toFixed(2)}`,
        totalStockQty,
        "",
        "",
      ]);

      // Create inventory sheet
      const wsInventory = XLSX.utils.aoa_to_sheet(inventoryData);

      // Style header row in inventory sheet
      const inventoryRange = XLSX.utils.decode_range(wsInventory["!ref"]);
      for (let col = inventoryRange.s.c; col <= inventoryRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!wsInventory[cellAddress]) continue;
        wsInventory[cellAddress].s = {
          font: {
            bold: true,
            color: { rgb: "FF000000" },
            name: "Calibri",
            sz: 11,
          },
          fill: {
            patternType: "solid",
            fgColor: { rgb: "FFFFFFFF" },
          },
          alignment: {
            vertical: "center",
            horizontal: "center",
          },
        };
      }

      // Style TOTAL row in inventory sheet
      const inventoryTotalRowIndex = inventoryRange.e.r;
      for (let col = inventoryRange.s.c; col <= inventoryRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({
          r: inventoryTotalRowIndex,
          c: col,
        });
        if (!wsInventory[cellAddress]) continue;
        wsInventory[cellAddress].s = {
          font: {
            bold: true,
            color: { rgb: "FF000000" },
            name: "Calibri",
            sz: 11,
          },
          fill: {
            patternType: "solid",
            fgColor: { rgb: "FFFFFFFF" },
          },
          alignment: {
            vertical: "center",
            horizontal: "center",
          },
        };
      }

      XLSX.utils.book_append_sheet(wb, wsInventory, "Product Inventory");

      // Generate Excel file with cell styles enabled
      const wbout = XLSX.write(wb, {
        type: "base64",
        bookType: "xlsx",
        cellStyles: true,
      });
      const fileName = `Sales_Report_${startDate}_to_${endDate}.xlsx`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
        Alert.alert("Success", "Excel report generated successfully!");
      } else {
        Alert.alert("Success", `Report saved to: ${fileUri}`);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      Alert.alert("Error", "Failed to generate report: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Export Report</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#007AFF" />
          <Text style={styles.infoText}>
            Select a date range to generate an Excel report of all sales
            transactions.
          </Text>
        </View>

        {/* Quick Select */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Select</Text>
          <View style={styles.quickSelectContainer}>
            <TouchableOpacity
              style={styles.quickSelectButton}
              onPress={() => handleQuickSelect("today")}
            >
              <Ionicons name="today-outline" size={20} color="#007AFF" />
              <Text style={styles.quickSelectText}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickSelectButton}
              onPress={() => handleQuickSelect("week")}
            >
              <Ionicons name="calendar-outline" size={20} color="#007AFF" />
              <Text style={styles.quickSelectText}>Last 7 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickSelectButton}
              onPress={() => handleQuickSelect("month")}
            >
              <Ionicons name="calendar" size={20} color="#007AFF" />
              <Text style={styles.quickSelectText}>Last 30 Days</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date Range</Text>

          <View style={styles.dateInputContainer}>
            <Text style={styles.dateLabel}>Start Date</Text>
            <View style={styles.dateInputBox}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.dateText}>{startDate || "YYYY-MM-DD"}</Text>
            </View>
            <Text style={styles.dateHint}>
              Tap quick select buttons or enter: {getTodayDate()}
            </Text>
          </View>

          <View style={styles.dateInputContainer}>
            <Text style={styles.dateLabel}>End Date</Text>
            <View style={styles.dateInputBox}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.dateText}>{endDate || "YYYY-MM-DD"}</Text>
            </View>
            <Text style={styles.dateHint}>
              Tap quick select buttons or enter: {getTodayDate()}
            </Text>
          </View>
        </View>

        {/* Export Button */}
        <TouchableOpacity
          style={[
            styles.exportButton,
            (!startDate || !endDate || isGenerating) &&
              styles.exportButtonDisabled,
          ]}
          onPress={handleExport}
          disabled={!startDate || !endDate || isGenerating}
        >
          <Ionicons
            name={isGenerating ? "hourglass-outline" : "document-text"}
            size={24}
            color="#fff"
          />
          <Text style={styles.exportButtonText}>
            {isGenerating ? "Generating Report..." : "Generate Excel Report"}
          </Text>
        </TouchableOpacity>

        {/* Format Info */}
        <View style={styles.formatInfo}>
          <Text style={styles.formatTitle}>
            Excel Report Contains 3 Sheets:
          </Text>

          <Text style={styles.sheetTitle}>1. Detailed Transactions</Text>
          <Text style={styles.formatItem}>• Sale ID and Date</Text>
          <Text style={styles.formatItem}>• Payment Method</Text>
          <Text style={styles.formatItem}>• Customer Name</Text>
          <Text style={styles.formatItem}>• Product Details</Text>
          <Text style={styles.formatItem}>
            • Original Price, Actual Price, and Discount
          </Text>
          <Text style={styles.formatItem}>• Quantities and Subtotals</Text>
          <Text style={styles.formatItem}>• Total Amount and Change</Text>

          <Text style={[styles.sheetTitle, { marginTop: 12 }]}>
            2. Product Summary
          </Text>
          <Text style={styles.formatItem}>• Total Quantity Sold per Item</Text>
          <Text style={styles.formatItem}>• Total Revenue per Item</Text>
          <Text style={styles.formatItem}>• Total Discount Given per Item</Text>
          <Text style={styles.formatItem}>• Number of Transactions</Text>
          <Text style={styles.formatItem}>• Average Price per Unit</Text>
          <Text style={styles.formatItem}>• Grand Total Summary</Text>

          <Text style={[styles.sheetTitle, { marginTop: 12 }]}>
            3. Product Inventory
          </Text>
          <Text style={styles.formatItem}>• Product Name and Category</Text>
          <Text style={styles.formatItem}>• Current Price</Text>
          <Text style={styles.formatItem}>• Current Stock Quantity</Text>
          <Text style={styles.formatItem}>• QR Code and Description</Text>
          <Text style={styles.formatItem}>• Total Stock Value Summary</Text>
        </View>
      </ScrollView>
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
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#007AFF",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#007AFF",
    marginLeft: 12,
    lineHeight: 20,
  },
  section: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  quickSelectContainer: {
    flexDirection: "row",
    gap: 8,
  },
  quickSelectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  quickSelectText: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "500",
  },
  dateInputContainer: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  dateInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
  },
  dateHint: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    gap: 10,
  },
  exportButtonDisabled: {
    backgroundColor: "#ccc",
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  formatInfo: {
    backgroundColor: "#fff",
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  formatTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
    marginTop: 8,
    marginBottom: 4,
  },
  formatItem: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
});
