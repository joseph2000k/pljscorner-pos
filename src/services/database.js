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
        amount_paid REAL DEFAULT 0,
        change_amount REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create sale_items table (items in each sale)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER,
        product_name TEXT NOT NULL,
        product_qr TEXT,
        product_category TEXT,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales (id)
      );
    `);

    // Add product details columns to existing sale_items table if they don't exist
    try {
      db.execSync(`
        ALTER TABLE sale_items ADD COLUMN product_name TEXT;
      `);
    } catch (error) {
      // Column already exists, ignore error
    }

    try {
      db.execSync(`
        ALTER TABLE sale_items ADD COLUMN product_qr TEXT;
      `);
    } catch (error) {
      // Column already exists, ignore error
    }

    try {
      db.execSync(`
        ALTER TABLE sale_items ADD COLUMN product_category TEXT;
      `);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migrate existing sale_items data to include product details
    try {
      db.execSync(`
        UPDATE sale_items 
        SET product_name = (SELECT name FROM products WHERE products.id = sale_items.product_id),
            product_qr = (SELECT qr FROM products WHERE products.id = sale_items.product_id),
            product_category = (SELECT category FROM products WHERE products.id = sale_items.product_id)
        WHERE product_name IS NULL;
      `);
    } catch (error) {
      // Migration not needed or already done
    }

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

    // Add payment details columns to existing sales table if they don't exist
    try {
      db.execSync(`
        ALTER TABLE sales ADD COLUMN amount_paid REAL DEFAULT 0;
      `);
    } catch (error) {
      // Column already exists, ignore error
    }

    try {
      db.execSync(`
        ALTER TABLE sales ADD COLUMN change_amount REAL DEFAULT 0;
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
    // No default categories - users can add their own categories
    console.log("Database ready - no default data inserted");
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
  customerName = "",
  amountPaid = 0,
  changeAmount = 0
) => {
  try {
    const result = db.runSync(
      "INSERT INTO sales (total_amount, payment_method, customer_name, amount_paid, change_amount) VALUES (?, ?, ?, ?, ?)",
      [totalAmount, paymentMethod, customerName, amountPaid, changeAmount]
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
    // Get product details to store with the sale item
    const product = db.getFirstSync(
      "SELECT name, qr, category FROM products WHERE id = ?",
      [productId]
    );

    db.runSync(
      "INSERT INTO sale_items (sale_id, product_id, product_name, product_qr, product_category, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        saleId,
        productId,
        product?.name || "Unknown Product",
        product?.qr || "",
        product?.category || "General",
        quantity,
        unitPrice,
        totalPrice,
      ]
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
             GROUP_CONCAT(COALESCE(si.product_name, p.name, 'Unknown'), ', ') as products
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
      SELECT si.*, 
             COALESCE(si.product_name, p.name, 'Unknown Product') as product_name,
             COALESCE(si.product_qr, p.qr, '') as qr,
             COALESCE(si.product_category, p.category, 'General') as category
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
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

// Get sales data grouped by date for charts (last 7 days)
export const getSalesChartData = (days = 7) => {
  try {
    const result = db.getAllSync(
      `
      SELECT 
        DATE(created_at, 'localtime') as date,
        COUNT(*) as count,
        SUM(total_amount) as revenue
      FROM sales
      WHERE DATE(created_at, 'localtime') >= DATE('now', 'localtime', '-' || ? || ' days')
      GROUP BY DATE(created_at, 'localtime')
      ORDER BY date ASC
    `,
      [days]
    );
    return result;
  } catch (error) {
    console.error("Error getting sales chart data:", error);
    return [];
  }
};

// Get sales data grouped by hour for today
export const getSalesChartDataByHour = () => {
  try {
    const result = db.getAllSync(
      `
      SELECT 
        strftime('%H', created_at, 'localtime') as hour,
        COUNT(*) as count,
        SUM(total_amount) as revenue
      FROM sales
      WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')
      GROUP BY strftime('%H', created_at, 'localtime')
      ORDER BY hour ASC
    `
    );
    return result;
  } catch (error) {
    console.error("Error getting sales chart data by hour:", error);
    return [];
  }
};

// Get sales data grouped by month (last 12 months)
export const getSalesChartDataByMonth = () => {
  try {
    const result = db.getAllSync(
      `
      SELECT 
        strftime('%Y-%m', created_at, 'localtime') as month,
        COUNT(*) as count,
        SUM(total_amount) as revenue
      FROM sales
      WHERE DATE(created_at, 'localtime') >= DATE('now', 'localtime', '-12 months')
      GROUP BY strftime('%Y-%m', created_at, 'localtime')
      ORDER BY month ASC
    `
    );
    return result;
  } catch (error) {
    console.error("Error getting sales chart data by month:", error);
    return [];
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

export const updateCategory = (
  categoryId,
  name,
  description = "",
  bulkDiscountQuantity = 0,
  bulkDiscountPrice = 0
) => {
  try {
    db.runSync(
      "UPDATE categories SET name = ?, description = ?, bulk_discount_quantity = ?, bulk_discount_price = ? WHERE id = ?",
      [name, description, bulkDiscountQuantity, bulkDiscountPrice, categoryId]
    );
    return { success: true };
  } catch (error) {
    console.error("Error updating category:", error);
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
export const getDashboardStats = (
  revenuePeriod = "daily",
  lowStockThreshold = 10
) => {
  try {
    const totalProducts =
      db.getFirstSync("SELECT COUNT(*) as count FROM products")?.count || 0;

    // Calculate sales count and revenue based on selected period
    let salesQuery;
    let revenueQuery;

    switch (revenuePeriod) {
      case "daily":
        salesQuery = `
          SELECT COUNT(*) as count FROM sales 
          WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')
        `;
        revenueQuery = `
          SELECT SUM(total_amount) as total FROM sales 
          WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')
        `;
        break;
      case "weekly":
        salesQuery = `
          SELECT COUNT(*) as count FROM sales 
          WHERE DATE(created_at, 'localtime') >= DATE('now', 'localtime', '-7 days')
        `;
        revenueQuery = `
          SELECT SUM(total_amount) as total FROM sales 
          WHERE DATE(created_at, 'localtime') >= DATE('now', 'localtime', '-7 days')
        `;
        break;
      case "monthly":
        salesQuery = `
          SELECT COUNT(*) as count FROM sales 
          WHERE strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
        `;
        revenueQuery = `
          SELECT SUM(total_amount) as total FROM sales 
          WHERE strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
        `;
        break;
      case "yearly":
        salesQuery = `
          SELECT COUNT(*) as count FROM sales 
          WHERE strftime('%Y', created_at, 'localtime') = strftime('%Y', 'now', 'localtime')
        `;
        revenueQuery = `
          SELECT SUM(total_amount) as total FROM sales 
          WHERE strftime('%Y', created_at, 'localtime') = strftime('%Y', 'now', 'localtime')
        `;
        break;
      default:
        salesQuery = "SELECT COUNT(*) as count FROM sales";
        revenueQuery = "SELECT SUM(total_amount) as total FROM sales";
    }

    const totalSales = db.getFirstSync(salesQuery)?.count || 0;
    const totalRevenue = db.getFirstSync(revenueQuery)?.total || 0;

    const lowStockProducts =
      db.getFirstSync(
        "SELECT COUNT(*) as count FROM products WHERE stock_quantity < ?",
        [lowStockThreshold]
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

// Get sales report by payment method
export const getSalesByPaymentMethod = (period = "daily") => {
  try {
    let timeFilter = "";

    switch (period) {
      case "daily":
        timeFilter =
          "WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')";
        break;
      case "weekly":
        timeFilter =
          "WHERE DATE(created_at, 'localtime') >= DATE('now', 'localtime', '-7 days')";
        break;
      case "monthly":
        timeFilter =
          "WHERE strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')";
        break;
      case "yearly":
        timeFilter =
          "WHERE strftime('%Y', created_at, 'localtime') = strftime('%Y', 'now', 'localtime')";
        break;
      default:
        timeFilter = "";
    }

    const result = db.getAllSync(
      `
      SELECT 
        payment_method,
        COUNT(*) as transaction_count,
        SUM(total_amount) as total_amount
      FROM sales
      ${timeFilter}
      GROUP BY payment_method
      ORDER BY payment_method
      `
    );

    return result;
  } catch (error) {
    console.error("Error getting sales by payment method:", error);
    return [];
  }
};

// Get detailed sales data by date range for export
export const getSalesByDateRange = (startDate, endDate) => {
  try {
    const result = db.getAllSync(
      `
      SELECT 
        s.id as sale_id,
        s.created_at,
        s.payment_method,
        s.total_amount,
        s.customer_name,
        s.amount_paid,
        s.change_amount,
        si.product_id,
        COALESCE(si.product_name, p.name, 'Unknown Product') as product_name,
        COALESCE(si.product_category, p.category, 'General') as category,
        COALESCE(p.price, si.unit_price) as original_price,
        si.quantity,
        si.unit_price as price,
        si.total_price as subtotal,
        c.bulk_discount_quantity,
        c.bulk_discount_price
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN categories c ON COALESCE(si.product_category, p.category) = c.name
      WHERE DATE(s.created_at, 'localtime') BETWEEN DATE(?) AND DATE(?)
      ORDER BY s.created_at DESC, s.id, si.id
      `,
      [startDate, endDate]
    );

    return result;
  } catch (error) {
    console.error("Error getting sales by date range:", error);
    return [];
  }
};

export const deleteProduct = (productId) => {
  try {
    // Product can now be deleted even if it has sales history
    // The product details are stored in sale_items table, so history is preserved
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
