import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { customerStorage, billStorage, Customer, Bill } from "@/lib/storage";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import initialCustomers from "@/data/customers.json";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerBills, setCustomerBills] = useState<Bill[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    const existingCustomers = customerStorage.getAll();
    
    // If no customers in localStorage, initialize from JSON file
    if (existingCustomers.length === 0 && initialCustomers.length > 0) {
      customerStorage.save(initialCustomers);
      setCustomers(initialCustomers);
    } else {
      setCustomers(existingCustomers);
    }
  };

  const filteredCustomers = searchQuery
    ? customerStorage.search(searchQuery)
    : customers;

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const newCustomer = {
    id: editingCustomer ? editingCustomer.id : crypto.randomUUID(),
    name: formData.name,
    phone: formData.phone,
    address: formData.address,
  };

  try {
    if (editingCustomer) {
      // UPDATE
      await fetch(`http://localhost:8000/customers/${editingCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });

      customerStorage.update(editingCustomer.id, newCustomer);
      toast.success("Customer updated successfully");
    } else {
      // ADD
      await fetch("http://localhost:8000/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });

      customerStorage.add(newCustomer);
      toast.success("Customer added successfully");
    }

    loadCustomers();
    resetForm();
    setOpen(false);

  } catch (err) {
    console.error(err);
    toast.error("Failed to save customer!");
  }
};


  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      customerStorage.delete(id);
      loadCustomers();
      toast.success("Customer deleted successfully");
    }
  };

  const viewHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    const bills = billStorage.getByCustomer(customer.id);
    setCustomerBills(bills);
    setHistoryOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", phone: "", address: "" });
    setEditingCustomer(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Customer Management</h2>
          <p className="text-muted-foreground">Manage customer information and order history</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingCustomer ? "Update Customer" : "Add Customer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Customer List</CardTitle>
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-2"
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between border rounded-lg p-4"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{customer.name}</h3>
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  <p className="text-sm text-muted-foreground">{customer.address}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => viewHistory(customer)}>
                    <Eye className="h-4 w-4 mr-1" />
                    History
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(customer)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(customer.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredCustomers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {searchQuery ? "No customers found." : "No customers yet. Add your first customer to get started."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order History - {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {customerBills.map((bill) => (
              <div key={bill.id} className="border rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold text-foreground">{bill.invoiceNumber}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(bill.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  {bill.items.map((item, idx) => (
                    <p key={idx} className="text-muted-foreground">
                      {item.productName} - {item.quantity} × ₹{item.price} = ₹{item.total}
                    </p>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t">
                  <p className="font-semibold text-foreground">Total: ₹{bill.total.toFixed(2)}</p>
                </div>
              </div>
            ))}
            {customerBills.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No order history yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
