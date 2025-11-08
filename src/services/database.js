import * as SQLite from "expo-sqlite";

// Open database
let db = SQLite.openDatabaseSync("pos_database.db");

// Function to close and reopen database (for restore operations)
export const reopenDatabase = () => {
  try {
    // Close existing connection if possible
    if (db && db.closeSync) {
      db.closeSync();
    }
  } catch (error) {
    console.log(
      "Note: Could not close database (may not be open):",
      error.message
    );
  }

  // Reopen database
  db = SQLite.openDatabaseSync("pos_database.db");
  console.log("Database connection reopened");
  return db;
};

// Initialize database tables
export const initializeDatabase = () => {
  try {
    // Create products table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        qr TEXT UNIQUE,
        price REAL NOT NULL,
        stock_quantity INTEGER DEFAULT 0,
        category TEXT,
        description TEXT,
        image_uri TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add image_uri column to existing products table if it doesn't exist
    try {
      db.execSync(`
        ALTER TABLE products ADD COLUMN image_uri TEXT;
      `);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migrate barcode column to qr if needed
    try {
      // Check if barcode column exists
      const tableInfo = db.getAllSync("PRAGMA table_info(products)");
      const hasBarcode = tableInfo.some((col) => col.name === "barcode");
      const hasQR = tableInfo.some((col) => col.name === "qr");

      if (hasBarcode && !hasQR) {
        // Rename barcode column to qr
        db.execSync(`
          ALTER TABLE products RENAME COLUMN barcode TO qr;
        `);
        console.log("Successfully migrated barcode column to qr");
      } else if (!hasBarcode && !hasQR) {
        // Add qr column if neither exists
        db.execSync(`
          ALTER TABLE products ADD COLUMN qr TEXT UNIQUE;
        `);
        console.log("Added qr column to products table");
      }
    } catch (error) {
      console.log("Migration note:", error.message);
    }

    // Create sales table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        customer_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create sale_items table (items in each sale)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      );
    `);

    // Create categories table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        bulk_discount_quantity INTEGER DEFAULT 0,
        bulk_discount_price REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add discount columns to existing categories table if they don't exist
    try {
      db.execSync(`
        ALTER TABLE categories ADD COLUMN bulk_discount_quantity INTEGER DEFAULT 0;
      `);
    } catch (error) {
      // Column already exists, ignore error
    }

    try {
      db.execSync(`
        ALTER TABLE categories ADD COLUMN bulk_discount_price REAL DEFAULT 0;
      `);
    } catch (error) {
      // Column already exists, ignore error
    }

    console.log("Database initialized successfully");

    // Insert default categories if they don't exist
    insertDefaultData();
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};

// Insert default data
const insertDefaultData = () => {
  try {
    // Insert default categories
    const defaultCategories = [
      "Food & Beverages",
      "Electronics",
      "Clothing",
      "Health & Beauty",
      "Home & Garden",
      "Books & Stationery",
      "Sports & Recreation",
    ];

    defaultCategories.forEach((category) => {
      try {
        db.runSync("INSERT OR IGNORE INTO categories (name) VALUES (?)", [
          category,
        ]);
      } catch (error) {
        // Ignore duplicate entries
      }
    });

    // Insert sample products
    const sampleProducts = [
      {
        name: "Coffee",
        qr: "1234567890123",
        price: 3.5,
        stock: 100,
        category: "Food & Beverages",
      },
      {
        name: "Laptop",
        qr: "9876543210987",
        price: 999.99,
        stock: 10,
        category: "Electronics",
      },
      {
        name: "T-Shirt",
        qr: "5555666677778",
        price: 19.99,
        stock: 50,
        category: "Clothing",
      },
    ];

    sampleProducts.forEach((product) => {
      try {
        db.runSync(
          "INSERT OR IGNORE INTO products (name, qr, price, stock_quantity, category) VALUES (?, ?, ?, ?, ?)",
          [
            product.name,
            product.qr,
            product.price,
            product.stock,
            product.category,
          ]
        );
      } catch (error) {
        // Ignore duplicate entries
      }
    });
  } catch (error) {
    console.error("Error inserting default data:", error);
  }
};

// Product operations
export const addProduct = (
  name,
  qr,
  price,
  stockQuantity,
  category,
  description = "",
  imageUri = null
) => {
  try {
    const result = db.runSync(
      "INSERT INTO products (name, qr, price, stock_quantity, category, description, image_uri) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, qr, price, stockQuantity, category, description, imageUri]
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error("Error adding product:", error);
    return { success: false, error: error.message };
  }
};

export const getProductByQR = (qr) => {
  try {
    const result = db.getFirstSync("SELECT * FROM products WHERE qr = ?", [qr]);
    return result;
  } catch (error) {
    console.error("Error getting product by qr:", error);
    return null;
  }
};

export const getAllProducts = () => {
  try {
    const result = db.getAllSync("SELECT * FROM products ORDER BY name");
    return result;
  } catch (error) {
    console.error("Error getting all products:", error);
    return [];
  }
};

export const updateProductStock = (productId, newStock) => {
  try {
    db.runSync(
      "UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newStock, productId]
    );
    return { success: true };
  } catch (error) {
    console.error("Error updating product stock:", error);
    return { success: false, error: error.message };
  }
};

// Sale operations
export const createSale = (
  totalAmount,
  paymentMethod = "cash",
  customerName = ""
) => {
  try {
    const result = db.runSync(
      "INSERT INTO sales (total_amount, payment_method, customer_name) VALUES (?, ?, ?)",
      [totalAmount, paymentMethod, customerName]
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error("Error creating sale:", error);
    return { success: false, error: error.message };
  }
};

export const addSaleItem = (
  saleId,
  productId,
  quantity,
  unitPrice,
  totalPrice
) => {
  try {
    db.runSync(
      "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)",
      [saleId, productId, quantity, unitPrice, totalPrice]
    );
    return { success: true };
  } catch (error) {
    console.error("Error adding sale item:", error);
    return { success: false, error: error.message };
  }
};

export const getAllSales = () => {
  try {
    const result = db.getAllSync(`
      SELECT s.*, 
             COUNT(si.id) as item_count,
             GROUP_CONCAT(p.name, ', ') as products
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    return result;
  } catch (error) {
    console.error("Error getting all sales:", error);
    return [];
  }
};

export const getSaleDetails = (saleId) => {
  try {
    const sale = db.getFirstSync("SELECT * FROM sales WHERE id = ?", [saleId]);
    const items = db.getAllSync(
      `
      SELECT si.*, p.name as product_name, p.qr, p.category
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `,
      [saleId]
    );

    return { sale, items };
  } catch (error) {
    console.error("Error getting sale details:", error);
    return { sale: null, items: [] };
  }
};

// Category operations
export const getAllCategories = () => {
  try {
    const result = db.getAllSync("SELECT * FROM categories ORDER BY name");
    return result;
  } catch (error) {
    console.error("Error getting categories:", error);
    return [];
  }
};

export const getCategoryByName = (name) => {
  try {
    const result = db.getFirstSync("SELECT * FROM categories WHERE name = ?", [
      name,
    ]);
    return result;
  } catch (error) {
    console.error("Error getting category by name:", error);
    return null;
  }
};

export const addCategory = (
  name,
  description = "",
  bulkDiscountQuantity = 0,
  bulkDiscountPrice = 0
) => {
  try {
    const result = db.runSync(
      "INSERT INTO categories (name, description, bulk_discount_quantity, bulk_discount_price) VALUES (?, ?, ?, ?)",
      [name, description, bulkDiscountQuantity, bulkDiscountPrice]
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error("Error adding category:", error);
    return { success: false, error: error.message };
  }
};

export const deleteCategory = (categoryId) => {
  try {
    // Check if category is being used by products
    const productsCount =
      db.getFirstSync(
        "SELECT COUNT(*) as count FROM products WHERE category = (SELECT name FROM categories WHERE id = ?)",
        [categoryId]
      )?.count || 0;

    if (productsCount > 0) {
      return {
        success: false,
        error: "Cannot delete category that is being used by products",
      };
    }

    db.runSync("DELETE FROM categories WHERE id = ?", [categoryId]);
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: error.message };
  }
};

// Dashboard/Analytics operations
export const getDashboardStats = () => {
  try {
    const totalProducts =
      db.getFirstSync("SELECT COUNT(*) as count FROM products")?.count || 0;
    const totalSales =
      db.getFirstSync("SELECT COUNT(*) as count FROM sales")?.count || 0;
    const totalRevenue =
      db.getFirstSync("SELECT SUM(total_amount) as total FROM sales")?.total ||
      0;
    const lowStockProducts =
      db.getFirstSync(
        "SELECT COUNT(*) as count FROM products WHERE stock_quantity < 10"
      )?.count || 0;

    return {
      totalProducts,
      totalSales,
      totalRevenue: parseFloat(totalRevenue).toFixed(2),
      lowStockProducts,
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    return {
      totalProducts: 0,
      totalSales: 0,
      totalRevenue: "0.00",
      lowStockProducts: 0,
    };
  }
};

export const deleteProduct = (productId) => {
  try {
    // Check if product exists in any sales first
    const salesCount =
      db.getFirstSync(
        "SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?",
        [productId]
      )?.count || 0;

    if (salesCount > 0) {
      return {
        success: false,
        error: "Cannot delete product that has sales history",
      };
    }

    db.runSync("DELETE FROM products WHERE id = ?", [productId]);
    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: error.message };
  }
};

export const updateProduct = (
  productId,
  name,
  qr,
  price,
  stockQuantity,
  category,
  description = "",
  imageUri = null
) => {
  try {
    db.runSync(
      "UPDATE products SET name = ?, qr = ?, price = ?, stock_quantity = ?, category = ?, description = ?, image_uri = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [
        name,
        qr,
        price,
        stockQuantity,
        category,
        description,
        imageUri,
        productId,
      ]
    );
    return { success: true };
  } catch (error) {
    console.error("Error updating product:", error);
    return { success: false, error: error.message };
  }
};

// Search operations
export const searchProducts = (searchTerm) => {
  try {
    const result = db.getAllSync(
      "SELECT * FROM products WHERE name LIKE ? OR qr LIKE ? OR category LIKE ? ORDER BY name",
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
    );
    return result;
  } catch (error) {
    console.error("Error searching products:", error);
    return [];
  }
};

// Reset database (DEV ONLY - clears all data)
export const resetDatabase = () => {
  try {
    // Drop all tables
    db.execSync(`DROP TABLE IF EXISTS sale_items;`);
    db.execSync(`DROP TABLE IF EXISTS sales;`);
    db.execSync(`DROP TABLE IF EXISTS products;`);
    db.execSync(`DROP TABLE IF EXISTS categories;`);

    // Recreate tables
    initializeDatabase();

    console.log("Database reset successfully");
    return { success: true };
  } catch (error) {
    console.error("Error resetting database:", error);
    return { success: false, error: error.message };
  }
};
