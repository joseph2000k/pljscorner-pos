import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

// Directory for storing product images
const IMAGES_DIR = `${FileSystem.documentDirectory}product_images/`;

// Ensure images directory exists
export const ensureImagesDirExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }
};

// Resize and compress image
export const processImage = async (imageUri) => {
  try {
    // Resize image to max 800x800 while maintaining aspect ratio
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 800 } }], // Resize width to 800, height auto-scales
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // 70% quality JPEG
    );

    return manipulatedImage.uri;
  } catch (error) {
    console.error("Error processing image:", error);
    return imageUri; // Return original if processing fails
  }
};

// Save image to local storage
export const saveImage = async (imageUri, productId) => {
  try {
    await ensureImagesDirExists();

    // Process (resize/compress) the image first
    const processedUri = await processImage(imageUri);

    // Create unique filename based on product ID and timestamp
    const filename = `product_${productId}_${Date.now()}.jpg`;
    const destination = `${IMAGES_DIR}${filename}`;

    // Copy the processed image to our app directory
    await FileSystem.copyAsync({
      from: processedUri,
      to: destination,
    });

    return destination;
  } catch (error) {
    console.error("Error saving image:", error);
    throw error;
  }
};

// Delete image from local storage
export const deleteImage = async (imageUri) => {
  try {
    if (!imageUri) return;

    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(imageUri);
      console.log("Image deleted:", imageUri);
    }
  } catch (error) {
    console.error("Error deleting image:", error);
  }
};

// Get image info (size, etc.)
export const getImageInfo = async (imageUri) => {
  try {
    const info = await FileSystem.getInfoAsync(imageUri);
    return info;
  } catch (error) {
    console.error("Error getting image info:", error);
    return null;
  }
};

// Clean up orphaned images (images without associated products)
export const cleanupOrphanedImages = async (validImageUris) => {
  try {
    await ensureImagesDirExists();

    const files = await FileSystem.readDirectoryAsync(IMAGES_DIR);

    for (const file of files) {
      const filePath = `${IMAGES_DIR}${file}`;
      if (!validImageUris.includes(filePath)) {
        await FileSystem.deleteAsync(filePath);
        console.log("Cleaned up orphaned image:", filePath);
      }
    }
  } catch (error) {
    console.error("Error cleaning up images:", error);
  }
};
