import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Printer, Search } from "lucide-react";
import { productStorage, customerStorage, billStorage, Product, Customer, BillItem } from "@/lib/storage";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DRAFT_KEY = "billing-draft";

interface BillDraft {
  selectedCustomer: string;
  items: BillItem[];
  discount: string;
  gstPercent: string;
  timestamp: number;
}

export default function Billing() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState<BillItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [gstPercent, setGstPercent] = useState("18");
  const [showPrintView, setShowPrintView] = useState(false);

  // Load draft on mount
  useEffect(() => {
    setProducts(productStorage.getAll());
    setCustomers(customerStorage.getAll());

    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft: BillDraft = JSON.parse(savedDraft);
        setSelectedCustomer(draft.selectedCustomer);
        setItems(draft.items);
        setDiscount(draft.discount);
        setGstPercent(draft.gstPercent);
        toast.info("Draft bill restored");
      } catch (error) {
        console.error("Failed to load draft:", error);
      }
    }
  }, []);

  // Auto-save draft every 5 seconds
  useEffect(() => {
    if (items.length === 0 && !selectedCustomer) return;

    const saveDraft = () => {
      const draft: BillDraft = {
        selectedCustomer,
        items,
        discount,
        gstPercent,
        timestamp: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    };

    const interval = setInterval(saveDraft, 5000);
    return () => clearInterval(interval);
  }, [selectedCustomer, items, discount, gstPercent]);

  // Keyboard shortcuts listeners
  useEffect(() => {
    const handlePrintShortcut = () => handlePrint();
    const handleSaveShortcut = () => handleCreateBill();

    window.addEventListener("print-bill", handlePrintShortcut);
    window.addEventListener("save-bill", handleSaveShortcut);

    return () => {
      window.removeEventListener("print-bill", handlePrintShortcut);
      window.removeEventListener("save-bill", handleSaveShortcut);
    };
  }, [selectedCustomer, items, discount, gstPercent, customers]);

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const search = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.phone.includes(search) ||
      c.id.toLowerCase().includes(search)
    );
  }, [customers, customerSearch]);

  // Filter products by search - only show products with valid prices (child products)
  const filteredProducts = useMemo(() => {
    const billableProducts = products.filter(p => p.price != null && p.price > 0);
    if (!productSearch) return billableProducts;
    const search = productSearch.toLowerCase();
    return billableProducts.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.id.toLowerCase().includes(search)
    );
  }, [products, productSearch]);

  const addProductToBill = useCallback((product: Product) => {
    const existingIndex = items.findIndex(item => item.productId === product.id);
    
    if (existingIndex >= 0) {
      // Increase quantity if already in bill
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
      setItems(updated);
      toast.success(`Increased ${product.name} quantity`);
    } else {
      // Add new item
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        total: product.price
      }]);
      toast.success(`Added ${product.name} to bill`);
    }
  }, [items]);

  const removeItem = useCallback((index: number) => {
    setItems(items.filter((_, i) => i !== index));
  }, [items]);

  const updateItem = useCallback((index: number, field: keyof BillItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "quantity" || field === "price") {
      updated[index].total = updated[index].quantity * updated[index].price;
    }

    setItems(updated);
  }, [items]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
  const discountAmount = useMemo(() => (subtotal * parseFloat(discount || "0")) / 100, [subtotal, discount]);
  const afterDiscount = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);
  const gstAmount = useMemo(() => (afterDiscount * parseFloat(gstPercent || "0")) / 100, [afterDiscount, gstPercent]);
  const total = useMemo(() => afterDiscount + gstAmount, [afterDiscount, gstAmount]);

  const handleCreateBill = () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (items.length === 0 || items.some(i => !i.productId)) {
      toast.error("Please add at least one valid item");
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    const bill = billStorage.add({
      customerId: selectedCustomer,
      customerName: customer.name,
      items,
      subtotal,
      discount: discountAmount,
      gstPercent: parseFloat(gstPercent),
      gstAmount,
      total,
    });

    if (bill) {
      toast.success(`Bill created: ${bill.invoiceNumber}`);
      localStorage.removeItem(DRAFT_KEY);
      resetForm();
    } else {
      toast.error("Insufficient stock for one or more items");
    }
  };

  const resetForm = () => {
    setSelectedCustomer("");
    setItems([]);
    setDiscount("0");
    setGstPercent("18");
    localStorage.removeItem(DRAFT_KEY);
  };

  const handlePrint = () => {
    if (!selectedCustomer || items.length === 0) {
      toast.error("Please create a bill first");
      return;
    }
    setShowPrintView(true);
    setTimeout(() => window.print(), 100);
  };

  const customer = useMemo(() => 
    customers.find(c => c.id === selectedCustomer), 
    [customers, selectedCustomer]
  );

  const nextInvoiceNumber = useMemo(() => 
    billStorage.getNextInvoiceNumber(), 
    []
  );

  return (
    <>
      {/* Print View - Thermal Printer Format */}
      {showPrintView && (
        <div id="thermal-print-area" className="print:block hidden">
          <style>
{`
  @media print {
    body * {
      visibility: hidden !important;
    }

    #thermal-print-area, #thermal-print-area * {
      visibility: visible !important;
    }

    #thermal-print-area {
      position: absolute;
      left: 4;
      top: 0  ;
      width: 80mm;
      margin: 0;
      padding: 0;
    }

    @page {
      size: 80mm auto;
      margin: 0;
    }
  }
`}
</style>

          <div style={{ width: '80mm', padding: '5mm', fontFamily: 'monospace', fontSize: '12px' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px dashed #000', paddingBottom: '10px' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Anthiyur Online Sandhai</div>
              <div style={{ fontSize: '10px' }}>Near Police Station</div>
              <div style={{ fontSize: '10px' }}>Phone: +91 XXXXXXXXXX</div>
            </div>
            
            <div style={{ marginBottom: '10px', fontSize: '11px' }}>
              <div><strong>Invoice:</strong> {nextInvoiceNumber}</div>
              <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
              <div><strong>Customer:</strong> {customer?.name}</div>
              <div><strong>Phone:</strong> {customer?.phone}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
  </div>{/* <div>
    <strong>Invoice:</strong> {nextInvoiceNumber}
  </div>
  <div>
    <strong>Date:</strong> {new Date().toLocaleDateString()}
  </div>

  <div>
    <strong>Customer:</strong> {customer?.name}
  </div>
  <div>
    <strong>Phone:</strong> {customer?.phone}
  </div>
</div> */}

            <div style={{ borderTop: '2px dashed #000', borderBottom: '2px dashed #000', padding: '5px 0' }}>
              <table style={{ width: '100%', fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Item</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'left', paddingRight: '5px' }}>{item.productName}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>₹{item.price.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '10px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Discount ({discount}%):</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>GST ({gstPercent}%):</span>
                <span>₹{gstAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', borderTop: '2px solid #000', marginTop: '5px', paddingTop: '5px' }}>
                <span>TOTAL:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '10px', borderTop: '2px dashed #000', paddingTop: '10px' }}>
              <div>Thank you for your business!</div>
              <div>Please visit again</div>
            </div>
          </div>
        </div>
      
      )}

      {/* Main Billing Interface */}
      <div className="space-y-4 print:hidden p-2 sm:p-4 md:p-6">
        <div className="grid gap-3 sm:gap-4 md:grid-cols-[320px_1fr] lg:grid-cols-[380px_1fr] xl:grid-cols-[400px_1fr]">
          {/* Left Sidebar: Customer & Summary */}
          <div className="space-y-3 sm:space-y-4">
            {/* Customer Selection - Compact */}
            <Card>
              <CardContent className="pt-4 sm:pt-6 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <Label className="text-xs sm:text-sm font-semibold">Customer</Label>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customer..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9 h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="grid gap-2 max-h-40 sm:max-h-48 overflow-y-auto">
                  {filteredCustomers.map((c) => (
                    <Button
                      key={c.id}
                      size="sm"
                      variant={selectedCustomer === c.id ? "default" : "outline"}
                      onClick={() => setSelectedCustomer(c.id)}
                      className="justify-start text-left h-auto py-1.5 sm:py-2 px-2 sm:px-3"
                    >
                      <div className="truncate w-full">
                        <div className="font-medium text-xs sm:text-sm">{c.name}</div>
                        <div className="text-[10px] sm:text-xs opacity-70">{c.phone}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bill Summary - Sticky */}
            <Card className="md:sticky md:top-4">
              <CardContent className="pt-4 sm:pt-6 space-y-3 sm:space-y-4">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span className="font-semibold text-foreground">{items.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold text-foreground">₹{subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-1 sm:pt-2">
                    <div>
                      <Label className="text-[10px] sm:text-xs text-muted-foreground">Discount %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="h-8 sm:h-9 mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] sm:text-xs text-muted-foreground">GST %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={gstPercent}
                        onChange={(e) => setGstPercent(e.target.value)}
                        className="h-8 sm:h-9 mt-1 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs sm:text-sm pt-1 sm:pt-2">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium text-foreground">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-muted-foreground">GST</span>
                    <span className="font-medium text-foreground">₹{gstAmount.toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t pt-2 sm:pt-3 flex justify-between items-center">
                    <span className="text-sm sm:text-base font-semibold text-foreground">Total</span>
                    <span className="text-xl sm:text-2xl font-bold text-primary">₹{total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1 sm:pt-2">
                  <Button onClick={handleCreateBill} className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold" size="lg">
                    Complete Sale
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={handlePrint} variant="outline" className="w-full h-9 sm:h-10 text-xs sm:text-sm" size="sm">
                      <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden xs:inline">Print</span>
                      <span className="inline xs:hidden">Print</span>
                    </Button>
                    <Button onClick={resetForm} variant="outline" className="w-full h-9 sm:h-10 text-xs sm:text-sm" size="sm">
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Main POS Area */}
          <div className="space-y-3 sm:space-y-4">
            {/* Product Search - Large and Prominent */}
            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="relative">
                  <Search className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 sm:h-5 w-4 sm:w-5 text-muted-foreground" />
                  <Input
                    placeholder="Scan barcode or search product..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 sm:pl-12 h-11 sm:h-14 text-base sm:text-lg font-medium"
                    autoFocus
                  />
                </div>
              </CardContent>
            </Card>

            {/* Product Grid - Quick Add */}
            <Card>
              <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
                <CardTitle className="text-sm sm:text-base font-semibold">Quick Add Products</CardTitle>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <div className="border rounded-lg max-h-52 sm:max-h-64 md:max-h-80 lg:max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-xs sm:text-sm px-2 sm:px-4">Product</TableHead>
                        <TableHead className="text-right font-semibold text-xs sm:text-sm px-2 sm:px-4 hidden sm:table-cell">Stock</TableHead>
                        <TableHead className="text-right font-semibold text-xs sm:text-sm px-2 sm:px-4">Price</TableHead>
                        <TableHead className="w-[60px] sm:w-[80px] px-2 sm:px-4"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-6 sm:py-8 text-xs sm:text-sm">
                            No products found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((p) => (
                          <TableRow 
                            key={p.id} 
                            className="cursor-pointer hover:bg-accent/50 transition-colors"
                            onClick={() => addProductToBill(p)}
                          >
                            <TableCell className="font-medium text-xs sm:text-sm px-2 sm:px-4">{p.name}</TableCell>
                            <TableCell className="text-right px-2 sm:px-4 hidden sm:table-cell">
                              <span className={p.stock < p.minStock ? "text-destructive font-semibold text-xs sm:text-sm" : "text-muted-foreground text-xs sm:text-sm"}>
                                {p.stock}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-xs sm:text-sm px-2 sm:px-4">₹{p.price.toFixed(2)}</TableCell>
                            <TableCell className="text-center px-2 sm:px-4">
                              <Button size="sm" variant="default" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Current Bill Items - Prominent */}
            <Card>
              <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm sm:text-base font-semibold">Current Bill</CardTitle>
                {items.length > 0 && (
                  <span className="text-xs sm:text-sm text-muted-foreground">{items.length} item(s)</span>
                )}
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                {items.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <div className="mb-2 text-3xl sm:text-4xl">🛒</div>
                    <div className="text-xs sm:text-sm">No items added yet</div>
                    <div className="text-[10px] sm:text-xs mt-1">Click products above to add</div>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold text-xs sm:text-sm px-2 sm:px-4">Item</TableHead>
                          <TableHead className="text-center font-semibold text-xs sm:text-sm w-[80px] sm:w-[100px] px-2 sm:px-4">Qty</TableHead>
                          <TableHead className="text-right font-semibold text-xs sm:text-sm w-[80px] sm:w-[120px] px-2 sm:px-4 hidden md:table-cell">Price</TableHead>
                          <TableHead className="text-right font-semibold text-xs sm:text-sm w-[90px] sm:w-[120px] px-2 sm:px-4">Total</TableHead>
                          <TableHead className="w-[50px] sm:w-[60px] px-2 sm:px-4"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index} className="hover:bg-accent/30">
                            <TableCell className="font-medium text-xs sm:text-sm px-2 sm:px-4">{item.productName}</TableCell>
                            <TableCell className="text-center px-2 sm:px-4">
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 1)}
                                className="w-16 sm:w-20 text-center h-8 sm:h-9 font-medium text-xs sm:text-sm"
                              />
                            </TableCell>
                            <TableCell className="text-right px-2 sm:px-4 hidden md:table-cell">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => updateItem(index, "price", parseFloat(e.target.value) || 0)}
                                className="w-20 sm:w-24 text-right h-8 sm:h-9 font-medium text-xs sm:text-sm"
                              />
                            </TableCell>
                            <TableCell className="text-right font-bold text-xs sm:text-base px-2 sm:px-4">₹{item.total.toFixed(2)}</TableCell>
                            <TableCell className="text-center px-2 sm:px-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeItem(index)}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
