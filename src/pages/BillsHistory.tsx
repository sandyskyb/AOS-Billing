import { useState, useEffect, useMemo } from "react";
import { billStorage, customerStorage } from "@/lib/storage";
import type { Bill, Customer } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Eye, Pencil, Trash2, Search, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

export default function BillsHistory() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filterCustomerId, setFilterCustomerId] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [searchInvoice, setSearchInvoice] = useState<string>("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setBills(billStorage.getAll());
    setCustomers(customerStorage.getAll());
  };

  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      // Filter by customer
      if (filterCustomerId !== "all" && bill.customerId !== filterCustomerId) {
        return false;
      }

      // Filter by invoice number search
      if (searchInvoice && !bill.invoiceNumber.toLowerCase().includes(searchInvoice.toLowerCase())) {
        return false;
      }

      // Filter by date range
      const billDate = new Date(bill.createdAt);
      if (filterStartDate) {
        const startDate = new Date(filterStartDate);
        if (billDate < startDate) return false;
      }
      if (filterEndDate) {
        const endDate = new Date(filterEndDate);
        endDate.setHours(23, 59, 59, 999);
        if (billDate > endDate) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bills, filterCustomerId, filterStartDate, filterEndDate, searchInvoice]);

  const handlePrint = (bill: Bill) => {
  setSelectedBill(bill);
  setShowPrintView(true);
  setTimeout(() => window.print(), 100);
};

  const handleView = (bill: Bill) => {
    setSelectedBill(bill);
  };

  const handleDelete = (bill: Bill) => {
    if (confirm(`Delete invoice ${bill.invoiceNumber}? This will restore the product stock.`)) {
      billStorage.delete(bill.id);
      toast({
        title: "Bill deleted",
        description: `Invoice ${bill.invoiceNumber} has been deleted and stock restored.`,
      });
      loadData();
    }
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : "Unknown";
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBillIds(filteredBills.map(bill => bill.id));
    } else {
      setSelectedBillIds([]);
    }
  };

  const handleSelectBill = (billId: string, checked: boolean) => {
    if (checked) {
      setSelectedBillIds(prev => [...prev, billId]);
    } else {
      setSelectedBillIds(prev => prev.filter(id => id !== billId));
    }
  };

  const handleExport = () => {
    if (selectedBillIds.length === 0) {
      toast({
        title: "No invoices selected",
        description: "Please select at least one invoice to export.",
        variant: "destructive",
      });
      return;
    }

    const selectedBills = bills.filter(bill => selectedBillIds.includes(bill.id));
    
    // Create Excel data
    const excelData: any[] = [];
    
    selectedBills.forEach(bill => {
      const customer = getCustomerName(bill.customerId);
      
      // Add bill header
      excelData.push({
        'Invoice No': bill.invoiceNumber,
        'Date': new Date(bill.createdAt).toLocaleString(),
        'Customer': customer,
        'Product': '',
        'Quantity': '',
        'Price': '',
        'Item Total': '',
        'Subtotal': '',
        'Discount %': '',
        'GST %': '',
        'Total': '',
      });
      
      // Add items
      bill.items.forEach(item => {
        excelData.push({
          'Invoice No': '',
          'Date': '',
          'Customer': '',
          'Product': item.productName,
          'Quantity': item.quantity,
          'Price': item.price,
          'Item Total': item.total,
          'Subtotal': '',
          'Discount %': '',
          'GST %': '',
          'Total': '',
        });
      });
      
      // Add totals row
      excelData.push({
        'Invoice No': '',
        'Date': '',
        'Customer': '',
        'Product': '',
        'Quantity': '',
        'Price': '',
        'Item Total': '',
        'Subtotal': bill.subtotal,
        'Discount %': bill.discount,
        'GST %': bill.gstPercent,
        'Total': bill.total,
      });
      
      // Add empty row for spacing
      excelData.push({});
    });

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
    
    // Generate filename with current date
    const filename = `invoices_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Export file
    XLSX.writeFile(workbook, filename);
    
    toast({
      title: "Export successful",
      description: `${selectedBillIds.length} invoice(s) exported to ${filename}`,
    });
  };
return ( <>
 {showPrintView && selectedBill && (
  <div id="thermal-print-area" className="print:block hidden">
    <div
      style={{
        width: "80mm",
        padding: "5mm",
        fontFamily: "monospace",
        fontSize: "12px",
      }}
      className="mx-auto"
    >

      {/* HEADER */}
      <div className="text-center mb-3">
        <h1 className="text-lg font-bold">INVOICE</h1>
        <p className="text-sm">Invoice No: {selectedBill.invoiceNumber}</p>
      </div>

      {/* CUSTOMER DETAILS (2×2 GRID) */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-3 border-t border-b py-2">
        <div><strong>Customer:</strong> {getCustomerName(selectedBill.customerId)}</div>
        <div><strong>Phone:</strong> {selectedBill.customerPhone}</div>
        <div><strong>Date:</strong> {new Date(selectedBill.createdAt).toLocaleDateString()}</div>
        <div><strong>Time:</strong> {new Date(selectedBill.createdAt).toLocaleTimeString()}</div>
      </div>

      {/* ITEMS TABLE */}
      <table className="w-full text-xs mb-3">
        <thead>
          <tr className="border-b">
            <th className="text-left py-1">Item</th>
            <th className="text-right py-1">Qty</th>
            <th className="text-right py-1">Price</th>
            <th className="text-right py-1">Total</th>
          </tr>
        </thead>

        <tbody>
          {selectedBill.items.map((item, idx) => (
            <tr key={idx} className="border-b border-dashed">
              <td className="py-1">{item.productName}</td>
              <td className="text-right">{item.quantity}</td>
              <td className="text-right">₹{item.price.toFixed(2)}</td>
              <td className="text-right">₹{item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTAL SECTION */}
      <div className="border-t pt-2 space-y-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>₹{selectedBill.subtotal.toFixed(2)}</span>
        </div>

        {selectedBill.discount > 0 && (
          <div className="flex justify-between">
            <span>Discount ({selectedBill.discount}%):</span>
            <span>-₹{((selectedBill.subtotal * selectedBill.discount) / 100).toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span>GST ({selectedBill.gstPercent}%):</span>
          <span>₹{selectedBill.gstAmount.toFixed(2)}</span>
        </div>

        <div className="flex justify-between font-bold text-sm border-t pt-1">
          <span>Total:</span>
          <span>₹{selectedBill.total.toFixed(2)}</span>
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center mt-3 text-xs">
        <p>Thank you for your business!</p>
      </div>

    </div>
  </div>
)}



      <div className="container mx-auto p-6 print:hidden">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bills History</h1>
            <p className="text-muted-foreground">View and manage past invoices</p>
          </div>
          <Button 
            onClick={handleExport} 
            disabled={selectedBillIds.length === 0}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Export Selected ({selectedBillIds.length})
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search Invoice</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Invoice number..."
                    value={searchInvoice}
                    onChange={(e) => setSearchInvoice(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={filterCustomerId} onValueChange={setFilterCustomerId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredBills.length > 0 && selectedBillIds.length === filteredBills.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No bills found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map(bill => (
                    <TableRow key={bill.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedBillIds.includes(bill.id)}
                          onCheckedChange={(checked) => handleSelectBill(bill.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{bill.invoiceNumber}</TableCell>
                      <TableCell>{new Date(bill.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{getCustomerName(bill.customerId)}</TableCell>
                      <TableCell className="text-right">{bill.items.length}</TableCell>
                      <TableCell className="text-right">₹{bill.total.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleView(bill)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handlePrint(bill)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(bill)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!selectedBill && !showPrintView} onOpenChange={(open) => !open && setSelectedBill(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invoice Details - {selectedBill?.invoiceNumber}</DialogTitle>
            </DialogHeader>
            {selectedBill && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer</Label>
                    <p className="font-medium">{getCustomerName(selectedBill.customerId)}</p>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <p className="font-medium">{new Date(selectedBill.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <Label>Items</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBill.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{item.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{selectedBill.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedBill.discount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Discount ({selectedBill.discount}%):</span>
                      <span>-₹{((selectedBill.subtotal * selectedBill.discount) / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST ({selectedBill.gstPercent}%):</span>
                    <span>₹{selectedBill.gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>₹{selectedBill.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
