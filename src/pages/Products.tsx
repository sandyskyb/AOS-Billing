import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Upload, Download } from "lucide-react";
import { productStorage, Product } from "@/lib/storage";
import { toast } from "sonner";
import { exportProductsToExcel, importProductsFromExcel } from "@/lib/excelSync";
import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    parentId: "",
    price: "",
    stock: "",
    minStock: "",
    unit: "pcs",
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    setProducts(productStorage.getAll());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProduct) {
      productStorage.update(editingProduct.id, {
        name: formData.name,
        parentId: formData.parentId || null,
        price: parseFloat(formData.price),
        minStock: parseInt(formData.minStock),
        unit: formData.unit,
      });
      toast.success("Product updated successfully");
    } else {
      productStorage.add({
        name: formData.name,
        parentId: formData.parentId || null,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock),
        unit: formData.unit,
      });
      toast.success("Product added successfully");
    }
    
    loadProducts();
    resetForm();
    setOpen(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      parentId: product.parentId || "",
      price: product.price.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      unit: product.unit,
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      productStorage.delete(id);
      loadProducts();
      toast.success("Product deleted successfully");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", parentId: "", price: "", stock: "", minStock: "", unit: "pcs" });
    setEditingProduct(null);
  };

  const handleExportExcel = () => {
    try {
      exportProductsToExcel(products);
      toast.success("Products exported to Excel successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export products");
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await importProductsFromExcel(file);
      
      if (result.success) {
        loadProducts();
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import Excel file");
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const parentProducts = products.filter(p => !p.parentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Product Master</h2>
          <p className="text-muted-foreground">Manage your product hierarchy</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportExcel}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? "Importing..." : "Import Excel"}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={products.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="parent">Parent Category (Optional)</Label>
                <Select value={formData.parentId || "none"} onValueChange={(value) => setFormData({ ...formData, parentId: value === "none" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="None - Top Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - Top Level</SelectItem>
                    {parentProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    disabled={!formData.parentId}
                    required
                  />
                  {!formData.parentId && (
                    <p className="text-xs text-muted-foreground mt-1">Price can only be set for child products</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces</SelectItem>
                      <SelectItem value="kg">Kilogram</SelectItem>
                      <SelectItem value="ltr">Liter</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!editingProduct && (
                <div>
                  <Label htmlFor="stock">Initial Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    disabled={!formData.parentId}
                    required
                  />
                  {!formData.parentId && (
                    <p className="text-xs text-muted-foreground mt-1">Stock can only be set for child products</p>
                  )}
                </div>
              )}
              <div>
                <Label htmlFor="minStock">Minimum Stock Level</Label>
                <Input
                  id="minStock"
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  disabled={!formData.parentId}
                  required
                />
                {!formData.parentId && (
                  <p className="text-xs text-muted-foreground mt-1">Minimum stock can only be set for child products</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                {editingProduct ? "Update Product" : "Add Product"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Product List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {parentProducts.map((parent) => (
              <div key={parent.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{parent.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      ₹{parent.price} per {parent.unit} | Stock: {parent.stock} {parent.unit}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(parent)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(parent.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {products.filter(p => p.parentId === parent.id).length > 0 && (
                  <div className="ml-6 mt-3 space-y-2 border-l-2 border-muted pl-4">
                    {products.filter(p => p.parentId === parent.id).map((child) => (
                      <div key={child.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{child.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ₹{child.price} per {child.unit} | Stock: {child.stock} {child.unit}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(child)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(child.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {products.filter(p => !p.parentId).length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No products yet. Add your first product to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
