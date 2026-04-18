import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Sparkles, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FOREMAN_TOOL_LIST } from "@/lib/foremanToolList";
import {
  CAPABILITY_CATEGORIES,
  buildCapability,
  type Capability,
} from "@/lib/georgeCapabilities";
import { toast } from "sonner";

export default function GeorgeCapabilities() {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const allCapabilities = useMemo<Capability[]>(
    () => FOREMAN_TOOL_LIST.map((t) => buildCapability(t.name, t.description)),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCapabilities.filter((c) => {
      if (activeCat !== "all" && c.category !== activeCat) return false;
      if (!q) return true;
      return (
        c.friendlyName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.example.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
      );
    });
  }, [allCapabilities, query, activeCat]);

  const grouped = useMemo(() => {
    const map = new Map<string, Capability[]>();
    for (const cat of CAPABILITY_CATEGORIES) map.set(cat.id, []);
    for (const c of filtered) {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    }
    return map;
  }, [filtered]);

  const handleCopy = async (text: string, name: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedName(name);
      toast.success("Copied — paste it to George");
      setTimeout(() => setCopiedName(null), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
          <div className="flex items-center gap-3 mb-3">
            <Button asChild variant="ghost" size="icon" className="shrink-0">
              <Link to="/foreman-ai" aria-label="Back to Foreman AI">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                What George can do
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Every skill George can run for you — {allCapabilities.length} in total. Tap any example to copy it.
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search skills, e.g. ‘invoice’ or ‘book a job’"
              className="pl-9 h-11"
            />
          </div>

          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            <Badge
              variant={activeCat === "all" ? "default" : "outline"}
              onClick={() => setActiveCat("all")}
              className="cursor-pointer shrink-0 px-3 py-1.5"
            >
              All ({allCapabilities.length})
            </Badge>
            {CAPABILITY_CATEGORIES.map((cat) => {
              const count = allCapabilities.filter((c) => c.category === cat.id).length;
              if (count === 0) return null;
              return (
                <Badge
                  key={cat.id}
                  variant={activeCat === cat.id ? "default" : "outline"}
                  onClick={() => setActiveCat(cat.id)}
                  className="cursor-pointer shrink-0 px-3 py-1.5 whitespace-nowrap"
                >
                  {cat.label} ({count})
                </Badge>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No skills match “{query}”.</p>
          </div>
        )}

        {CAPABILITY_CATEGORIES.map((cat) => {
          const items = grouped.get(cat.id) ?? [];
          if (items.length === 0) return null;
          const Icon = cat.icon;
          return (
            <section key={cat.id}>
              <header className="flex items-center gap-2 mb-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-semibold">{cat.label}</h2>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </div>
              </header>

              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                {items.map((c) => (
                  <Card
                    key={c.name}
                    className="p-4 hover:shadow-md transition-shadow border-border/60"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm capitalize">
                        {c.friendlyName}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {c.description}
                    </p>
                    {c.example && (
                      <button
                        onClick={() => handleCopy(c.example, c.name)}
                        className="w-full text-left rounded-md bg-muted/60 hover:bg-muted px-3 py-2 text-xs flex items-start justify-between gap-2 group transition-colors"
                      >
                        <span className="italic text-foreground/80">
                          “{c.example}”
                        </span>
                        {copiedName === c.name ? (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 mt-0.5" />
                        )}
                      </button>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          );
        })}

        <div className="text-center pt-4 pb-12">
          <Button asChild size="lg" className="gap-2">
            <Link to="/foreman-ai">
              <Sparkles className="h-4 w-4" />
              Try it now — talk to George
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
