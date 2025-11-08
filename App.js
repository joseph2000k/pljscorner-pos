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
  Image,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { CameraView, Camera } from "expo-camera";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import JSZip from "jszip";
import {
  initializeDatabase,
  getProductByQR,
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
  reopenDatabase,
} from "./src/services/database";
import { saveImage, deleteImage } from "./src/utils/imageStorage";
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
    qr: "",
    price: "",
    stock: "",
    category: "Food & Beverages",
    description: "",
    imageUri: null,
  });

  // Cart state
  const [cartItems, setCartItems] = useState([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [lastScannedQR, setLastScannedQR] = useState("");
  const [scanCooldown, setScanCooldown] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptHistory, setShowReceiptHistory] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [hideRevenue, setHideRevenue] = useState(true);
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

    // Prevent scanning the same qr repeatedly within 300ms
    if (data === lastScannedQR) {
      return;
    }

    setScanned(true);
    setScannedData(data);
    setLastScannedQR(data);
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
    } // Look up product by qr
    const product = getProductByQR(data);

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
        setLastScannedQR("");
      }, 300);
    } else {
      Alert.alert(
        "Product Not Found",
        `QR: ${data}\nProduct not in database.`,
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

  const addNewProduct = (qr) => {
    // Open the add product modal with the scanned qr pre-filled
    setNewProduct({
      name: "",
      qr: qr,
      price: "",
      stock: "",
      category: "General",
      description: "",
      imageUri: null,
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
      qr: "",
      price: "",
      stock: "",
      category: "Food & Beverages",
      description: "",
      imageUri: null,
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

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.qr) {
      Alert.alert("Error", "Please fill in name, qr, and price");
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

    try {
      // First add the product to get the ID
      const result = addProduct(
        newProduct.name,
        newProduct.qr,
        parseFloat(newProduct.price),
        parseInt(newProduct.stock) || 0,
        newProduct.category,
        newProduct.description,
        null // imageUri will be updated after saving
      );

      if (result.success) {
        // If there's an image, save it and update the product
        if (newProduct.imageUri) {
          try {
            const savedImageUri = await saveImage(
              newProduct.imageUri,
              result.id
            );
            // Update product with image URI
            await updateProduct(
              result.id,
              newProduct.name,
              newProduct.qr,
              parseFloat(newProduct.price),
              parseInt(newProduct.stock) || 0,
              newProduct.category,
              newProduct.description,
              savedImageUri
            );
          } catch (imageError) {
            console.error("Error saving image:", imageError);
            Alert.alert(
              "Warning",
              "Product added but image could not be saved."
            );
          }
        }

        Alert.alert("Success", "Product added successfully!");
        closeAddProductModal();
        loadDashboardData();
      } else {
        Alert.alert("Error", "Could not add product: " + result.error);
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred: " + error.message);
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
          onPress: async () => {
            try {
              // Delete the image first if it exists
              if (product.image_uri) {
                await deleteImage(product.image_uri);
              }

              const result = deleteProduct(product.id);
              if (result.success) {
                Alert.alert("Success", "Product deleted successfully!");
                loadDashboardData();
              } else {
                Alert.alert(
                  "Error",
                  "Could not delete product: " + result.error
                );
              }
            } catch (error) {
              console.error("Error deleting product:", error);
              Alert.alert(
                "Error",
                "An error occurred while deleting the product."
              );
            }
          },
        },
      ]
    );
  };

  const handleBackupDatabase = async () => {
    try {
      console.log("=== STARTING BACKUP ===");

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .split("T")[0];
      const timeString = new Date()
        .toLocaleTimeString()
        .replace(/:/g, "-")
        .replace(/ /g, "");

      // Step 1: Verify database exists
      const possiblePaths = [
        `${FileSystem.documentDirectory}SQLite/pos_database.db`,
        `${FileSystem.documentDirectory}pos_database.db`,
      ];

      let dbPath = null;
      let dbInfo = null;

      for (const path of possiblePaths) {
        console.log("Checking path:", path);
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists && info.size > 0) {
          dbPath = path;
          dbInfo = info;
          console.log("✓ Found database at:", path, "Size:", info.size);
          break;
        }
      }

      if (!dbPath || !dbInfo) {
        Alert.alert(
          "Database Not Found",
          "Could not find database file. Please add some products first."
        );
        return;
      }

      Alert.alert("Creating Backup", "Reading database and images...");

      // Step 2: Read database file
      console.log("Reading database from:", dbPath);
      const dbContent = await FileSystem.readAsStringAsync(dbPath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log("Database content length:", dbContent.length);

      if (dbContent.length === 0) {
        Alert.alert("Error", "Database file is empty!");
        return;
      }

      // Step 3: Create ZIP
      console.log("Creating ZIP archive...");
      const zip = new JSZip();

      // Add database
      zip.file("pos_database.db", dbContent, { base64: true });
      console.log("✓ Database added to ZIP");

      // Step 4: Add images
      const imagesDir = `${FileSystem.documentDirectory}product_images`;
      const imagesInfo = await FileSystem.getInfoAsync(imagesDir);

      let imageCount = 0;
      if (imagesInfo.exists) {
        const imageFiles = await FileSystem.readDirectoryAsync(imagesDir);
        console.log(`Found ${imageFiles.length} images`);

        if (imageFiles.length > 0) {
          const imagesFolder = zip.folder("product_images");

          for (const imageFile of imageFiles) {
            try {
              const imagePath = `${imagesDir}/${imageFile}`;
              const imageInfo = await FileSystem.getInfoAsync(imagePath);

              if (imageInfo.exists && imageInfo.size > 0) {
                const imageContent = await FileSystem.readAsStringAsync(
                  imagePath,
                  {
                    encoding: FileSystem.EncodingType.Base64,
                  }
                );
                imagesFolder.file(imageFile, imageContent, { base64: true });
                imageCount++;
              }
            } catch (err) {
              console.error(`Error adding image ${imageFile}:`, err.message);
            }
          }
          console.log(`✓ Added ${imageCount} images to ZIP`);
        }
      } else {
        console.log("No images directory found");
      }

      // Step 5: Add metadata
      const backupInfo = {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        productsCount: products.length,
        imagesCount: imageCount,
        databaseSize: dbInfo.size,
        platform: "Expo/React Native",
      };
      zip.file("backup_info.json", JSON.stringify(backupInfo, null, 2));
      console.log("✓ Metadata added");

      // Step 6: Generate ZIP
      console.log("Generating ZIP file...");
      Alert.alert("Creating Backup", "Compressing data...");

      const zipContent = await zip.generateAsync({
        type: "base64",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }, // Faster compression
      });

      console.log("ZIP generated, base64 length:", zipContent.length);

      // Step 7: Save ZIP
      const zipFileName = `pos_backup_${timestamp}_${timeString}.zip`;
      const zipPath = `${FileSystem.cacheDirectory}${zipFileName}`;

      console.log("Saving ZIP to:", zipPath);
      await FileSystem.writeAsStringAsync(zipPath, zipContent, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Step 8: Verify ZIP was created
      const zipInfo = await FileSystem.getInfoAsync(zipPath);
      console.log("ZIP file info:", zipInfo);

      if (!zipInfo.exists || zipInfo.size === 0) {
        Alert.alert("Error", "Failed to create backup file!");
        return;
      }

      console.log("=== BACKUP SUCCESSFUL ===");
      console.log("ZIP size:", zipInfo.size, "bytes");

      // Step 9: Share the file
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(zipPath, {
          dialogTitle: "Save Complete Backup",
          mimeType: "application/zip",
          UTI: "public.zip-archive",
        });

        Alert.alert(
          "✅ Backup Complete!",
          `Backup created successfully!\n\n` +
            `📦 File: ${zipFileName}\n` +
            `📊 Size: ${(zipInfo.size / 1024).toFixed(2)} KB\n` +
            `💾 Database: ${(dbInfo.size / 1024).toFixed(2)} KB\n` +
            `🛍️ Products: ${products.length}\n` +
            `🖼️ Images: ${imageCount}\n\n` +
            `Save this ZIP file in a safe place to restore your data later.`
        );
      } else {
        Alert.alert(
          "Backup Created",
          `Backup saved at:\n${zipPath}\n\nSize: ${(
            zipInfo.size / 1024
          ).toFixed(2)} KB`
        );
      }
    } catch (error) {
      console.error("=== BACKUP FAILED ===");
      console.error("Error:", error.message);
      console.error("Stack:", error.stack);
      Alert.alert(
        "Backup Failed",
        `Error: ${error.message}\n\nCheck the console for details.`
      );
    }
  };

  const handleRestoreBackup = async () => {
    Alert.alert(
      "Restore Backup",
      "Select your backup ZIP file. This will replace your current database and images.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Select Backup",
          onPress: async () => {
            try {
              console.log("Opening document picker for ZIP file...");

              // Pick the backup zip file - accept any file type
              const result = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: true,
              });

              console.log("Document picker result:", result);

              if (result.canceled) {
                console.log("User canceled file selection");
                return;
              }

              const selectedUri = result.assets[0].uri;
              const fileName = result.assets[0].name || "unknown";

              console.log("Selected file:", fileName);
              console.log("File URI:", selectedUri);

              // Check if it's a zip file
              if (!fileName.toLowerCase().endsWith(".zip")) {
                Alert.alert(
                  "Wrong File Type",
                  `Selected file: ${fileName}\n\nPlease select a .zip backup file created by this app.`
                );
                return;
              }

              Alert.alert(
                "Restoring...",
                "Please wait, this may take a moment..."
              );

              // Read the zip file
              console.log("Reading ZIP file as base64...");
              const zipContent = await FileSystem.readAsStringAsync(
                selectedUri,
                {
                  encoding: FileSystem.EncodingType.Base64,
                }
              );

              console.log(
                "ZIP content read successfully, length:",
                zipContent.length
              );

              if (zipContent.length === 0) {
                Alert.alert(
                  "Error",
                  "The backup file is empty or could not be read!"
                );
                return;
              }

              // Load and extract the zip
              console.log("Loading ZIP archive...");
              const zip = await JSZip.loadAsync(zipContent, { base64: true });

              console.log("ZIP loaded successfully!");
              const fileList = Object.keys(zip.files);
              console.log("Files in ZIP:", fileList);

              // 1. Check if backup_info.json exists
              let backupInfo = null;
              if (zip.files["backup_info.json"]) {
                try {
                  const infoContent = await zip.files["backup_info.json"].async(
                    "string"
                  );
                  backupInfo = JSON.parse(infoContent);
                  console.log("Backup info:", backupInfo);
                } catch (err) {
                  console.log("Could not read backup info:", err);
                }
              }

              // 2. Restore database
              if (!zip.files["pos_database.db"]) {
                Alert.alert(
                  "Invalid Backup",
                  `Database file not found in backup!\n\nFiles found: ${fileList.join(
                    ", "
                  )}`
                );
                return;
              }

              console.log("Extracting database...");
              const dbContent = await zip.files["pos_database.db"].async(
                "base64"
              );
              console.log(
                "Database extracted, base64 length:",
                dbContent.length
              );

              if (dbContent.length === 0) {
                Alert.alert("Error", "Database in backup is empty!");
                return;
              }

              // Ensure SQLite directory exists
              const sqliteDir = `${FileSystem.documentDirectory}SQLite`;
              console.log("SQLite directory:", sqliteDir);

              const sqliteDirInfo = await FileSystem.getInfoAsync(sqliteDir);
              if (!sqliteDirInfo.exists) {
                console.log("Creating SQLite directory...");
                await FileSystem.makeDirectoryAsync(sqliteDir, {
                  intermediates: true,
                });
              }

              const dbPath = `${sqliteDir}/pos_database.db`;
              console.log("Target database path:", dbPath);

              // Delete old database if exists
              const oldDbInfo = await FileSystem.getInfoAsync(dbPath);
              if (oldDbInfo.exists) {
                console.log("Deleting old database...");
                await FileSystem.deleteAsync(dbPath, { idempotent: true });
              }

              // Write the database file
              console.log("Writing new database file...");
              await FileSystem.writeAsStringAsync(dbPath, dbContent, {
                encoding: FileSystem.EncodingType.Base64,
              });

              // Verify the database was written
              const newDbInfo = await FileSystem.getInfoAsync(dbPath);
              console.log(
                "New database written:",
                newDbInfo.exists,
                "Size:",
                newDbInfo.size
              );

              if (!newDbInfo.exists || newDbInfo.size === 0) {
                Alert.alert("Error", "Failed to write database file!");
                return;
              }

              // Important: Close and reopen the database connection
              console.log("Reopening database connection...");
              try {
                reopenDatabase();
                console.log("Database connection reopened successfully");
              } catch (err) {
                console.error("Error reopening database:", err);
                Alert.alert(
                  "Warning",
                  "Database restored but connection could not be reopened. Please restart the app."
                );
                return;
              }

              // 3. Restore images
              console.log("Restoring images...");
              let restoredImages = 0;
              const imagesDir = `${FileSystem.documentDirectory}product_images`;

              // Clear existing images directory
              const imagesDirInfo = await FileSystem.getInfoAsync(imagesDir);
              if (imagesDirInfo.exists) {
                console.log("Clearing old images...");
                await FileSystem.deleteAsync(imagesDir, { idempotent: true });
              }

              // Create fresh images directory
              await FileSystem.makeDirectoryAsync(imagesDir, {
                intermediates: true,
              });

              // Extract all images from product_images folder in zip
              for (const filename in zip.files) {
                if (
                  filename.startsWith("product_images/") &&
                  !zip.files[filename].dir
                ) {
                  const imageName = filename.replace("product_images/", "");
                  console.log(`Extracting image: ${imageName}`);

                  const imageContent = await zip.files[filename].async(
                    "base64"
                  );
                  const imagePath = `${imagesDir}/${imageName}`;

                  await FileSystem.writeAsStringAsync(imagePath, imageContent, {
                    encoding: FileSystem.EncodingType.Base64,
                  });

                  restoredImages++;
                }
              }

              console.log(`Successfully restored ${restoredImages} images`);

              // 4. Reinitialize and reload
              console.log("Reinitializing database...");

              setTimeout(async () => {
                try {
                  await initializeDatabase();
                  console.log("Database reinitialized");

                  // Explicitly reload all data
                  console.log("Loading products...");
                  const allProducts = getAllProducts();
                  console.log(
                    `Found ${allProducts.length} products in restored database`
                  );
                  setProducts(allProducts);

                  console.log("Loading categories...");
                  const allCategories = getAllCategories();
                  setCategories(allCategories);

                  console.log("Loading dashboard stats...");
                  const stats = getDashboardStats();
                  setDashboardStats(stats);

                  // Clear cart and other state
                  setCartItems([]);
                  setScannedProduct(null);

                  console.log("=== RESTORE COMPLETE ===");
                  console.log("Dashboard data reloaded");

                  Alert.alert(
                    "✅ Restore Complete!",
                    `Your backup has been restored successfully!\n\n` +
                      `📦 Database: ✓ Restored\n` +
                      `🖼️ Images: ${restoredImages} restored\n` +
                      (backupInfo
                        ? `� Backup Date: ${new Date(
                            backupInfo.timestamp
                          ).toLocaleString()}\n`
                        : "") +
                      `\nAll data has been reloaded!`,
                    [
                      {
                        text: "OK",
                        onPress: () => {
                          setCurrentScreen("home");
                        },
                      },
                    ]
                  );
                } catch (err) {
                  console.error("Error reloading:", err);
                  Alert.alert(
                    "Restore Completed with Warning",
                    `Database and images were restored, but there was an error reloading:\n${err.message}\n\nPlease restart the app to see your restored data.`
                  );
                }
              }, 1000);
            } catch (error) {
              console.error("Restore error:", error);
              console.error("Error stack:", error.stack);
              Alert.alert(
                "Restore Failed",
                `An error occurred while restoring:\n\n${error.message}\n\nPlease check the console for more details.`
              );
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
      qr: product.qr,
      price: product.price.toString(),
      stock: product.stock_quantity.toString(),
      category: product.category || "Food & Beverages",
      description: product.description || "",
      imageUri: product.image_uri || null,
      originalImageUri: product.image_uri || null, // Keep track of original image
    });
    setShowEditProductModal(true);
  };

  const handleUpdateProduct = async () => {
    if (
      !editingProduct.name ||
      !editingProduct.price ||
      !editingProduct.stock
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      let finalImageUri = editingProduct.imageUri;

      // Handle image changes
      if (editingProduct.imageUri !== editingProduct.originalImageUri) {
        // If there's a new image (not from storage)
        if (
          editingProduct.imageUri &&
          !editingProduct.imageUri.includes("product_images")
        ) {
          // Save new image
          finalImageUri = await saveImage(
            editingProduct.imageUri,
            editingProduct.id
          );

          // Delete old image if it exists
          if (editingProduct.originalImageUri) {
            await deleteImage(editingProduct.originalImageUri);
          }
        } else if (
          !editingProduct.imageUri &&
          editingProduct.originalImageUri
        ) {
          // Image was removed
          await deleteImage(editingProduct.originalImageUri);
          finalImageUri = null;
        }
      }

      const result = updateProduct(
        editingProduct.id,
        editingProduct.name,
        editingProduct.qr,
        parseFloat(editingProduct.price),
        parseInt(editingProduct.stock),
        editingProduct.category,
        editingProduct.description,
        finalImageUri
      );

      if (result.success) {
        Alert.alert("Success", "Product updated successfully!");
        setShowEditProductModal(false);
        setEditingProduct(null);
        loadDashboardData();
      } else {
        Alert.alert("Error", "Could not update product: " + result.error);
      }
    } catch (error) {
      console.error("Error updating product:", error);
      Alert.alert(
        "Error",
        "An error occurred while updating the product: " + error.message
      );
    }
  };

  const handleResetDatabase = () => {
    Alert.alert(
      "Reset All Data",
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
            <Text style={styles.homeTitle}>PLJ's Corner</Text>
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
                  <Ionicons
                    name={hideRevenue ? "eye-outline" : "eye-off-outline"}
                    size={16}
                    color="#888"
                    style={styles.hideIcon}
                  />
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
              <View style={styles.buttonContent}>
                <Ionicons name="cart" size={24} color="#fff" />
                <Text style={styles.primaryButtonText}>Open POS</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.halfButton]}
                onPress={() => setCurrentScreen("products")}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="cube-outline" size={20} color="#007AFF" />
                  <Text style={styles.secondaryButtonText}>Products</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, styles.halfButton]}
                onPress={openAddProductModal}
              >
                <View style={styles.buttonContent}>
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color="#007AFF"
                  />
                  <Text style={styles.secondaryButtonText}>Add Product</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.halfButton]}
                onPress={() => setShowCategoriesModal(true)}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="pricetag-outline" size={20} color="#007AFF" />
                  <Text style={styles.secondaryButtonText}>Categories</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, styles.halfButton]}
                onPress={() => setShowReceiptHistory(true)}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="receipt-outline" size={20} color="#007AFF" />
                  <Text style={styles.secondaryButtonText}>History</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Clear Data Button */}
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleResetDatabase}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                <Text style={styles.dangerButtonText}>Clear All Data</Text>
              </View>
            </TouchableOpacity>
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
          <View style={styles.backupButtonsContainer}>
            <TouchableOpacity
              style={styles.backupButton}
              onPress={handleBackupDatabase}
            >
              <Ionicons
                name="cloud-download-outline"
                size={24}
                color="#4CAF50"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backupButton}
              onPress={handleRestoreBackup}
            >
              <Ionicons name="cloud-upload-outline" size={24} color="#FF9800" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.productsContent}>
          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No products found</Text>
              <Text style={styles.emptyStateSubtext}>
                Scan a qr to add products
              </Text>
            </View>
          ) : (
            products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => handleEditProduct(product)}
              >
                {product.image_uri && (
                  <Image
                    source={{ uri: product.image_uri }}
                    style={styles.productCardImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.productHeader}>
                  <Text style={styles.productCardName}>{product.name}</Text>
                  <Text style={styles.productCardPrice}>₱{product.price}</Text>
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
                      <Ionicons name="pencil" size={16} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteProduct(product)}
                    >
                      <Ionicons name="trash" size={16} color="#FF3B30" />
                    </TouchableOpacity>
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
          <View style={styles.cartBadgeContainer}>
            <Ionicons name="cart" size={24} color="#4CAF50" />
            {cartItems.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.posContainer}>
          {/* Scan Button */}
          <TouchableOpacity style={styles.scanButtonLarge} onPress={openCamera}>
            <View style={styles.buttonContent}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.scanButtonLargeText}>Scan Product</Text>
            </View>
          </TouchableOpacity>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products by name, qr, or category..."
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
                <Ionicons name="close-circle" size={20} color="#888" />
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
                    {product.image_uri && (
                      <Image
                        source={{ uri: product.image_uri }}
                        style={styles.searchResultImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>
                        {product.name}
                      </Text>
                      <Text style={styles.searchResultCategory}>
                        {product.category}
                      </Text>
                      <Text style={styles.searchResultQR}>
                        QR: {product.qr}
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
                    <View style={styles.cartItemRow}>
                      {item.image_uri && (
                        <Image
                          source={{ uri: item.image_uri }}
                          style={styles.cartItemImage}
                          resizeMode="cover"
                        />
                      )}
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemPrice}>
                          ₱{item.price.toFixed(2)} each
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cartItemControls}>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() =>
                            updateCartItemQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Ionicons name="remove" size={18} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() =>
                            updateCartItemQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Ionicons name="add" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.cartItemSubtotal}>
                        ₱{(item.price * item.quantity).toFixed(2)}
                      </Text>

                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeFromCart(item.id)}
                      >
                        <Ionicons name="close" size={18} color="#fff" />
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
                <View style={styles.discountTitleRow}>
                  <Ionicons name="pricetags" size={16} color="#4CAF50" />
                  <Text style={styles.discountTitle}>
                    Bulk Discounts Applied!
                  </Text>
                </View>
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

        <StatusBar style="dark" />
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
            <Text style={styles.instructionText}>Point camera at qr</Text>
          )}
        </View>

        <StatusBar style="dark" />
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
            qr: "",
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
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  dangerButton: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FF3B30",
    marginTop: 15,
  },
  dangerButtonText: {
    color: "#FF3B30",
    fontSize: 14,
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
  productCardImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#f0f0f0",
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
    color: "#333",
    flex: 1,
  },
  productCardPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
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
    color: "#333",
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
    backgroundColor: "#E3F2FD",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: {
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: "#FFEBEE",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    fontSize: 16,
  },

  // Camera Screen Styles
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
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
  backupButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  backupButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  placeholder: {
    width: 60, // Same width as back button for centering
  },
  cartBadgeContainer: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -5,
    right: 10,
    backgroundColor: "#f44336",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
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
    backgroundColor: "#fff",
    alignItems: "center",
    minHeight: 120,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  instructionText: {
    fontSize: 16,
    color: "#333",
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
    color: "#333",
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
    backgroundColor: "#f5f5f5",
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
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 15,
  },
  searchInput: {
    flex: 1,
    color: "#333",
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
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    overflow: "hidden",
  },
  searchResultsList: {
    padding: 10,
  },
  searchResultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchResultImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#f0f0f0",
  },
  searchResultInfo: {
    flex: 1,
    marginRight: 12,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  searchResultCategory: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  searchResultQR: {
    fontSize: 11,
    color: "#888",
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
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  noResultsText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: "#888",
  },
  cartSection: {
    flex: 1,
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
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
    color: "#333",
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
  cartItem: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cartItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cartItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#f0f0f0",
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
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
    backgroundColor: "#f0f0f0",
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
    color: "#333",
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
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  discountSection: {
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  discountTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  discountTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2e7d32",
  },
  discountItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  discountText: {
    fontSize: 12,
    color: "#333",
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
    color: "#333",
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
