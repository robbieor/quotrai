import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  FileCheck, 
  AlertTriangle,
  Download,
  Eye,
  MoreHorizontal,
  Zap,
  Flame,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, differenceInDays, isPast } from "date-fns";
import { 
  useCertificates, 
  useExpiringCertificates,
  CERTIFICATE_TYPE_SHORT_LABELS,
  type CertificateType,
  type CertificateStatus,
} from "@/hooks/useCertificates";
import { CertificateFormDialog } from "@/components/certificates/CertificateFormDialog";
import { DeleteCertificateDialog } from "@/components/certificates/DeleteCertificateDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { safeFormatDate } from "@/lib/pdf/dateUtils";

const STATUS_STYLES: Record<CertificateStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  draft: { variant: "secondary", label: "Draft" },
  issued: { variant: "default", label: "Issued" },
  expired: { variant: "destructive", label: "Expired" },
  superseded: { variant: "outline", label: "Superseded" },
};

const TYPE_ICONS: Partial<Record<CertificateType, React.ReactNode>> = {
  eicr: <Zap className="h-4 w-4" />,
  eic: <Zap className="h-4 w-4" />,
  minor_works: <Zap className="h-4 w-4" />,
  part_p: <Zap className="h-4 w-4" />,
  gas_safety: <Flame className="h-4 w-4" />,
  landlord_gas: <Flame className="h-4 w-4" />,
  rgii: <Flame className="h-4 w-4" />,
};

export default function Certificates() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CertificateType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<CertificateStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<string | null>(null);
  const [deletingCert, setDeletingCert] = useState<string | null>(null);

  const { data: certificates, isLoading } = useCertificates({
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: expiringCerts } = useExpiringCertificates(30);

  const filteredCerts = certificates?.filter((cert) =>
    cert.certificate_number.toLowerCase().includes(search.toLowerCase()) ||
    cert.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    cert.property_address.toLowerCase().includes(search.toLowerCase())
  );

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    if (isPast(expiry)) return "expired";
    const daysUntil = differenceInDays(expiry, new Date());
    if (daysUntil <= 30) return "expiring-soon";
    return "valid";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Certificates</h1>
            <p className="text-muted-foreground">
              Manage compliance certificates for your jobs
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Certificate
          </Button>
        </div>

        {/* Expiring Soon Alert */}
        {expiringCerts && expiringCerts.length > 0 && (
          <Card className="border-warning bg-warning/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
                Certificates Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {expiringCerts.length} certificate{expiringCerts.length > 1 ? "s" : ""} expiring in the next 30 days
              </p>
              <div className="flex flex-wrap gap-2">
                {expiringCerts.slice(0, 5).map((cert) => (
                  <Badge key={cert.id} variant="outline" className="bg-background">
                    {cert.certificate_number} - {cert.customer?.name} 
                    ({differenceInDays(new Date(cert.expiry_date!), new Date())} days)
                  </Badge>
                ))}
                {expiringCerts.length > 5 && (
                  <Badge variant="secondary">+{expiringCerts.length - 5} more</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search certificates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as CertificateType | "all")}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Certificate Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="eicr">EICR</SelectItem>
                  <SelectItem value="gas_safety">Gas Safety</SelectItem>
                  <SelectItem value="minor_works">Minor Works</SelectItem>
                  <SelectItem value="eic">EIC</SelectItem>
                  <SelectItem value="part_p">Part P</SelectItem>
                  <SelectItem value="landlord_gas">Landlord Gas</SelectItem>
                  <SelectItem value="rgii">RGII</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CertificateStatus | "all")}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredCerts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <FileCheck className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No certificates found</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setFormOpen(true)}
                      >
                        Create your first certificate
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCerts?.map((cert) => {
                    const expiryStatus = getExpiryStatus(cert.expiry_date);
                    return (
                      <TableRow key={cert.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="text-muted-foreground">
                              {TYPE_ICONS[cert.certificate_type] || <FileCheck className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="font-medium">{cert.certificate_number}</div>
                              <div className="text-xs text-muted-foreground">
                                {CERTIFICATE_TYPE_SHORT_LABELS[cert.certificate_type]}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{cert.customer?.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {cert.property_address}
                        </TableCell>
                        <TableCell>
                          {safeFormatDate(cert.issue_date, "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          {cert.expiry_date ? (
                            <div className="flex items-center gap-2">
                              <span className={
                                expiryStatus === "expired" ? "text-destructive" :
                                expiryStatus === "expiring-soon" ? "text-warning" : ""
                              }>
                                {safeFormatDate(cert.expiry_date, "dd MMM yyyy")}
                              </span>
                              {expiryStatus === "expiring-soon" && (
                                <AlertTriangle className="h-4 w-4 text-warning" />
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_STYLES[cert.status].variant}>
                            {STATUS_STYLES[cert.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingCert(cert.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View / Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeletingCert(cert.id)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <CertificateFormDialog
        open={formOpen || !!editingCert}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditingCert(null);
          }
        }}
        certificateId={editingCert}
      />

      {/* Delete Dialog */}
      <DeleteCertificateDialog
        open={!!deletingCert}
        onOpenChange={(open) => !open && setDeletingCert(null)}
        certificateId={deletingCert}
      />
    </DashboardLayout>
  );
}
