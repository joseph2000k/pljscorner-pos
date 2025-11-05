# Product Images Feature

## Overview

Added comprehensive image support for products, allowing users to add, view, update, and delete product images. Images are automatically resized and stored in local storage.

## Features

### 1. **Add Product Images**

- Choose from photo library or take a new photo
- Images are automatically resized to max 800px width
- Compressed to 70% JPEG quality to save storage space
- Square aspect ratio (1:1) for consistent display

### 2. **Image Storage**

- Images stored in app's local document directory: `product_images/`
- Filename format: `product_{productId}_{timestamp}.jpg`
- Automatic directory creation on first use
- Persistent storage across app restarts

### 3. **Automatic Image Optimization**

- Large images automatically resized to 800x800px max
- Maintains aspect ratio during resize
- Compressed to 70% quality JPEG
- Significantly reduces storage space and improves performance

### 4. **Image Management**

- **Add Image**: Tap the image placeholder when adding/editing products
- **Change Image**: Replace existing image with new one
- **Remove Image**: Delete image from product
- **Auto-delete**: Images automatically deleted when products are deleted
- **Update handling**: Old image deleted when replaced with new one

### 5. **Image Display**

- **Product List**: Shows full-width image at top of each product card (150px height)
- **Search Results**: Shows thumbnail image (60x60px) next to product info
- **Add/Edit Modal**: Full preview of selected image (200px height)

## Technical Implementation

### New Dependencies

```json
{
  "expo-image-picker": "~15.0.7",
  "expo-file-system": "~18.0.8",
  "expo-image-manipulator": "~13.0.7"
}
```

### Database Changes

- Added `image_uri TEXT` column to `products` table
- Stores local file path to product image
- Nullable (products can exist without images)

### New Files Created

#### `/src/utils/imageStorage.js`

Utility functions for image management:

- `ensureImagesDirExists()` - Creates image directory if needed
- `processImage(uri)` - Resizes and compresses images
- `saveImage(uri, productId)` - Saves processed image to storage
- `deleteImage(uri)` - Removes image from storage
- `getImageInfo(uri)` - Gets image file information
- `cleanupOrphanedImages(validUris)` - Removes unused images

### Modified Files

#### `src/services/database.js`

- Updated `initializeDatabase()` - Added image_uri column
- Updated `addProduct()` - Accepts imageUri parameter
- Updated `updateProduct()` - Accepts imageUri parameter

#### `src/components/AddProductModal.js`

- Added image picker functionality
- Camera permission handling
- Photo library permission handling
- Image preview display
- Change/Remove image buttons

#### `App.js`

- Updated state management to include imageUri
- Modified `handleAddProduct()` - Saves image after product creation
- Modified `handleUpdateProduct()` - Handles image changes
- Modified `handleDeleteProduct()` - Deletes image when product deleted
- Added image display in product cards
- Added image display in search results

## User Workflow

### Adding Product with Image

1. Open "Add Product" modal
2. Tap on "Add Product Image" placeholder
3. Choose "Take Photo" or "Choose from Library"
4. Grant camera/photo library permission if prompted
5. Select or take photo
6. Crop to square (optional, based on allowsEditing)
7. Image appears in preview
8. Fill in other product details
9. Tap "Save"
10. Image is automatically resized, compressed, and saved

### Editing Product Image

1. Open product for editing
2. Existing image displays (if any)
3. Tap "Change Image" to replace
4. Or tap "Remove" to delete image
5. Tap "Update" to save changes
6. Old image automatically deleted if replaced

### Deleting Product with Image

1. Delete product as normal
2. Associated image automatically deleted from storage
3. No orphaned files left behind

## Permissions Required

### iOS

Add to `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "This app needs access to your photo library to add product images.",
        "NSCameraUsageDescription": "This app needs access to your camera to take product photos."
      }
    }
  }
}
```

### Android

Permissions automatically handled by Expo

## Storage Management

### Image Storage Location

```
{documentDirectory}/product_images/
  ├── product_1_1699123456789.jpg
  ├── product_2_1699123457890.jpg
  └── product_3_1699123458901.jpg
```

### Storage Optimization

- Original images can be several MB
- Resized to 800px max: ~100-300KB per image
- 70% JPEG compression reduces file size further
- Typical image: 150-250KB after processing

### Cleanup Strategy

- Images deleted when products deleted
- No manual cleanup needed
- `cleanupOrphanedImages()` function available if needed

## UI/UX Details

### Product Card Image

- Full-width display
- 150px fixed height
- Rounded corners (8px)
- Cover resize mode (fills area, crops if needed)
- Dark background when loading

### Search Result Image

- 60x60px thumbnail
- Rounded corners (8px)
- Positioned left of product info
- Only shows if image exists

### Add/Edit Modal Image

- Full-width preview (200px height)
- Rounded corners (12px)
- Two-button layout: "Change Image" | "Remove"
- Placeholder with dashed border when no image
- Camera icon and helpful text

## Error Handling

### Permission Denied

- Shows alert: "Permission Required"
- Explains why permission needed
- User can try again or skip

### Image Save Failed

- Product still saved
- Warning alert shown
- User can edit product later to add image

### Image Delete Failed

- Logged to console
- Doesn't prevent product deletion
- Orphaned file can be cleaned up later

## Best Practices

### For Users

1. Take clear, well-lit photos
2. Center product in frame
3. Use square aspect for best results
4. Avoid very large images (will be resized anyway)

### For Developers

1. Always check if image_uri exists before displaying
2. Use try-catch around image operations
3. Delete old images before saving new ones
4. Maintain originalImageUri when editing

## Future Enhancements

### Potential Features

- Multiple images per product
- Image zoom/preview in full screen
- Image gallery for products
- Cloud backup of images
- Share product images
- Barcode scanner integration with image capture
- Bulk image import
- Image editing (filters, crop, rotate)

### Performance Improvements

- Lazy loading of images
- Image caching
- Thumbnail generation
- Progressive image loading

## Troubleshooting

### Images Not Showing

1. Check image_uri is saved in database
2. Verify file exists at uri path
3. Check file permissions
4. Ensure Image component imported

### Images Too Large

- Already handled by automatic resize
- Max 800px width enforced
- 70% compression applied

### Storage Full

- Monitor app storage usage
- Delete unused products
- Consider cleanup function for orphaned images

## Testing Checklist

- ✅ Add product with image
- ✅ Add product without image
- ✅ Edit product to add image
- ✅ Edit product to change image
- ✅ Edit product to remove image
- ✅ Delete product with image
- ✅ Image displayed in product list
- ✅ Image displayed in search results
- ✅ Image displayed in edit modal
- ✅ Automatic image resize works
- ✅ Old image deleted when replaced
- ✅ Image deleted when product deleted
- ✅ Permission requests work (camera & library)
- ✅ Error handling works gracefully
