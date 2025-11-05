# Search Feature in POS Mode

## Overview

Added a real-time search functionality in POS mode that allows users to search for products and add them directly to the cart.

## Features

### 1. **Search Bar**

- Located below the "Scan Product" button in POS mode
- Search as you type - results appear immediately
- Placeholder text: "Search products by name, barcode, or category..."
- Clear button (✕) appears when search query is entered

### 2. **Real-Time Search Results**

- Products are filtered based on:
  - Product name
  - Barcode
  - Category
- Results display in a scrollable list (max height: 250px)
- Each result shows:
  - Product name (bold, white)
  - Category (gray, small)
  - Barcode (darker gray, smaller)
  - Price (green, bold)
  - Stock quantity (with color indicator: red if < 10, gray otherwise)
  - "Tap to add" hint (blue, italic)

### 3. **Adding Products to Cart**

- Simply tap on any search result to add it to cart
- Stock validation is performed:
  - Shows alert if product is out of stock
  - Prevents adding out-of-stock items
- Search automatically clears after adding a product
- Product is added with quantity 1 (can be adjusted in cart)

### 4. **No Results Message**

- Displays when search query returns no matches
- Shows "No products found" with suggestion to "Try a different search term"

## Technical Implementation

### New State Variables

```javascript
const [searchQuery, setSearchQuery] = useState("");
const [searchResults, setSearchResults] = useState([]);
const [showSearchResults, setShowSearchResults] = useState(false);
```

### New Functions

1. **`handleSearch(query)`**

   - Triggered on every keystroke
   - Calls `searchProducts()` from database service
   - Updates search results state
   - Shows/hides results based on query length

2. **`handleAddFromSearch(product)`**
   - Validates stock availability
   - Adds product to cart using existing `addToCart()` function
   - Clears search UI after adding

### Database Integration

- Uses existing `searchProducts(searchTerm)` function from `database.js`
- Searches across name, barcode, and category fields
- Returns array of matching products

## User Experience

### Workflow

1. User opens POS mode
2. Types in search bar (e.g., "coffee")
3. Results appear immediately below search bar
4. User taps desired product
5. Product is added to cart
6. Search clears automatically
7. User can continue shopping

### Benefits

- Faster than scanning for known products
- Useful when barcode is damaged or unavailable
- Easy browsing of product catalog
- Reduced errors from manual barcode entry

## UI/UX Details

### Styling

- Dark theme consistent with POS mode
- Search bar: Dark background (#1a1a1a) with subtle border
- Results container: Rounded corners, max height to prevent overflow
- Each result item: Clickable card with hover-like appearance
- Color coding: Green for price, red for low stock

### Accessibility

- Clear visual feedback (borders, colors)
- Large touch targets for mobile use
- Scrollable results for many matches
- Empty state messaging

## Future Enhancements

- Add search history
- Implement autocomplete suggestions
- Add filters (by category, price range)
- Show product images in results
- Keyboard shortcuts for power users
