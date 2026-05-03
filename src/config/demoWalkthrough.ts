export interface DemoStep {
  id: string;
  route: string;
  narration: string;
  highlightSelector?: string;
  /** ms to wait before moving to next step after narration ends */
  pauseAfter?: number;
}

export const demoSteps: DemoStep[] = [
  {
    id: "dashboard",
    route: "/dashboard",
    narration:
      "Welcome to revamo — the all-in-one platform built for tradespeople. This is your dashboard. At a glance you can see revenue, outstanding invoices, jobs due today, and your team's recent activity. Everything updates in real time.",
    pauseAfter: 1500,
  },
  {
    id: "jobs",
    route: "/jobs",
    narration:
      "Here's the Jobs board. Create, schedule, and track every job from enquiry to completion. Each job links to a customer, quote, and invoice — so nothing falls through the cracks.",
    pauseAfter: 1500,
  },
  {
    id: "calendar",
    route: "/calendar",
    narration:
      "The drag-and-drop calendar lets you schedule jobs across your team. Week view, day view, month view — whatever works for you. Drag a job to reschedule it instantly.",
    pauseAfter: 1500,
  },
  {
    id: "quotes",
    route: "/quotes",
    narration:
      "Quotes are professional and fast. Add line items, apply tax, then send a branded PDF to your customer with one tap. They can accept or decline through a secure portal.",
    pauseAfter: 1500,
  },
  {
    id: "invoices",
    route: "/invoices",
    narration:
      "Invoicing is seamless. Convert accepted quotes into invoices automatically. Track payment status, send reminders, and accept card payments through Stripe Connect.",
    pauseAfter: 1500,
  },
  {
    id: "customers",
    route: "/customers",
    narration:
      "Your customer database stores contact details, addresses, and full job history. Inline editing makes updates instant — no forms, no friction.",
    pauseAfter: 1500,
  },
  {
    id: "expenses",
    route: "/expenses",
    narration:
      "Track every business expense. Snap a receipt photo, forward emails to your unique expense address, or import fuel card CSVs. Everything is categorised and ready for your accountant.",
    pauseAfter: 1500,
  },
  {
    id: "george",
    route: "/foreman-ai",
    narration:
      "And this is revamo AI — George. Your AI-powered assistant that can create jobs, generate quotes, look up customers, and manage your diary — all by voice or text. It's like having a foreman who never sleeps.",
    pauseAfter: 2000,
  },
  {
    id: "reports",
    route: "/reports",
    narration:
      "Finally, Reports gives you the full picture. Revenue trends, quote conversion rates, top customers, and job performance — all the data you need to grow your business.",
    pauseAfter: 1500,
  },
];
