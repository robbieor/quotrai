import { useEffect, useState, useCallback } from "react";
import { 
  Briefcase, 
  FileText, 
  Receipt, 
  TrendingUp,
  CheckCircle2,
  Clock,
  DollarSign,
  Bot,
  Send,
  Mic,
  Calendar,
  User,
  ArrowRight,
  Sparkles,
  MessageSquare
} from "lucide-react";

// View types
type ViewType = "dashboard" | "quotes" | "invoices" | "tom";

const views: { id: ViewType; label: string; icon: typeof Briefcase }[] = [
  { id: "dashboard", label: "Dashboard", icon: Briefcase },
  { id: "quotes", label: "Quotes", icon: FileText },
  { id: "invoices", label: "Invoices", icon: Receipt },
  { id: "tom", label: "Foreman AI", icon: Bot },
];

const mockMetrics = [
  { label: "Active Jobs", value: "12", icon: Briefcase, trend: "+3 this week" },
  { label: "Revenue MTD", value: "€24,580", icon: DollarSign, trend: "+18%" },
  { label: "Pending Quotes", value: "8", icon: FileText, trend: "€12,400 value" },
  { label: "Due Invoices", value: "4", icon: Receipt, trend: "€6,200 total" },
];

const mockActivities = [
  { text: "Quote accepted by James Wilson", time: "2 min ago", type: "success" },
  { text: "New job scheduled: Kitchen Renovation", time: "15 min ago", type: "info" },
  { text: "Payment received: €1,850", time: "1 hour ago", type: "success" },
  { text: "Invoice sent to Sarah Mitchell", time: "2 hours ago", type: "info" },
];

const mockChartData = [
  { month: "Aug", value: 65 },
  { month: "Sep", value: 78 },
  { month: "Oct", value: 82 },
  { month: "Nov", value: 95 },
  { month: "Dec", value: 88 },
  { month: "Jan", value: 110 },
];

const mockQuotes = [
  { number: "Q-0048", customer: "James Wilson", title: "Boiler Service", amount: "€340.00", status: "sent" },
  { number: "Q-0047", customer: "Sarah Mitchell", title: "EV Charger Installation", amount: "€1,240.00", status: "pending" },
  { number: "Q-0046", customer: "Tom Henderson", title: "Bathroom Renovation", amount: "€4,850.00", status: "accepted" },
];

const mockInvoices = [
  { number: "INV-0034", customer: "Emma Roberts", title: "Kitchen Rewiring", amount: "€2,150.00", status: "paid", paidDate: "Today" },
  { number: "INV-0033", customer: "David Clark", title: "Emergency Repair", amount: "€185.00", status: "overdue", daysOverdue: 7 },
  { number: "INV-0032", customer: "Lisa Thompson", title: "Annual Maintenance", amount: "€450.00", status: "pending" },
];

const tomConversation = [
  { role: "user", text: "What's my day look like?" },
  { role: "assistant", text: "Good morning, Mike! Here's your briefing:", typing: false },
  { role: "assistant", text: "📅 3 jobs scheduled today\n💰 £1,240 in pending quotes\n⚠️ 1 invoice overdue (7 days)", typing: false },
  { role: "user", text: "Create a quote for Mrs. Patterson using the boiler template" },
  { role: "assistant", text: "Done! Quote #Q-0049 created for £340. Want me to send it now?", typing: false },
];

export function DashboardShowcase() {
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [animatedMetric, setAnimatedMetric] = useState(0);
  const [visibleActivities, setVisibleActivities] = useState(0);
  const [chartProgress, setChartProgress] = useState(0);
  const [visibleQuotes, setVisibleQuotes] = useState(0);
  const [visibleInvoices, setVisibleInvoices] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const resetAnimations = useCallback(() => {
    setAnimatedMetric(0);
    setVisibleActivities(0);
    setChartProgress(0);
    setVisibleQuotes(0);
    setVisibleInvoices(0);
    setVisibleMessages(0);
  }, []);

  const runAnimations = useCallback((view: ViewType) => {
    resetAnimations();
    
    if (view === "dashboard") {
      const metricInterval = setInterval(() => {
        setAnimatedMetric((prev) => (prev < mockMetrics.length ? prev + 1 : prev));
      }, 200);
      const activityInterval = setInterval(() => {
        setVisibleActivities((prev) => (prev < mockActivities.length ? prev + 1 : prev));
      }, 300);
      setTimeout(() => setChartProgress(100), 300);
      return () => {
        clearInterval(metricInterval);
        clearInterval(activityInterval);
      };
    } else if (view === "quotes") {
      const quoteInterval = setInterval(() => {
        setVisibleQuotes((prev) => (prev < mockQuotes.length ? prev + 1 : prev));
      }, 250);
      return () => clearInterval(quoteInterval);
    } else if (view === "invoices") {
      const invoiceInterval = setInterval(() => {
        setVisibleInvoices((prev) => (prev < mockInvoices.length ? prev + 1 : prev));
      }, 250);
      return () => clearInterval(invoiceInterval);
    } else if (view === "tom") {
      const messageInterval = setInterval(() => {
        setVisibleMessages((prev) => (prev < tomConversation.length ? prev + 1 : prev));
      }, 400);
      return () => clearInterval(messageInterval);
    }
  }, [resetAnimations]);

  // Auto-cycle through views
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentView((current) => {
            const currentIndex = views.findIndex((v) => v.id === current);
            const nextIndex = (currentIndex + 1) % views.length;
            return views[nextIndex].id;
          });
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Run animations when view changes
  useEffect(() => {
    const cleanup = runAnimations(currentView);
    return cleanup;
  }, [currentView, runAnimations]);

  const handleViewClick = (view: ViewType) => {
    setCurrentView(view);
    setProgress(0);
    setIsPaused(true);
    // Resume auto-cycle after 8 seconds of inactivity
    setTimeout(() => setIsPaused(false), 8000);
  };

  const maxChartValue = Math.max(...mockChartData.map((d) => d.value));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
      case "paid":
        return "bg-green-500/10 text-green-600";
      case "sent":
      case "pending":
        return "bg-amber-500/10 text-amber-600";
      case "overdue":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Browser chrome effect */}
      <div 
        className="rounded-xl overflow-hidden shadow-2xl border border-border/50 bg-background"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Browser header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-background rounded-md px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              app.quotr.ai/{currentView === "tom" ? "foreman-ai" : currentView}
            </div>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border/50 bg-muted/20">
          {views.map((view) => {
            const isActive = currentView === view.id;
            const viewIndex = views.findIndex((v) => v.id === view.id);
            const currentIndex = views.findIndex((v) => v.id === currentView);
            
            return (
              <button
                key={view.id}
                onClick={() => handleViewClick(view.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <view.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{view.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-100 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="p-4 md:p-6 bg-background min-h-[320px] md:min-h-[380px]">
          {/* Dashboard View */}
          {currentView === "dashboard" && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Good morning, Mike</h3>
                  <p className="text-sm text-muted-foreground">Here's your business at a glance</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="hidden sm:inline">Foreman AI is ready</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {mockMetrics.map((metric, index) => (
                  <div
                    key={metric.label}
                    className={`p-3 rounded-lg border border-border/50 bg-card transition-all duration-500 ${
                      index < animatedMetric
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-4"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <metric.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground">{metric.label}</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">{metric.value}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      {metric.trend}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border/50 bg-card">
                  <h4 className="text-sm font-medium text-foreground mb-3">Monthly Revenue</h4>
                  <div className="flex items-end gap-2 h-24">
                    {mockChartData.map((data, index) => (
                      <div key={data.month} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-primary/20 rounded-t-sm overflow-hidden" style={{ height: "100%" }}>
                          <div
                            className="w-full bg-gradient-to-t from-primary to-primary/70 rounded-t-sm transition-all duration-1000 ease-out"
                            style={{
                              height: `${(chartProgress / 100) * (data.value / maxChartValue) * 100}%`,
                              transitionDelay: `${index * 100}ms`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{data.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border/50 bg-card">
                  <h4 className="text-sm font-medium text-foreground mb-3">Recent Activity</h4>
                  <div className="space-y-2">
                    {mockActivities.slice(0, 3).map((activity, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-2 transition-all duration-500 ${
                          index < visibleActivities ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                        }`}
                      >
                        <div className={`mt-0.5 p-1 rounded-full ${activity.type === "success" ? "bg-green-500/10" : "bg-blue-500/10"}`}>
                          {activity.type === "success" ? (
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{activity.text}</p>
                          <p className="text-[10px] text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quotes View */}
          {currentView === "quotes" && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Quotes</h3>
                  <p className="text-sm text-muted-foreground">8 pending • £12,400 total value</p>
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">New Quote</span>
                </button>
              </div>

              <div className="space-y-3">
                {mockQuotes.map((quote, index) => (
                  <div
                    key={quote.number}
                    className={`p-4 rounded-lg border border-border/50 bg-card transition-all duration-500 hover:border-primary/30 ${
                      index < visibleQuotes ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">{quote.number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(quote.status)}`}>
                            {quote.status}
                          </span>
                        </div>
                        <p className="text-sm text-foreground truncate">{quote.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{quote.customer}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{quote.amount}</p>
                        {quote.status === "pending" && (
                          <button className="flex items-center gap-1 text-xs text-primary mt-1">
                            <Send className="w-3 h-3" />
                            Send
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices View */}
          {currentView === "invoices" && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Invoices</h3>
                  <p className="text-sm text-muted-foreground">£6,200 outstanding • 1 overdue</p>
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                  <Receipt className="w-4 h-4" />
                  <span className="hidden sm:inline">New Invoice</span>
                </button>
              </div>

              <div className="space-y-3">
                {mockInvoices.map((invoice, index) => (
                  <div
                    key={invoice.number}
                    className={`p-4 rounded-lg border border-border/50 bg-card transition-all duration-500 hover:border-primary/30 ${
                      index < visibleInvoices ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">{invoice.number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(invoice.status)}`}>
                            {invoice.status === "overdue" ? `${invoice.daysOverdue}d overdue` : invoice.status}
                          </span>
                        </div>
                        <p className="text-sm text-foreground truncate">{invoice.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{invoice.customer}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{invoice.amount}</p>
                        {invoice.status === "paid" && (
                          <p className="text-xs text-green-600 mt-1">Paid {invoice.paidDate}</p>
                        )}
                        {invoice.status === "overdue" && (
                          <button className="flex items-center gap-1 text-xs text-primary mt-1 ml-auto">
                            <Send className="w-3 h-3" />
                            Remind
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Foreman AI View */}
          {currentView === "tom" && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Foreman AI</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Your AI assistant • 25+ skills
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {tomConversation.map((message, index) => (
                  <div
                    key={index}
                    className={`transition-all duration-500 ${
                      index < visibleMessages ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}
                  >
                    {message.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%]">
                          <p className="text-sm">{message.text}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2 max-w-[80%]">
                          <p className="text-sm text-foreground whitespace-pre-line">{message.text}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                <div className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Tell Foreman AI what you need...
                </div>
                <button className="h-10 w-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors">
                  <Mic className="h-5 w-5 text-primary-foreground" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating elements for depth */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-2xl" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-tr from-teal-500/20 to-teal-500/5 rounded-full blur-2xl" />
    </div>
  );
}
