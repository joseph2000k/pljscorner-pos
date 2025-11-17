import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";

export default function SalesReportScreen({
  onBackPress,
  salesByPaymentMethod,
  revenuePeriod,
  onDateRangeChange,
  customDateRange,
  saleDates,
}) {
  const insets = useSafeAreaInsets();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(customDateRange?.startDate || "");
  const [endDate, setEndDate] = useState(customDateRange?.endDate || "");
  const [isCustomRange, setIsCustomRange] = useState(!!customDateRange);
  const [selectingDateType, setSelectingDateType] = useState("start"); // 'start' or 'end'
  const [markedDates, setMarkedDates] = useState({});

  // Sync with parent's customDateRange when it changes
  useEffect(() => {
    if (customDateRange) {
      setStartDate(customDateRange.startDate);
      setEndDate(customDateRange.endDate);
      setIsCustomRange(true);
      updateMarkedDates(customDateRange.startDate, customDateRange.endDate);
    } else {
      setIsCustomRange(false);
    }
  }, [customDateRange]);
  const getTotalTransactions = () => {
    return salesByPaymentMethod.reduce(
      (sum, item) => sum + item.transaction_count,
      0
    );
  };

  const getTotalRevenue = () => {
    return salesByPaymentMethod.reduce(
      (sum, item) => sum + parseFloat(item.total_amount),
      0
    );
  };

  const getPaymentMethodIcon = (method) => {
    switch (method.toLowerCase()) {
      case "cash":
        return "cash-outline";
      case "card":
        return "card-outline";
      case "gcash":
        return "wallet-outline";
      default:
        return "help-circle-outline";
    }
  };

  const getPaymentMethodColor = (method) => {
    switch (method.toLowerCase()) {
      case "cash":
        return "#4CAF50";
      case "card":
        return "#2196F3";
      case "gcash":
        return "#FF9800";
      default:
        return "#999";
    }
  };

  const getPeriodLabel = () => {
    if (isCustomRange && startDate && endDate) {
      return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
    }
    switch (revenuePeriod) {
      case "daily":
        return "Today";
      case "weekly":
        return "This Week";
      case "monthly":
        return "This Month";
      case "yearly":
        return "This Year";
      default:
        return "All Time";
    }
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const onDayPress = (day) => {
    if (selectingDateType === "start") {
      setStartDate(day.dateString);
      setSelectingDateType("end");
      updateMarkedDates(day.dateString, endDate);
    } else {
      // If selecting end date, make sure it's after start date
      if (startDate && day.dateString >= startDate) {
        setEndDate(day.dateString);
        updateMarkedDates(startDate, day.dateString);
      } else if (!startDate) {
        setEndDate(day.dateString);
        updateMarkedDates("", day.dateString);
      }
    }
  };

  const updateMarkedDates = (start, end) => {
    const marked = {};

    if (start) {
      marked[start] = {
        startingDay: true,
        color: "#007AFF",
        textColor: "white",
      };
    }

    if (end) {
      marked[end] = {
        endingDay: true,
        color: "#007AFF",
        textColor: "white",
      };
    }

    // Mark days in between
    if (start && end && start !== end) {
      const startDateObj = new Date(start);
      const endDateObj = new Date(end);
      const currentDate = new Date(startDateObj);
      currentDate.setDate(currentDate.getDate() + 1);

      while (currentDate < endDateObj) {
        const dateString = currentDate.toISOString().split("T")[0];
        marked[dateString] = {
          color: "#B3D9FF",
          textColor: "#333",
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Update start and end to show period
      if (start === end) {
        marked[start] = {
          color: "#007AFF",
          textColor: "white",
        };
      } else {
        marked[start] = {
          startingDay: true,
          color: "#007AFF",
          textColor: "white",
        };
        marked[end] = {
          endingDay: true,
          color: "#007AFF",
          textColor: "white",
        };
      }
    }

    setMarkedDates(marked);
  };

  // Build dots for dates that have sales (saleDates is array of YYYY-MM-DD)
  const getSaleDateDots = () => {
    if (!saleDates || !Array.isArray(saleDates)) return {};
    const dots = {};
    saleDates.forEach((d) => {
      // if this date is already in markedDates, merge the dot info
      dots[d] = { marked: true, dotColor: "#007AFF" };
    });
    return dots;
  };

  // Merge range highlights (markedDates) with sale date dots
  const getMarkedDates = () => {
    const dots = getSaleDateDots();
    const range = markedDates || {};
    const merged = { ...dots };
    Object.keys(range).forEach((date) => {
      merged[date] = { ...merged[date], ...range[date] };
    });
    return merged;
  };

  const handleApplyDateRange = () => {
    if (startDate && endDate) {
      setIsCustomRange(true);
      setShowDatePicker(false);
      if (onDateRangeChange) {
        onDateRangeChange(startDate, endDate);
      }
    }
  };

  const handleResetToDefault = () => {
    setIsCustomRange(false);
    setStartDate("");
    setEndDate("");
    setMarkedDates({});
    setSelectingDateType("start");
    if (onDateRangeChange) {
      onDateRangeChange(null, null);
    }
  };

  const openDatePicker = () => {
    setSelectingDateType("start");
    setShowDatePicker(true);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Sales Report</Text>
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={openDatePicker}
        >
          <Ionicons name="calendar" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Period Info */}
        <View style={styles.periodBadge}>
          <Ionicons name="calendar-outline" size={16} color="#007AFF" />
          <Text style={styles.periodText}>{getPeriodLabel()}</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Ionicons name="receipt-outline" size={32} color="#007AFF" />
            <Text style={styles.summaryNumber}>{getTotalTransactions()}</Text>
            <Text style={styles.summaryLabel}>Total Transactions</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="cash-outline" size={32} color="#4CAF50" />
            <Text style={styles.summaryNumber}>
              ₱{getTotalRevenue().toFixed(2)}
            </Text>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
          </View>
        </View>

        {/* Payment Method Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method Breakdown</Text>

          {salesByPaymentMethod.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No sales data</Text>
              <Text style={styles.emptyStateSubtext}>
                Sales will appear here once transactions are made
              </Text>
            </View>
          ) : (
            salesByPaymentMethod.map((item, index) => {
              const percentage =
                getTotalRevenue() > 0
                  ? (
                      (parseFloat(item.total_amount) / getTotalRevenue()) *
                      100
                    ).toFixed(1)
                  : 0;

              return (
                <View key={index} style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <View
                      style={[
                        styles.paymentIconContainer,
                        {
                          backgroundColor:
                            getPaymentMethodColor(item.payment_method) + "20",
                        },
                      ]}
                    >
                      <Ionicons
                        name={getPaymentMethodIcon(item.payment_method)}
                        size={24}
                        color={getPaymentMethodColor(item.payment_method)}
                      />
                    </View>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentMethodName}>
                        {item.payment_method.charAt(0).toUpperCase() +
                          item.payment_method.slice(1)}
                      </Text>
                      <Text style={styles.paymentPercentage}>
                        {percentage}% of total
                      </Text>
                    </View>
                  </View>

                  <View style={styles.paymentStats}>
                    <View style={styles.paymentStatItem}>
                      <Text style={styles.paymentStatLabel}>Transactions</Text>
                      <Text style={styles.paymentStatValue}>
                        {item.transaction_count}
                      </Text>
                    </View>
                    <View style={styles.paymentStatDivider} />
                    <View style={styles.paymentStatItem}>
                      <Text style={styles.paymentStatLabel}>Total Amount</Text>
                      <Text style={styles.paymentStatValue}>
                        ₱{parseFloat(item.total_amount).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${percentage}%`,
                          backgroundColor: getPaymentMethodColor(
                            item.payment_method
                          ),
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Date Range Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Date Selection Tabs */}
            <View style={styles.dateTypeTabs}>
              <TouchableOpacity
                style={[
                  styles.dateTypeTab,
                  selectingDateType === "start" && styles.dateTypeTabActive,
                ]}
                onPress={() => setSelectingDateType("start")}
              >
                <Text
                  style={[
                    styles.dateTypeTabText,
                    selectingDateType === "start" &&
                      styles.dateTypeTabTextActive,
                  ]}
                >
                  Start Date
                </Text>
                {startDate && (
                  <Text style={styles.selectedDateText}>
                    {formatDisplayDate(startDate)}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateTypeTab,
                  selectingDateType === "end" && styles.dateTypeTabActive,
                ]}
                onPress={() => setSelectingDateType("end")}
              >
                <Text
                  style={[
                    styles.dateTypeTabText,
                    selectingDateType === "end" && styles.dateTypeTabTextActive,
                  ]}
                >
                  End Date
                </Text>
                {endDate && (
                  <Text style={styles.selectedDateText}>
                    {formatDisplayDate(endDate)}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Calendar */}
            <Calendar
              onDayPress={onDayPress}
              markedDates={getMarkedDates()}
              markingType="period"
              theme={{
                selectedDayBackgroundColor: "#007AFF",
                todayTextColor: "#007AFF",
                arrowColor: "#007AFF",
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
              style={styles.calendar}
            />

            <View style={styles.modalButtons}>
              {isCustomRange && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleResetToDefault}
                >
                  <Text style={styles.resetButtonText}>Reset to Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  (!startDate || !endDate) && styles.applyButtonDisabled,
                ]}
                onPress={handleApplyDateRange}
                disabled={!startDate || !endDate}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "#007AFF",
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  placeholder: {
    width: 60,
  },
  calendarButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  periodBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  periodText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    marginLeft: 8,
  },
  summaryContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  section: {
    marginTop: 8,
    backgroundColor: "#fff",
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 4,
    textAlign: "center",
  },
  paymentCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  paymentPercentage: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  paymentStats: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  paymentStatItem: {
    flex: 1,
    alignItems: "center",
  },
  paymentStatDivider: {
    width: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 8,
  },
  paymentStatLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  paymentStatValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  dateTypeTabs: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 10,
  },
  dateTypeTab: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },
  dateTypeTabActive: {
    backgroundColor: "#007AFF",
  },
  dateTypeTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  dateTypeTabTextActive: {
    color: "#fff",
  },
  selectedDateText: {
    fontSize: 12,
    color: "#fff",
    marginTop: 4,
  },
  calendar: {
    borderRadius: 8,
    marginBottom: 20,
  },
  dateInputContainer: {
    marginBottom: 20,
  },
  dateInputWrapper: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
  },
  modalButtons: {
    gap: 10,
  },
  applyButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  applyButtonDisabled: {
    backgroundColor: "#ccc",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resetButton: {
    backgroundColor: "#f0f0f0",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  resetButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
});
