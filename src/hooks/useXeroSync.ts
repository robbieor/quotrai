import { supabase } from "@/integrations/supabase/client";
import { useXeroConnection } from "./useXeroConnection";
import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Hook that provides auto-sync helpers for pushing data to Xero.
 * Silently syncs in the background — errors are logged, not thrown.
 */
export function useXeroSync() {
  const { connection, teamId } = useXeroConnection();
  const isConnected = !!connection.data;

  const syncContact = useCallback(
    async (customerId: string) => {
      if (!isConnected || !teamId) return;
      try {
        await supabase.functions.invoke("xero-sync", {
          body: { team_id: teamId, sync_type: "contact", entity_id: customerId },
        });
      } catch (e) {
        console.warn("[Xero] Contact sync failed:", e);
        toast.error("Xero contact sync failed");
      }
    },
    [isConnected, teamId]
  );

  const syncInvoice = useCallback(
    async (invoiceId: string) => {
      if (!isConnected || !teamId) return;
      try {
        await supabase.functions.invoke("xero-sync", {
          body: { team_id: teamId, sync_type: "invoice", entity_id: invoiceId },
        });
      } catch (e) {
        console.warn("[Xero] Invoice sync failed:", e);
        toast.error("Xero invoice sync failed");
      }
    },
    [isConnected, teamId]
  );

  const syncPayment = useCallback(
    async (paymentId: string) => {
      if (!isConnected || !teamId) return;
      try {
        await supabase.functions.invoke("xero-sync", {
          body: { team_id: teamId, sync_type: "payment", entity_id: paymentId },
        });
      } catch (e) {
        console.warn("[Xero] Payment sync failed:", e);
        toast.error("Xero payment sync failed");
      }
    },
    [isConnected, teamId]
  );

  return { isConnected, syncContact, syncInvoice, syncPayment };
}
