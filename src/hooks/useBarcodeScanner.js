import { useState } from "react";
import { Alert } from "react-native";
import { getProductByBarcode } from "../services/database";

export const useBarcodeScanner = (addToCart, onProductNotFound) => {
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState("");
  const [lastScannedBarcode, setLastScannedBarcode] = useState("");
  const [scanCooldown, setScanCooldown] = useState(false);

  const handleBarCodeScanned = ({ type, data }) => {
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

    // Look up product by barcode
    const product = getProductByBarcode(data);

    if (product) {
      // Check stock availability
      if (product.stock_quantity <= 0) {
        Alert.alert("Out of Stock", `${product.name} is currently out of stock.`, [
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
              if (onProductNotFound) {
                onProductNotFound();
              }
              setScanCooldown(false);
            },
          },
        ]);
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
      Alert.alert("Product Not Found", `Barcode: ${data}\nProduct not in database.`, [
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
            if (onProductNotFound) {
              onProductNotFound(data);
            }
            setScanCooldown(false);
          },
        },
        {
          text: "Back to POS",
          onPress: () => {
            if (onProductNotFound) {
              onProductNotFound();
            }
            setScanCooldown(false);
          },
        },
      ]);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScannedData("");
    setScanCooldown(false);
  };

  return {
    scanned,
    scannedData,
    handleBarCodeScanned,
    resetScanner,
  };
};
