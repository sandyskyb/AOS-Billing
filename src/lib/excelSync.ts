import * as XLSX from 'xlsx';
import { Product, productStorage } from './storage';

/**
 * Export products to Excel file
 */
export const exportProductsToExcel = (products: Product[]): void => {
  // Prepare data for Excel with readable parent names
  const excelData = products.map(product => {
    const parent = product.parentId 
      ? products.find(p => p.id === product.parentId)
      : null;
    
    return {
      'ID': product.id,
      'Name': product.name,
      'Parent Category': parent ? parent.name : 'None – Top Level',
      'Price': product.price,
      'Stock': product.stock,
      'Min Stock': product.minStock,
      'Unit': product.unit,
      'Created At': product.createdAt
    };
  });

  // Create worksheet and workbook
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 25 }, // ID
    { wch: 30 }, // Name
    { wch: 20 }, // Parent Category
    { wch: 10 }, // Price
    { wch: 10 }, // Stock
    { wch: 12 }, // Min Stock
    { wch: 10 }, // Unit
    { wch: 20 }  // Created At
  ];

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `products_${timestamp}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);
};

/**
 * Import products from Excel file
 */
export const importProductsFromExcel = async (
  file: File
): Promise<{ success: boolean; message: string; importedCount: number }> => {
  try {
    // Read file
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (!jsonData || jsonData.length === 0) {
      return {
        success: false,
        message: 'Excel file is empty or invalid',
        importedCount: 0
      };
    }

    // Get existing products to build parent mapping
    const existingProducts = productStorage.getAll();
    const existingProductMap = new Map(existingProducts.map(p => [p.name.toLowerCase(), p]));
    
    // Track imported products
    const importedProducts: Product[] = [];
    const errors: string[] = [];

    // First pass: create all products with temporary parentIds
    const productMap = new Map<string, Product>();
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = i + 2; // Excel rows start at 1, header is row 1

      try {
        // Validate required fields
        if (!row['Name']) {
          errors.push(`Row ${rowNum}: Name is required`);
          continue;
        }

        const name = String(row['Name']).trim();
        const parentCategory = row['Parent Category'] ? String(row['Parent Category']).trim() : 'None – Top Level';
        const price = parseFloat(row['Price'] || 0);
        const stock = parseFloat(row['Stock'] || 0);
        const minStock = parseFloat(row['Min Stock'] || 0);
        const unit = row['Unit'] ? String(row['Unit']).trim() : '';

        // Check if product exists by ID or name
        const existingById = row['ID'] ? existingProducts.find(p => p.id === row['ID']) : null;
        const existingByName = existingProductMap.get(name.toLowerCase());
        const existing = existingById || existingByName;

        const product: Product = {
          id: existing?.id || row['ID'] || crypto.randomUUID(),
          name,
          parentId: null, // Will be set in second pass
          price: isNaN(price) ? 0 : price,
          stock: isNaN(stock) ? 0 : stock,
          minStock: isNaN(minStock) ? 0 : minStock,
          unit,
          createdAt: existing?.createdAt || new Date().toISOString()
        };

        // Store parent category name temporarily
        (product as any)._parentCategoryName = parentCategory;
        productMap.set(name.toLowerCase(), product);
        importedProducts.push(product);

      } catch (error) {
        errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Second pass: resolve parent IDs
    for (const product of importedProducts) {
      const parentCategoryName = (product as any)._parentCategoryName;
      
      if (parentCategoryName && parentCategoryName !== 'None – Top Level') {
        // Look for parent in imported products or existing products
        const parentInImported = productMap.get(parentCategoryName.toLowerCase());
        const parentInExisting = existingProductMap.get(parentCategoryName.toLowerCase());
        
        if (parentInImported) {
          product.parentId = parentInImported.id;
        } else if (parentInExisting) {
          product.parentId = parentInExisting.id;
        } else {
          // Parent not found, keep as top level
          product.parentId = null;
          errors.push(`Product "${product.name}": Parent category "${parentCategoryName}" not found, set as top level`);
        }
      }

      // Clean up temporary property
      delete (product as any)._parentCategoryName;
    }

    if (importedProducts.length === 0) {
      return {
        success: false,
        message: 'No valid products found in Excel file',
        importedCount: 0
      };
    }

    // Save all products (merge with existing)
    const finalProducts = [...importedProducts];
    
    // Add existing products that weren't updated
    for (const existing of existingProducts) {
      const wasUpdated = importedProducts.some(p => p.id === existing.id);
      if (!wasUpdated) {
        finalProducts.push(existing);
      }
    }

    productStorage.save(finalProducts);

    const message = errors.length > 0
      ? `Imported ${importedProducts.length} products with ${errors.length} warnings: ${errors.join('; ')}`
      : `Successfully imported ${importedProducts.length} products`;

    return {
      success: true,
      message,
      importedCount: importedProducts.length
    };

  } catch (error) {
    console.error('Excel import error:', error);
    return {
      success: false,
      message: `Failed to import Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      importedCount: 0
    };
  }
};
