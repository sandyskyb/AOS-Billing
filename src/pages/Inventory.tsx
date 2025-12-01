import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus } from "lucide-react";
import { productStorage, Product } from "@/lib/storage";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [operation, setOperation] = useState<"add" | "remove">("add");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    setProducts(productStorage.getAll());
  };

  const handleStockUpdate = () => {
    if (!selectedProduct || !quantity) return;

    const change = operation === "add" ? parseInt(quantity) : -parseInt(quantity);
    const success = productStorage.updateStock(selectedProduct.id, change);

    if (success) {
      toast.success(`Stock ${operation === "add" ? "added" : "removed"} successfully`);
      loadProducts();
      setOpen(false);
      setQuantity("");
      setSelectedProduct(null);
    } else {
      toast.error("Cannot reduce stock below zero");
    }
  };

  const openDialog = (product: Product, op: "add" | "remove") => {
    setSelectedProduct(product);
    setOperation(op);
    setQuantity("");
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Inventory Management</h2>
        <p className="text-muted-foreground">Track and manage product stock levels</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {products.map((product) => {
              const isLowStock = product.stock <= product.minStock;
              return (
                <div
                  key={product.id}
                  className="flex items-center justify-between border rounded-lg p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{product.name}</h3>
                      {isLowStock && (
                        <Badge variant="outline" className="border-warning text-warning">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Current: {product.stock} {product.unit} | Min: {product.minStock} {product.unit}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDialog(product, "add")}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Stock
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDialog(product, "remove")}
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      Remove Stock
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {products.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No products available. Add products first.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {operation === "add" ? "Add" : "Remove"} Stock - {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Stock: {selectedProduct?.stock} {selectedProduct?.unit}</Label>
            </div>
            <div>
              <Label htmlFor="quantity">Quantity to {operation}</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
            <Button onClick={handleStockUpdate} className="w-full">
              {operation === "add" ? "Add" : "Remove"} Stock
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
