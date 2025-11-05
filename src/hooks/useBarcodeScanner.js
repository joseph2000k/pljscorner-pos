import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { getProductByBarcode } from "../services/database";

export const useBarcodeScanner = (addToCart, onProductNotFound) => {
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState("");
  const [lastScannedBarcode, setLastScannedBarcode] = useState("");
  const [scanCooldown, setScanCooldown] = useState(false);

  // Initialize audio mode
  useEffect(() => {
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.log("Error initializing audio:", error);
      }
    };
    initAudio();
  }, []);

  const playBeep = async () => {
    console.log("=== BEEP FUNCTION CALLED ===");
    
    try {
      console.log("playBeep function called");
      
      // Trigger haptic feedback FIRST (most reliable)
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log("Haptic feedback SUCCESS");
      } catch (hapticError) {
        console.log("Haptic feedback FAILED:", hapticError);
      }
      
      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log("Audio mode set successfully");

      // Try to create and play beep sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRQ0PVKzn77BgGQc+ltryy3oxBSd+zPLaizsIHG7A7+OZRQ0PVKzn77BgGQc+ltryy3oxBSd+zPLaizsI' },
        { shouldPlay: true, volume: 1.0 }
      );

      console.log("Sound created and should be playing");

      // Auto unload after a short delay
      setTimeout(() => {
        sound.unloadAsync();
        console.log("Sound unloaded");
      }, 1000);

    } catch (error) {
      console.log("Error playing beep sound:", error);
      
      // Alternative approach using Expo's haptic feedback as audio backup
      try {
        // If we can't play audio, at least provide haptic feedback on supported devices
        console.log("Attempting haptic feedback as backup");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (hapticError) {
        console.log("Haptic feedback also failed:", hapticError);
      }
    }
  };

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

    // Play beep sound
    console.log("Attempting to play beep sound...");
    playBeep();

    // Look up product by barcode
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
                if (onProductNotFound) {
                  onProductNotFound();
                }
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
        ]
      );
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
