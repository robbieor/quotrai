// Dashboard API Response Types
export interface DashboardData {
    thisWeek: {
        revenue: number;
        expenses: number;
        profit: number;
    };
    lastWeek: {
        revenue: number;
        expenses: number;
        profit: number;
    };
    outstanding: {
        count: number;
        overdueCount: number;
        total: number;
        invoices: Array<Invoice & { client: Client | null }>;
    };
    recentInvoices: Array<Invoice & { client: Client | null }>;
    recentExpenses: Expense[];
    ytd: {
        revenue: number;
        invoiced: number;
        expenses: number;
        profit: number;
    };
    monthly: {
        revenue: number;
        invoiced: number;
        expenses: number;
        profit: number;
    };
    aging: {
        current: number;
        days30: number;
        days60: number;
        days90Plus: number;
    };
    summary: {
        totalClients: number;
        totalInvoices: number;
        averageInvoiceValue: number;
    };
    quotes: {
        total: number;
        open: number;
        openTotal: number;
    };
    variations: {
        pending: number;
        approved: number;
        invoiced: number;
        totalValue: number;
        pendingValue: number;
    };
    cashPayments: {
        ytdTotal: number;
        ytdCount: number;
        monthlyTotal: number;
        monthlyCount: number;
        thisWeekTotal: number;
        thisWeekCount: number;
        recentPayments: any[];
    };
    needsAttention: {
        expiringQuotes: any[];
        upcomingOverdue: any[];
    };
    timeTracking: {
        todayMinutes: number;
        weekMinutes: number;
        todayEntries: number;
        weekEntries: number;
    };
}

export interface Client {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    address: string | null;
    eircode: string | null;
    latitude: number | null;
    longitude: number | null;
    paymentTerms: number;
    notes: string | null;
}

export interface Invoice {
    id: number;
    invoiceNumber: string;
    clientId: number | null;
    clientName?: string;
    total: string;
    date: string;
    dueDate: string;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    createdAt: string;
    paidDate?: string | null;
}

export interface Expense {
    id: number;
    description: string;
    amount: string;
    date: string;
    category: string;
    vendor?: string;
}

export interface Quote {
    id: number;
    quoteNumber: string;
    clientId: number | null;
    total: string;
    date: string;
    validUntil: string | null;
    status: 'draft' | 'open' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
    createdAt: string;
    notes?: string | null;
}

export interface Job {
    id: number;
    userId: string;
    organizationId: number | null;
    clientId: number;
    title: string;
    description: string | null;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    date: string;
    startTime: string | null;
    estimatedDuration: string | null;
    createdAt: string;
    updatedAt: string;
}

export type JobWithClient = Job & { client: Client };

export interface TimeEntry {
    id: number;
    userId: string;
    clientId: number | null;
    clientName?: string;
    jobId: number | null;
    jobTitle?: string;
    invoiceId: number | null;
    description: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    duration: number;
    hourlyRate: string;
    amount: string;
    isBillable: boolean;
    isBilled: boolean;
    notes: string | null;
    createdAt: string;
}

export interface ClockEntry {
    id: number;
    userId: string;
    jobId: number | null;
    clockInTime: string;
    clockOutTime: string | null;
    clockInLatitude: string | null;
    clockInLongitude: string | null;
    clockInAddress: string | null;
    clockOutLatitude: string | null;
    clockOutLongitude: string | null;
    clockOutAddress: string | null;
    totalMinutes: number | null;
    breakMinutes: number;
    billableMinutes: number | null;
    status: 'active' | 'completed' | 'invoiced' | 'flagged';
    workDescription: string | null;
    notes: string | null;
}

export interface Material {
    id: number;
    name: string;
    description: string | null;
    unit: string;
    unitPrice: string;
    category: string | null;
}

export interface TeamMember {
    id: number;
    userId: number;
    organizationId: number;
    role: string;
    status: string;
    user?: {
        id: number;
        email: string;
    };
}
