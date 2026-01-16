export interface DashboardData {
    thisMonth: {
        revenue: number;
        profit: number;
    };
    lastMonth: {
        revenue: number;
        profit: number;
    };
    outstanding: {
        amount: number;
        count: number;
    };
    jobs: {
        active: number;
        completedThisMonth: number;
    };
    quotes: {
        totalThisMonth: number;
        acceptedThisMonth: number;
    };
    upcomingDue: Array<{
        invoiceNumber: string;
        dueDate: string;
        total: string;
        clientName: string;
    }>;
}

export interface Invoice {
    id: number;
    invoiceNumber: string;
    clientName: string;
    total: string;
    dueDate: string;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    createdAt: string;
}
