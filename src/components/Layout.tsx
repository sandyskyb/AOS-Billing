import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, Users, Receipt, ShoppingCart, FileText } from "lucide-react";
import { toast } from "sonner";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/products", icon: Package, label: "Products" },
  { path: "/inventory", icon: ShoppingCart, label: "Inventory" },
  { path: "/customers", icon: Users, label: "Customers" },
  { path: "/billing", icon: Receipt, label: "Billing" },
  { path: "/bills-history", icon: FileText, label: "Bills History" },
];

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // ESC to close shortcuts dialog
      if (e.key === "Escape") {
        setShowShortcuts(false);
        return;
      }

      // CTRL+S for quick save (let individual pages handle this)
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("save-bill"));
        return;
      }

      // Only trigger if not typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "F1":
          e.preventDefault();
          setShowShortcuts(true);
          break;
        case "F2":
          e.preventDefault();
          navigate("/customers");
          toast.info("F2: Navigate to Customers");
          break;
        case "F4":
          e.preventDefault();
          navigate("/products");
          toast.info("F4: Navigate to Products");
          break;
        case "F7":
          e.preventDefault();
          // Dispatch custom event for print bill
          window.dispatchEvent(new CustomEvent("print-bill"));
          break;
        case "F8":
          e.preventDefault();
          // Dispatch custom event for save bill
          window.dispatchEvent(new CustomEvent("save-bill"));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">AOS Billing System</h1>
            </div>
            
            <div className="flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      <KeyboardShortcutsDialog
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
    </div>
  );
};
