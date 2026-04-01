import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useXeroSync } from "@/hooks/useXeroSync";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2 } from "lucide-react";
import { CustomerFormDialog, type CustomerFormSubmitValues } from "@/components/customers/CustomerFormDialog";
import { DeleteCustomerDialog } from "@/components/customers/DeleteCustomerDialog";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Users } from "lucide-react";
import { ReadOnlyGuard } from "@/components/auth/ReadOnlyGuard";
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

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Customers</h1>
          <ReadOnlyGuard>
            <Button onClick={() => setFormDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </ReadOnlyGuard>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

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
            title={searchQuery ? "No customers match your search" : "Build your customer list"}
            description={searchQuery ? "Try a different search term to find the customer you're looking for." : "Add your customers to start creating quotes, jobs, and invoices — everything links back to them."}
            actionLabel={!searchQuery ? "Add Your First Customer" : undefined}
            onAction={!searchQuery ? () => setFormDialogOpen(true) : undefined}
          />
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
        onOpenChange={setFormDialogOpen}
        customer={null}
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