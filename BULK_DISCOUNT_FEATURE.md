# Bulk Discount Feature Documentation

## Overview
The bulk discount feature allows you to set special pricing when customers buy multiple items from the same category. This encourages bulk purchases and provides automatic discounts at checkout.

## How It Works

### Setting Up Bulk Discounts

1. **Navigate to Categories**
   - From home screen, tap "🏷️ Categories"
   - Tap "New" to add a category

2. **Configure Discount**
   - Enter Category Name (required)
   - Enter Description (optional)
   - In the "💰 Bulk Discount" section:
     - **Quantity**: Number of items needed to qualify for discount
     - **Total Price**: Discounted price for that quantity

### Example Scenario

**Setup:**
- Category: "Sticker Sheets"
- Regular item price: ₱35 each
- Bulk discount quantity: 3
- Bulk discount price: ₱100

**Customer Purchase:**
- Customer buys 3 sticker sheets
- Regular price would be: 3 × ₱35 = ₱105
- With bulk discount: ₱100
- **Savings: ₱5**

### How Discounts Are Applied

1. **Category-Based**: Discounts apply to all items in the same category
2. **Automatic Calculation**: System automatically detects qualifying purchases
3. **Multiple Sets**: If customer buys 6 items (2 sets of 3), they get 2× the discount
4. **Remaining Items**: Extra items are charged at regular price

### Advanced Example

**Setup:**
- Category: "Notebooks"
- Regular price: ₱25 each
- Bulk: Buy 5 for ₱100

**Customer buys 12 notebooks:**
- 2 complete sets: 2 × 5 = 10 notebooks @ ₱100 per set = ₱200
- Remaining 2 notebooks: 2 × ₱25 = ₱50
- **Total: ₱250** (instead of ₱300)
- **Savings: ₱50**

## Features

### In Categories Modal
✅ Easy-to-use discount input fields
✅ Real-time validation
✅ Example calculation shown
✅ Visual discount badge on category cards
✅ Clear explanations of how it works

### In Cart/Checkout
✅ Automatic discount calculation
✅ Shows applied bulk discounts
✅ Displays savings amount
✅ Works with all payment methods
✅ Itemized in receipts

### Discount Display
When bulk discounts are active, the cart shows:
```
💰 Bulk Discounts Applied!
Sticker Sheets: 1 set(s) of 3 @ ₱100
Save: ₱5.00
```

## Business Rules

1. **Both Fields Required**: Must enter both quantity and price, or leave both empty
2. **Positive Values Only**: Cannot enter negative numbers
3. **Category-Wide**: Applies to ALL products in that category
4. **Mix and Match**: Different products in same category count toward discount
5. **No Partial Discounts**: Must meet minimum quantity to qualify

## Database Schema

### Categories Table (Updated)
```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  bulk_discount_quantity INTEGER DEFAULT 0,
  bulk_discount_price REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Functions

### `addCategory(name, description, bulkDiscountQuantity, bulkDiscountPrice)`
Creates a new category with optional bulk discount.

**Parameters:**
- `name` (string) - Category name (required)
- `description` (string) - Category description (optional)
- `bulkDiscountQuantity` (number) - Items needed for discount (default: 0)
- `bulkDiscountPrice` (number) - Discounted total price (default: 0)

**Returns:**
```javascript
{ success: true, id: 123 }
// or
{ success: false, error: "error message" }
```

### `getCategoryByName(name)`
Retrieves category information including discount settings.

**Returns:**
```javascript
{
  id: 1,
  name: "Sticker Sheets",
  description: "Vinyl stickers",
  bulk_discount_quantity: 3,
  bulk_discount_price: 100,
  created_at: "2025-11-04T..."
}
```

## Calculation Logic

The cart total is calculated as follows:

1. **Group items by category**
2. **For each category:**
   - Check if bulk discount exists
   - Calculate total quantity in that category
   - Determine how many "bulk sets" qualify
   - Apply bulk price to full sets
   - Charge regular price for remaining items
3. **Sum all categories**

### Code Example
```javascript
// 3 items @ ₱35 each, bulk: 3 for ₱100
totalQuantity = 3
bulkSets = Math.floor(3 / 3) = 1
remainingItems = 3 % 3 = 0

categoryTotal = (1 × ₱100) + (0 × ₱35) = ₱100
```

## UI Components Updated

### 1. CategoriesModal.js
- Added bulk discount input fields
- Added discount validation
- Added discount badge on category cards
- Added example calculation helper

### 2. CartComponent.js
- Added `getDiscountInfo()` function
- Added discount display section
- Shows savings amount
- Updated to use ₱ symbol

### 3. useCart.js (hook)
- Updated `calculateCartTotal()` with discount logic
- Imports `getCategoryByName` from database
- Handles multiple categories with different discounts

## Tips for Using Bulk Discounts

### Best Practices:
1. **Set realistic quantities** - Make it achievable for customers
2. **Clear savings** - Ensure discount is noticeable (5-15% off)
3. **Round numbers** - Use prices like ₱100, ₱500 for easy math
4. **Test calculations** - Verify discount math before going live

### Common Use Cases:
- **"Buy 3, Save ₱X"** - Classic bulk pricing
- **"Half Dozen Deals"** - 6 items at special price
- **"Dozen Discount"** - 12 items discounted
- **"Multi-pack Savings"** - Encourage larger purchases

### Not Recommended:
- Very high quantities (customers won't buy that many)
- Complex pricing that's hard to calculate mentally
- Discounts less than 5% (not motivating enough)

## Troubleshooting

### Discount Not Applying?
✓ Check both quantity AND price are set
✓ Ensure products have correct category assigned
✓ Verify minimum quantity is met in cart

### Wrong Calculation?
✓ Check if products are in same category
✓ Verify category discount settings
✓ Review console logs for calculation details

### Can't Save Category?
✓ Both discount fields must be filled or both empty
✓ Values must be positive numbers
✓ Category name must be unique

## Future Enhancements

Potential improvements:
- 📊 Discount analytics (most popular discounts)
- ⏰ Time-limited bulk discounts
- 👥 Customer-specific bulk pricing tiers
- 📱 Push notifications for bulk deals
- 🎯 Targeted promotions
- 📈 A/B testing different discount levels
- 🏷️ Multiple discount tiers (buy 3 OR buy 6)
- 🎁 Bundle deals (specific product combinations)

## Version History

- **v1.0** - Initial bulk discount implementation
  - Category-based bulk pricing
  - Automatic cart calculation
  - Visual discount indicators
  - Database schema updates
