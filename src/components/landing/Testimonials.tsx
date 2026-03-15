import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Quote, Star } from "lucide-react";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  location: string;
  avatar?: string;
}

const testimonials: Testimonial[] = [
  {
    quote: "I used to spend 3 hours every evening doing quotes and invoices. Now Foreman AI handles it while I'm on the tools. My wife actually sees me before 9pm now.",
    author: "Declan Murphy",
    role: "Owner",
    company: "Murphy's Plumbing & Heating",
    location: "Dublin, Ireland",
  },
  {
    quote: "The GPS time tracking has been a game-changer. No more arguments with the lads about hours, and my clients love seeing exactly when we arrived and left.",
    author: "James Gallagher",
    role: "Director",
    company: "Gallagher Electrical Services",
    location: "Cork, Ireland",
  },
  {
    quote: "We've cut our admin costs by half. I've moved my office manager to customer service because Quotr does all the paperwork automatically.",
    author: "Sarah Thompson",
    role: "Managing Director",
    company: "Thompson Roofing Ltd",
    location: "Manchester, UK",
  },
  {
    quote: "Foreman AI understands the trade. I just tell it what job I've quoted and it knows exactly what materials and labour to include. It's like having a 20-year veteran in my pocket.",
    author: "Michael O'Brien",
    role: "Founder",
    company: "O'Brien Carpentry & Joinery",
    location: "Galway, Ireland",
  },
  {
    quote: "Getting paid used to take 45 days on average. Now with automatic reminders and the customer portal, we're down to 12 days. Cash flow has never been better.",
    author: "David Williams",
    role: "Owner",
    company: "Williams HVAC Solutions",
    location: "Birmingham, UK",
  },
  {
    quote: "I was sceptical about AI for trades, but Foreman AI gets it. It knows a first fix from a second fix, understands VAT on materials, and never makes me look daft in front of customers.",
    author: "Patrick Doyle",
    role: "Managing Partner",
    company: "Doyle & Sons Builders",
    location: "Belfast, UK",
  },
];

function StarRating() {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const initials = testimonial.author
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <CardContent className="p-6">
        {/* Quote icon */}
        <Quote className="absolute right-4 top-4 h-8 w-8 text-primary/10 transition-colors group-hover:text-primary/20" />

        {/* Stars */}
        <StarRating />

        {/* Quote text */}
        <blockquote className="mt-4 text-foreground/90 leading-relaxed">
          "{testimonial.quote}"
        </blockquote>


        {/* Author */}
        <div className="mt-4 flex items-center gap-3 border-t border-border/50 pt-4">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarImage src={testimonial.avatar} alt={testimonial.author} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              {testimonial.author}
            </p>
            <p className="text-sm text-muted-foreground">
              {testimonial.role}, {testimonial.company}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {testimonial.location}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Testimonials() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />

      <div className="container relative mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-4">
            <Star className="h-4 w-4 fill-primary" />
            Trusted by Trade Businesses
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Real Results from Real Tradespeople
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how trade businesses across the UK and Ireland are saving hours
            every week and getting paid faster with Quotr.
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
          ))}
        </div>

      </div>
    </section>
  );
}
