import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useXeroSync } from "@/hooks/useXeroSync";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2, Users } from "lucide-react";
import { CustomerFormDialog, type CustomerFormSubmitValues } from "@/components/customers/CustomerFormDialog";
import { DeleteCustomerDialog } from "@/components/customers/DeleteCustomerDialog";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { CustomerListItem } from "@/components/customers/CustomerListItem";
import { EmptyState } from "@/components/shared/EmptyState";
import { ReadOnlyGuard } from "@/components/auth/ReadOnlyGuard";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  type Customer,
} from "@/hooks/useCustomers";

export default function Customers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const isMobile = useIsMobile();

  const { syncContact } = useXeroSync();
  const { data: customers, isLoading, error } = useCustomers();
  const createCustomer = useCreateCustomer(syncContact);
  const updateCustomer = useUpdateCustomer(syncContact);
  const deleteCustomer = useDeleteCustomer();

  const filteredCustomers = customers?.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (values: CustomerFormSubmitValues) => {
    const { geocodedAddress, ...baseData } = values;
    const customerData = {
      ...baseData,
      latitude: geocodedAddress?.latitude,
      longitude: geocodedAddress?.longitude,
      country_code: geocodedAddress?.countryCode,
    };
    createCustomer.mutate(customerData, {
      onSuccess: () => {
        setFormDialogOpen(false);
      },
    });
  };

  const handleInlineUpdate = (id: string, field: keyof Customer, value: string) => {
    updateCustomer.mutate({ id, [field]: value });
  };

  const handleDelete = () => {
    if (selectedCustomer) {
      deleteCustomer.mutate(selectedCustomer.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSelectedCustomer(null);
        },
      });
    }
  };

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const handleMobileCustomerTap = (customer: Customer) => {
    setEditCustomer(customer);
    setFormDialogOpen(true);
  };

  const customerCount = filteredCustomers?.length ?? customers?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-[28px] font-bold tracking-[-0.02em] text-foreground">Customers</h1>
            {!isLoading && (
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {customerCount} customer{customerCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <ReadOnlyGuard>
            {isMobile ? (
              <Button
                size="sm"
                onClick={() => { setEditCustomer(null); setFormDialogOpen(true); }}
                className="h-9 gap-1.5"
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
            ) : (
              <Button onClick={() => { setEditCustomer(null); setFormDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            )}
          </ReadOnlyGuard>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className={isMobile ? "pl-10 h-11 rounded-[22px] bg-muted/50" : "pl-9"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            Failed to load customers. Please try again.
          </div>
        ) : filteredCustomers?.length === 0 ? (
          <EmptyState
            icon={Users}
            title={searchQuery ? "No customers found" : "Build your customer list"}
            description={searchQuery ? "Try a different search term." : "Add your customers to start creating quotes, jobs, and invoices — everything links back to them."}
            actionLabel={!searchQuery ? "Add Your First Customer" : undefined}
            onAction={!searchQuery ? () => { setEditCustomer(null); setFormDialogOpen(true); } : undefined}
          />
        ) : isMobile ? (
          <div className="bg-card rounded-[14px] border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden -mx-1">
            {filteredCustomers?.map((customer, i) => (
              <CustomerListItem
                key={customer.id}
                customer={customer}
                onClick={handleMobileCustomerTap}
                isLast={i === (filteredCustomers.length - 1)}
              />
            ))}
          </div>
        ) : (
          <CustomersTable
            customers={filteredCustomers || []}
            onUpdate={handleInlineUpdate}
            onDelete={openDeleteDialog}
            isUpdating={updateCustomer.isPending}
          />
        )}
      </div>

      <CustomerFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) setEditCustomer(null);
        }}
        customer={editCustomer}
        onSubmit={handleCreate}
        isLoading={createCustomer.isPending}
      />

      <DeleteCustomerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        customer={selectedCustomer}
        onConfirm={handleDelete}
        isLoading={deleteCustomer.isPending}
      />
    </DashboardLayout>
  );
}
