import { useEffect, useState } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useNavigate, Link } from "react-router-dom";
import { format, isPast, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Receipt, 
  DollarSign, 
  LogOut, 
  User,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerPortalData, useIsCustomer } from "@/hooks/useCustomerPortal";
import { toast } from "sonner";
import foremanLogo from "@/assets/foreman-logo.png";
import { safeFormatDate } from "@/lib/pdf/dateUtils";

const quoteStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-500",
  accepted: "bg-green-500/10 text-green-500",
  declined: "bg-red-500/10 text-red-500",
  expired: "bg-muted text-muted-foreground",
};

const invoiceStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-yellow-500/10 text-yellow-500",
  paid: "bg-green-500/10 text-green-500",
  overdue: "bg-red-500/10 text-red-500",
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const { data: isCustomer, isLoading: isCustomerLoading } = useIsCustomer();
  const { data: portalData, isLoading: isDataLoading } = useCustomerPortalData();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/customer/login");
        return;
      }
      setIsLoading(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/customer/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!isCustomerLoading && isCustomer === false) {
      toast.error("No customer account found for this email");
      supabase.auth.signOut();
      navigate("/customer/login");
    }
  }, [isCustomer, isCustomerLoading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/customer/login");
  };

  const { formatCurrency } = useCurrency();

  const getInvoiceDisplayStatus = (status: string, dueDate: string) => {
    if (status === "pending") {
      const due = new Date(dueDate);
      if (isPast(due) && !isToday(due)) {
        return "overdue";
      }
    }
    return status;
  };

  if (isLoading || isCustomerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalQuotes = portalData?.quotes.length || 0;
  const totalInvoices = portalData?.invoices.length || 0;
  const totalPaid = portalData?.payments.reduce((sum, p) => sum + p.amount, 0) || 0;
  const outstandingInvoices = portalData?.invoices.filter((i) => i.status !== "paid") || [];
  const outstandingBalance = outstandingInvoices.reduce((sum, i) => sum + (i.balance_due ?? i.total), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={foremanLogo} alt="Revamo" className="h-9 w-9 rounded-lg" />
            <div>
              <span className="text-xl font-bold tracking-tight">Customer Portal</span>
              {portalData?.customer && (
                <p className="text-sm text-muted-foreground">{portalData.customer.name}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Quotes</p>
                  <p className="text-2xl font-bold">{totalQuotes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Invoices</p>
                  <p className="text-2xl font-bold">{totalInvoices}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold">{formatCurrency(outstandingBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="quotes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="quotes">
            <Card>
              <CardHeader>
                <CardTitle>Your Quotes</CardTitle>
              </CardHeader>
              <CardContent>
                {isDataLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : portalData?.quotes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No quotes found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {portalData?.quotes.map((quote) => (
                      <div
                        key={quote.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{quote.display_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(quote.created_at), "MMM d, yyyy")}
                            {quote.valid_until && ` • Valid until ${safeFormatDate(quote.valid_until, "MMM d, yyyy")}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className={quoteStatusColors[quote.status]}>
                            {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                          </Badge>
                          <span className="font-semibold">{formatCurrency(quote.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Your Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {isDataLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : portalData?.invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {portalData?.invoices.map((invoice) => {
                      const displayStatus = getInvoiceDisplayStatus(invoice.status, invoice.due_date);
                      return (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <p className="font-medium">{invoice.display_number}</p>
                            <p className="text-sm text-muted-foreground">
                              Due {safeFormatDate(invoice.due_date, "MMM d, yyyy")}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge className={invoiceStatusColors[displayStatus]}>
                              {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                            </Badge>
                            <span className="font-semibold">{formatCurrency(invoice.total)}</span>
                            {(displayStatus === "pending" || displayStatus === "overdue") && (
                              <Link
                                to={`/invoice/${(invoice as any).portal_token || ""}`}
                                className="shrink-0"
                              >
                                <Button size="sm" variant="default" className="gap-1.5">
                                  <CreditCard className="h-3.5 w-3.5" />
                                  Pay
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {isDataLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : portalData?.payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No payments found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {portalData?.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium">{formatCurrency(payment.amount)}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(payment.payment_date), "MMM d, yyyy")}
                              {payment.payment_method && ` • ${payment.payment_method.replace("_", " ")}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{payment.display_number}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
