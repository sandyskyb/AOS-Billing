// localStorage utilities for data persistence

export interface Product {
  id: string;
  name: string;
  parentId: string | null;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface BillItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Bill {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
  createdAt: string;
}

const STORAGE_KEYS = {
  PRODUCTS: 'billing_products',
  CUSTOMERS: 'billing_customers',
  BILLS: 'billing_bills',
  INVOICE_COUNTER: 'billing_invoice_counter',
};

// Generic storage functions
export const storage = {
  get: <T>(key: string): T[] => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },
  set: <T>(key: string, data: T[]) => {
    localStorage.setItem(key, JSON.stringify(data));
  },
};
// changed
// Product operations
export const productStorage = {
  getAll: (): Product[] => storage.get<Product>(STORAGE_KEYS.PRODUCTS),
  save: (products: Product[]) => storage.set(STORAGE_KEYS.PRODUCTS, products),
  add: (product: Omit<Product, 'id' | 'createdAt'>): Product => {
    const products = productStorage.getAll();
    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    products.push(newProduct);
    productStorage.save(products);
    return newProduct;
  },
  update: (id: string, updates: Partial<Product>) => {
    const products = productStorage.getAll();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = { ...products[index], ...updates };
      productStorage.save(products);
    }
  },
  delete: (id: string) => {
    const products = productStorage.getAll().filter(p => p.id !== id);
    productStorage.save(products);
  },
  updateStock: (id: string, quantityChange: number): boolean => {
    const products = productStorage.getAll();
    const product = products.find(p => p.id === id);
    if (!product) return false;
    
    const newStock = product.stock + quantityChange;
    if (newStock < 0) return false; // Prevent negative stock
    
    product.stock = newStock;
    productStorage.save(products);
    return true;
  },
};

// Customer operations
export const customerStorage = {
  getAll: (): Customer[] => storage.get<Customer>(STORAGE_KEYS.CUSTOMERS),
  save: (customers: Customer[]) => storage.set(STORAGE_KEYS.CUSTOMERS, customers),
  add: (customer: Omit<Customer, 'id' | 'createdAt'>): Customer => {
    const customers = customerStorage.getAll();
    const newCustomer: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    customers.push(newCustomer);
    customerStorage.save(customers);
    return newCustomer;
  },
  update: (id: string, updates: Partial<Customer>) => {
    const customers = customerStorage.getAll();
    const index = customers.findIndex(c => c.id === id);
    if (index !== -1) {
      customers[index] = { ...customers[index], ...updates };
      customerStorage.save(customers);
    }
  },
  delete: (id: string) => {
    const customers = customerStorage.getAll().filter(c => c.id !== id);
    customerStorage.save(customers);
  },
  search: (query: string): Customer[] => {
    const customers = customerStorage.getAll();
    const lowerQuery = query.toLowerCase();
    return customers.filter(
      c => c.name.toLowerCase().includes(lowerQuery) || c.phone.includes(query)
    );
  },
};

// Bill operations
export const billStorage = {
  getAll: (): Bill[] => storage.get<Bill>(STORAGE_KEYS.BILLS),
  save: (bills: Bill[]) => storage.set(STORAGE_KEYS.BILLS, bills),
  getNextInvoiceNumber: (): string => {
    const counter = localStorage.getItem(STORAGE_KEYS.INVOICE_COUNTER);
    const nextNumber = counter ? parseInt(counter) + 1 : 1001;
    localStorage.setItem(STORAGE_KEYS.INVOICE_COUNTER, nextNumber.toString());
    return `INV-${nextNumber}`;
  },
  add: (bill: Omit<Bill, 'id' | 'invoiceNumber' | 'createdAt'>): Bill | null => {
    // Validate stock availability
    for (const item of bill.items) {
      const product = productStorage.getAll().find(p => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        return null; // Stock insufficient
      }
    }
    
    // Deduct stock
    for (const item of bill.items) {
      const success = productStorage.updateStock(item.productId, -item.quantity);
      if (!success) return null;
    }
    
    const bills = billStorage.getAll();
    const newBill: Bill = {
      ...bill,
      id: crypto.randomUUID(),
      invoiceNumber: billStorage.getNextInvoiceNumber(),
      createdAt: new Date().toISOString(),
    };
    bills.push(newBill);
    billStorage.save(bills);
    return newBill;
  },
  update: (id: string, updates: Partial<Bill>) => {
    const bills = billStorage.getAll();
    const index = bills.findIndex(b => b.id === id);
    if (index !== -1) {
      bills[index] = { ...bills[index], ...updates };
      billStorage.save(bills);
    }
  },
  delete: (id: string) => {
    // Restore stock when deleting bill
    const bills = billStorage.getAll();
    const bill = bills.find(b => b.id === id);
    if (bill) {
      for (const item of bill.items) {
        productStorage.updateStock(item.productId, item.quantity);
      }
    }
    const updatedBills = bills.filter(b => b.id !== id);
    billStorage.save(updatedBills);
  },
  getByCustomer: (customerId: string): Bill[] => {
    return billStorage.getAll().filter(b => b.customerId === customerId);
  },
};
