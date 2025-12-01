import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, Receipt, AlertTriangle, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { productStorage, customerStorage, billStorage, Product, Bill } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCustomers: 0,
    totalBills: 0,
    lowStockProducts: 0,
  });
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const products = productStorage.getAll();
    const customers = customerStorage.getAll();
    const allBills = billStorage.getAll();
    const lowStock = products.filter(p => p.stock <= p.minStock);

    setStats({
      totalProducts: products.length,
      totalCustomers: customers.length,
      totalBills: allBills.length,
      lowStockProducts: lowStock.length,
    });
    setLowStockItems(lowStock);
    setBills(allBills);
  }, []);

  // Filter bills by date range
  const filteredBills = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      return billDate >= start && billDate <= end;
    });
  }, [bills, startDate, endDate]);

  // Calculate sales analytics
  const salesAnalytics = useMemo(() => {
    const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
    const totalDiscount = filteredBills.reduce((sum, bill) => sum + bill.discount, 0);
    const totalGST = filteredBills.reduce((sum, bill) => sum + bill.gstAmount, 0);
    const averageOrderValue = filteredBills.length > 0 ? totalRevenue / filteredBills.length : 0;

    return {
      totalRevenue,
      totalDiscount,
      totalGST,
      averageOrderValue,
      orderCount: filteredBills.length,
    };
  }, [filteredBills]);

  // Group sales by date for chart
  const salesChartData = useMemo(() => {
    const dateMap = new Map<string, { date: string; revenue: number; orders: number }>();

    filteredBills.forEach(bill => {
      const dateKey = new Date(bill.createdAt).toLocaleDateString('en-GB');
      const existing = dateMap.get(dateKey) || { date: dateKey, revenue: 0, orders: 0 };
      existing.revenue += bill.total;
      existing.orders += 1;
      dateMap.set(dateKey, existing);
    });

    return Array.from(dateMap.values()).sort((a, b) => {
      const [dayA, monthA, yearA] = a.date.split('/').map(Number);
      const [dayB, monthB, yearB] = b.date.split('/').map(Number);
      return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
    });
  }, [filteredBills]);

  const statCards = [
    { title: "Total Products", value: stats.totalProducts, icon: Package, color: "text-primary" },
    { title: "Total Customers", value: stats.totalCustomers, icon: Users, color: "text-primary" },
    { title: "Total Bills", value: stats.totalBills, icon: Receipt, color: "text-primary" },
    { title: "Low Stock Alerts", value: stats.lowStockProducts, icon: AlertTriangle, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your billing and inventory system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5" />
            Sales Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end mb-6">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="startDate">From Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="endDate">To Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
                setEndDate(today);
              }}
            >
              Last 30 Days
            </Button>
          </div>

          {/* Sales Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ₹{salesAnalytics.totalRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {salesAnalytics.orderCount} orders
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Order Value
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ₹{salesAnalytics.averageOrderValue.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Discounts
                </CardTitle>
                <Receipt className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ₹{salesAnalytics.totalDiscount.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  GST Collected
                </CardTitle>
                <Receipt className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ₹{salesAnalytics.totalGST.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Chart */}
          {salesChartData.length > 0 ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-4 text-foreground">Revenue Trend</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Revenue (₹)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-4 text-foreground">Orders per Day</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={salesChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="orders" 
                      fill="hsl(var(--primary))" 
                      name="Orders"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No sales data available for the selected date range
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Analysis Note */}
      <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-sm text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Profit/Loss Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To enable profit/loss tracking, you need to add a "Cost Price" field to products. 
            This would allow calculating: <strong>Profit = Revenue - (Cost Price × Quantity Sold)</strong>
          </p>
        </CardContent>
      </Card>

      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Current: {product.stock} {product.unit} | Min: {product.minStock} {product.unit}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-warning text-warning">
                    Low Stock
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
