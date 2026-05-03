import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Users, 
  FileText, 
  ClipboardList,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Info,
  ArrowRight,
  ArrowLeft,
  Eye,
  FileStack,
  FileBarChart
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ImportType = "customers" | "invoices" | "quotes" | "jobs";
type ImportMode = "header_only" | "header_with_items";

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  warnings: string[];
}

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  rawRows: string[][];
}

interface ColumnMapping {
  csvColumn: string;
  dbField: string | null;
}

const hasItemMode = (type: ImportType) => type === "invoices" || type === "quotes";

const HEADER_ONLY_FIELDS: Record<string, { required: string[]; optional: string[] }> = {
  invoices: {
    required: ["customer_email", "display_number", "issue_date", "total"],
    optional: ["due_date", "status", "notes", "tax_rate", "subtotal", "tax_amount"],
  },
  quotes: {
    required: ["customer_email", "display_number", "total"],
    optional: ["valid_until", "status", "notes", "tax_rate", "subtotal", "tax_amount"],
  },
};

const ITEM_EXTRA_FIELDS = {
  required: ["description", "quantity", "unit_price"],
  optional: ["line_total", "tax_rate"],
};

interface ImportConfig {
  label: string;
  icon: React.ElementType;
  description: string;
  requiredColumns: string[];
  optionalColumns: string[];
  sampleData: Record<string, string>[];
}

const IMPORT_CONFIGS: Record<ImportType, ImportConfig> = {
  customers: {
    label: "Customers",
    icon: Users,
    description: "Import your client contact list",
    requiredColumns: ["name", "email"],
    optionalColumns: ["phone", "contact_person", "address", "notes"],
    sampleData: [
      { name: "Acme Construction", email: "info@acme.ie", phone: "+353 1 234 5678", contact_person: "John Murphy", address: "123 Main St, Dublin", notes: "Key account" },
      { name: "Build Right Ltd", email: "contact@buildright.ie", phone: "+353 1 987 6543", contact_person: "Mary O'Brien", address: "45 Oak Avenue, Cork", notes: "" }
    ]
  },
  invoices: {
    label: "Invoices",
    icon: FileText,
    description: "Import historical invoices (with or without line items)",
    requiredColumns: ["customer_email", "display_number", "issue_date", "total"],
    optionalColumns: ["due_date", "status", "notes", "tax_rate", "subtotal", "tax_amount"],
    sampleData: [
      { customer_email: "info@acme.ie", display_number: "INV-001", issue_date: "2024-01-15", due_date: "2024-01-29", total: "1500.00", status: "paid", notes: "Emergency repair", tax_rate: "23", subtotal: "1219.51", tax_amount: "280.49" },
      { customer_email: "contact@buildright.ie", display_number: "INV-002", issue_date: "2024-02-01", due_date: "2024-02-15", total: "2300.00", status: "sent", notes: "", tax_rate: "23", subtotal: "1869.92", tax_amount: "430.08" }
    ]
  },
  quotes: {
    label: "Quotes",
    icon: ClipboardList,
    description: "Import estimates and quotes (with or without line items)",
    requiredColumns: ["customer_email", "display_number", "total"],
    optionalColumns: ["valid_until", "status", "notes", "tax_rate", "subtotal", "tax_amount"],
    sampleData: [
      { customer_email: "info@acme.ie", display_number: "Q-001", total: "3500.00", valid_until: "2024-03-01", status: "sent", notes: "Kitchen renovation", tax_rate: "23", subtotal: "2845.53", tax_amount: "654.47" },
      { customer_email: "contact@buildright.ie", display_number: "Q-002", total: "1200.00", valid_until: "2024-03-15", status: "accepted", notes: "Plumbing work", tax_rate: "23", subtotal: "975.61", tax_amount: "224.39" }
    ]
  },
  jobs: {
    label: "Jobs",
    icon: Briefcase,
    description: "Import scheduled jobs",
    requiredColumns: ["customer_email", "title"],
    optionalColumns: ["description", "status", "scheduled_date", "scheduled_time", "estimated_value"],
    sampleData: [
      { customer_email: "info@acme.ie", title: "Boiler Service", description: "Annual boiler maintenance", status: "scheduled", scheduled_date: "2024-02-10", scheduled_time: "09:00", estimated_value: "150.00" },
      { customer_email: "contact@buildright.ie", title: "Emergency Repair", description: "Fix leaking pipe", status: "completed", scheduled_date: "2024-01-20", scheduled_time: "14:00", estimated_value: "250.00" }
    ]
  }
};

function getFieldsForMode(type: ImportType, mode: ImportMode): { required: string[]; optional: string[] } {
  if (!hasItemMode(type) || mode === "header_only") {
    const cfg = IMPORT_CONFIGS[type];
    return { required: cfg.requiredColumns, optional: cfg.optionalColumns };
  }
  const base = HEADER_ONLY_FIELDS[type];
  return {
    required: [...base.required, ...ITEM_EXTRA_FIELDS.required],
    optional: [...base.optional, ...ITEM_EXTRA_FIELDS.optional.filter(f => !base.optional.includes(f))],
  };
}

function generateCSVTemplate(type: ImportType, mode: ImportMode = "header_only"): string {
  const { required, optional } = getFieldsForMode(type, mode);
  const allColumns = [...required, ...optional];
  const header = allColumns.join(",");

  if (mode === "header_with_items" && hasItemMode(type)) {
    const sampleDisplayNumber = type === "invoices" ? "INV-001" : "Q-001";
    const rows = [
      allColumns.map(col => {
        const vals: Record<string, string> = {
          customer_email: "info@acme.ie", display_number: sampleDisplayNumber,
          issue_date: "2024-01-15", total: "1500.00", due_date: "2024-01-29", status: "paid",
          valid_until: "2024-03-01", description: "Labour - 3 hours", quantity: "3", unit_price: "65.00",
          tax_rate: "23", subtotal: "1219.51", tax_amount: "280.49", notes: "",
        };
        return vals[col] || "";
      }).join(","),
      allColumns.map(col => {
        const vals: Record<string, string> = {
          customer_email: "info@acme.ie", display_number: sampleDisplayNumber,
          issue_date: "2024-01-15", total: "1500.00", due_date: "2024-01-29", status: "paid",
          valid_until: "2024-03-01", description: "Replacement parts", quantity: "1", unit_price: "250.00",
          tax_rate: "23", subtotal: "1219.51", tax_amount: "280.49", notes: "",
        };
        return vals[col] || "";
      }).join(","),
    ];
    return [header, ...rows].join("\n");
  }

  const cfg = IMPORT_CONFIGS[type];
  const rows = cfg.sampleData.map(row =>
    allColumns.map(col => {
      const value = row[col] || "";
      if (value.includes(",") || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(",")
  );
  return [header, ...rows].join("\n");
}

function downloadTemplate(type: ImportType, mode: ImportMode = "header_only") {
  const csv = generateCSVTemplate(type, mode);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const suffix = hasItemMode(type) && mode === "header_with_items" ? "_with_items" : "";
  link.download = `${type}${suffix}_import_template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(`${IMPORT_CONFIGS[type].label} template downloaded`);
}

function parseCSV(text: string): ParsedData {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [], rawRows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/\s+/g, "_"));
  const rawRows = lines.slice(1).map(parseLine);
  const rows = rawRows.map(values => {
    const row: Record<string, string> = {};
    headers.forEach((header, i) => { row[header] = values[i] || ""; });
    return row;
  });
  return { headers, rows, rawRows };
}

function autoMapColumns(csvHeaders: string[], dbFields: string[]): ColumnMapping[] {
  return csvHeaders.map(csvCol => {
    const normalized = csvCol.toLowerCase().replace(/\s+/g, "_");
    const exactMatch = dbFields.find(f => f === normalized);
    if (exactMatch) return { csvColumn: csvCol, dbField: exactMatch };
    const partialMatch = dbFields.find(f => normalized.includes(f) || f.includes(normalized));
    return { csvColumn: csvCol, dbField: partialMatch || null };
  });
}

function applyMapping(rows: Record<string, string>[], mappings: ColumnMapping[]): Record<string, string>[] {
  return rows.map(row => {
    const newRow: Record<string, string> = {};
    mappings.forEach(mapping => {
      if (mapping.dbField) {
        const csvKey = mapping.csvColumn.toLowerCase().replace(/\s+/g, "_");
        newRow[mapping.dbField] = row[csvKey] || "";
      }
    });
    return newRow;
  });
}

type WizardStep = "upload" | "mode" | "mapping" | "preview";

export function DataImportSection() {
  const [activeType, setActiveType] = useState<ImportType>("customers");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("header_only");

  const [step, setStep] = useState<WizardStep>("upload");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);

  const showModeStep = hasItemMode(activeType);
  const { required: activeRequired, optional: activeOptional } = getFieldsForMode(activeType, importMode);
  const allDbFields = [...activeRequired, ...activeOptional];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) { toast.error("Please upload a CSV file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be less than 5MB"); return; }

    try {
      const text = await file.text();
      const data = parseCSV(text);
      if (data.rows.length === 0) { toast.error("No data rows found in the CSV file"); return; }
      setParsedData(data);
      setResult(null);
      if (showModeStep) {
        setStep("mode");
      } else {
        const mappings = autoMapColumns(data.headers, allDbFields);
        setColumnMappings(mappings);
        setStep("mapping");
      }
    } catch {
      toast.error("Failed to parse CSV file");
    }
    event.target.value = "";
  };

  const handleModeConfirm = () => {
    if (!parsedData) return;
    const fields = getFieldsForMode(activeType, importMode);
    const all = [...fields.required, ...fields.optional];
    const mappings = autoMapColumns(parsedData.headers, all);
    setColumnMappings(mappings);
    setStep("mapping");
  };

  const handleMappingChange = (csvColumn: string, dbField: string | null) => {
    setColumnMappings(prev => prev.map(m => m.csvColumn === csvColumn ? { ...m, dbField } : m));
  };

  const validateMappings = (): string[] => {
    const errors: string[] = [];
    const mappedFields = columnMappings.filter(m => m.dbField).map(m => m.dbField);
    activeRequired.forEach(req => {
      if (!mappedFields.includes(req)) errors.push(`Required field "${req}" is not mapped`);
    });
    const duplicates = mappedFields.filter((f, i) => mappedFields.indexOf(f) !== i);
    if (duplicates.length > 0) errors.push(`Duplicate mappings: ${[...new Set(duplicates)].join(", ")}`);
    return errors;
  };

  const handleProceedToPreview = () => {
    const errors = validateMappings();
    if (errors.length > 0) { toast.error(errors[0]); return; }
    setStep("preview");
  };

  const handleImport = async () => {
    if (!parsedData) return;
    setIsImporting(true);
    setProgress(10);

    try {
      const mappedRows = applyMapping(parsedData.rows, columnMappings);
      setProgress(30);

      const body: Record<string, unknown> = { type: activeType, rows: mappedRows };
      if (showModeStep) body.mode = importMode;

      const { data, error } = await supabase.functions.invoke("import-data", { body });
      setProgress(100);
      if (error) throw error;

      setResult(data as ImportResult);
      if (data.success) {
        toast.success(`Successfully imported ${data.imported} ${IMPORT_CONFIGS[activeType].label.toLowerCase()}`);
        resetImport();
      }
    } catch (error: unknown) {
      console.error("Import error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to import data";
      setResult({ success: false, imported: 0, errors: [errorMessage], warnings: [] });
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setStep("upload");
    setParsedData(null);
    setColumnMappings([]);
    setImportMode("header_only");
  };

  const getMappedPreviewData = (): Record<string, string>[] => {
    if (!parsedData) return [];
    return applyMapping(parsedData.rows.slice(0, 5), columnMappings);
  };

  const mappingErrors = validateMappings();
  const previewData = getMappedPreviewData();
  const mappedDbFields = columnMappings.filter(m => m.dbField).map(m => m.dbField!);

  const steps: { key: WizardStep; label: string }[] = showModeStep
    ? [{ key: "upload", label: "1. Upload" }, { key: "mode", label: "2. Data Mode" }, { key: "mapping", label: "3. Map Columns" }, { key: "preview", label: "4. Preview & Import" }]
    : [{ key: "upload", label: "1. Upload" }, { key: "mapping", label: "2. Map Columns" }, { key: "preview", label: "3. Preview & Import" }];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Data Import
        </CardTitle>
        <CardDescription>
          Import your existing data from CSV files. Download a template, fill it in, and upload to migrate your data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeType} onValueChange={(v) => { setActiveType(v as ImportType); resetImport(); setResult(null); }}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto gap-1">
            {(Object.keys(IMPORT_CONFIGS) as ImportType[]).map((type) => {
              const cfg = IMPORT_CONFIGS[type];
              const Icon = cfg.icon;
              return (
                <TabsTrigger key={type} value={type} className="gap-1 text-xs sm:text-sm px-2 py-1.5" disabled={step !== "upload"}>
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  {cfg.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(IMPORT_CONFIGS) as ImportType[]).map((type) => {
            const cfg = IMPORT_CONFIGS[type];
            return (
              <TabsContent key={type} value={type} className="space-y-4 mt-4">
                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
                  {steps.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-2">
                      <Badge variant={step === s.key ? "default" : "secondary"} className="gap-1">
                        {s.label}
                      </Badge>
                      {i < steps.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  ))}
                </div>

                {/* Step: Upload */}
                {step === "upload" && (
                  <>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-medium">{cfg.label} Import</h3>
                          <p className="text-sm text-muted-foreground">{cfg.description}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => downloadTemplate(type, importMode)} className="gap-2 shrink-0">
                          <Download className="h-4 w-4" />
                          Download Template
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-muted-foreground">Required:</span>
                        {cfg.requiredColumns.map(col => (
                          <Badge key={col} variant="default" className="text-xs">{col}</Badge>
                        ))}
                      </div>
                      {cfg.optionalColumns.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          <span className="text-sm text-muted-foreground">Optional:</span>
                          {cfg.optionalColumns.map(col => (
                            <Badge key={col} variant="secondary" className="text-xs">{col}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" id={`file-upload-${type}`} />
                      <label htmlFor={`file-upload-${type}`} className="cursor-pointer flex flex-col items-center gap-2">
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <span className="text-sm font-medium">Click to upload CSV</span>
                        <span className="text-xs text-muted-foreground">Maximum file size: 5MB</span>
                      </label>
                    </div>
                  </>
                )}

                {/* Step: Mode Selection (invoices/quotes only) */}
                {step === "mode" && showModeStep && parsedData && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">How complete is your data?</h3>
                        <p className="text-sm text-muted-foreground">Found {parsedData.rows.length} rows in your CSV.</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={resetImport} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setImportMode("header_only")}
                        className={`border rounded-lg p-4 text-left transition-colors ${importMode === "header_only" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <FileBarChart className="h-5 w-5 text-primary" />
                          <span className="font-medium">Header only</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          I only have totals and basic info (historical records). No line item detail needed.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportMode("header_with_items")}
                        className={`border rounded-lg p-4 text-left transition-colors ${importMode === "header_with_items" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <FileStack className="h-5 w-5 text-primary" />
                          <span className="font-medium">Header + line items</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          My CSV includes line item detail per {type === "invoices" ? "invoice" : "quote"} (one row per item, header fields repeated).
                        </p>
                      </button>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {importMode === "header_only"
                          ? "Historical imports preserve your records as-is. New records created in Revamo will use structured line items."
                          : `Each line item row should repeat the ${type === "invoices" ? "invoice" : "quote"} number. Items will be grouped and linked automatically.`
                        }
                      </AlertDescription>
                    </Alert>

                    <div className="flex justify-between">
                      <Button variant="outline" size="sm" onClick={() => downloadTemplate(type, importMode)} className="gap-2">
                        <Download className="h-4 w-4" />
                        Download {importMode === "header_with_items" ? "Items" : "Header"} Template
                      </Button>
                      <Button onClick={handleModeConfirm} className="gap-2">
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step: Column Mapping */}
                {step === "mapping" && parsedData && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Map Your Columns</h3>
                        <p className="text-sm text-muted-foreground">
                          Match your CSV columns to the database fields. Found {parsedData.rows.length} rows.
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setStep(showModeStep ? "mode" : "upload")} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                    </div>

                    {mappingErrors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Mapping Issues</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc list-inside mt-1">
                            {mappingErrors.map((err, i) => <li key={i}>{err}</li>)}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-1/3">CSV Column</TableHead>
                            <TableHead className="w-1/6 text-center">→</TableHead>
                            <TableHead className="w-1/3">Database Field</TableHead>
                            <TableHead className="w-1/6">Sample</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {columnMappings.map((mapping) => {
                            const sampleValue = parsedData.rows[0]?.[mapping.csvColumn.toLowerCase().replace(/\s+/g, "_")] || "";
                            return (
                              <TableRow key={mapping.csvColumn}>
                                <TableCell className="font-medium">{mapping.csvColumn}</TableCell>
                                <TableCell className="text-center">
                                  <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
                                </TableCell>
                                <TableCell>
                                  <Select value={mapping.dbField || "skip"} onValueChange={(v) => handleMappingChange(mapping.csvColumn, v === "skip" ? null : v)}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Skip this column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="skip">
                                        <span className="text-muted-foreground">Skip this column</span>
                                      </SelectItem>
                                      {allDbFields.map(field => {
                                        const alreadyMapped = columnMappings.some(m => m.dbField === field && m.csvColumn !== mapping.csvColumn);
                                        const isReq = activeRequired.includes(field);
                                        return (
                                          <SelectItem key={field} value={field} disabled={alreadyMapped}>
                                            {field} {isReq && <span className="text-destructive">*</span>}
                                            {alreadyMapped && " (already mapped)"}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs truncate max-w-[100px]" title={sampleValue}>
                                  {sampleValue || "—"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={resetImport}>Cancel</Button>
                      <Button onClick={handleProceedToPreview} disabled={mappingErrors.length > 0} className="gap-2">
                        <Eye className="h-4 w-4" />
                        Preview Data
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step: Preview & Import */}
                {step === "preview" && parsedData && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Preview Import</h3>
                        <p className="text-sm text-muted-foreground">
                          Review the first 5 rows before importing all {parsedData.rows.length} records.
                          {showModeStep && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {importMode === "header_only" ? "Header only" : "Header + items"}
                            </Badge>
                          )}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setStep("mapping")} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Mapping
                      </Button>
                    </div>

                    {showModeStep && importMode === "header_only" && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          These records will be imported as historical summaries. No outbound emails or automations will be triggered.
                        </AlertDescription>
                      </Alert>
                    )}

                    <ScrollArea className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {mappedDbFields.map(field => (
                              <TableHead key={field} className="whitespace-nowrap">
                                {field}
                                {activeRequired.includes(field) && <span className="text-destructive ml-1">*</span>}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((row, idx) => (
                            <TableRow key={idx}>
                              {mappedDbFields.map(field => (
                                <TableCell key={field} className="max-w-[200px] truncate" title={row[field]}>
                                  {row[field] || <span className="text-muted-foreground">—</span>}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>

                    {parsedData.rows.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        ...and {parsedData.rows.length - 5} more rows
                      </p>
                    )}

                    {isImporting && (
                      <div className="space-y-2">
                        <Progress value={progress} className="h-2" />
                        <p className="text-sm text-muted-foreground text-center">Importing your data...</p>
                      </div>
                    )}

                    {result && (
                      <div className="space-y-3">
                        {result.success ? (
                          <Alert className="border-primary/50 bg-primary/10">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <AlertTitle className="text-primary">Import Successful</AlertTitle>
                            <AlertDescription>
                              Successfully imported {result.imported} {cfg.label.toLowerCase()}.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertTitle>Import Failed</AlertTitle>
                            <AlertDescription>
                              <ul className="list-disc list-inside mt-2">
                                {result.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                                {result.errors.length > 5 && <li>...and {result.errors.length - 5} more errors</li>}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}
                        {result.warnings.length > 0 && (
                          <Alert className="border-accent/50 bg-accent/10">
                            <AlertTriangle className="h-4 w-4 text-accent-foreground" />
                            <AlertTitle className="text-accent-foreground">Warnings</AlertTitle>
                            <AlertDescription>
                              <ul className="list-disc list-inside mt-2">
                                {result.warnings.slice(0, 5).map((warn, i) => <li key={i}>{warn}</li>)}
                                {result.warnings.length > 5 && <li>...and {result.warnings.length - 5} more warnings</li>}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={resetImport}>Cancel</Button>
                      <Button onClick={handleImport} disabled={isImporting} className="gap-2">
                        {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {isImporting ? "Importing..." : `Import ${parsedData.rows.length} Records`}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        {step === "upload" && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Tips for Importing</AlertTitle>
            <AlertDescription className="text-sm">
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Download the template first to see the correct column format</li>
                <li>Your column names don't need to match exactly — you can map them in the next step</li>
                <li>Dates should be in YYYY-MM-DD format (e.g., 2024-01-15)</li>
                <li>Status values: draft, sent, accepted, declined, paid, overdue</li>
                <li><strong>Invoices &amp; Quotes:</strong> choose "Header only" for historical summaries or "Header + line items" for full detail</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
