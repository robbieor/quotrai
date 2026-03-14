import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useXeroConnection } from "@/hooks/useXeroConnection";
import { Loader2, Link2, Unlink, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";

export function XeroConnectionCard() {
  const { connection, connect, disconnect } = useXeroConnection();
  const [searchParams, setSearchParams] = useSearchParams();

  // Show success toast if redirected from Xero
  useEffect(() => {
    if (searchParams.get("xero") === "connected") {
      toast.success("Xero connected successfully!");
      searchParams.delete("xero");
      setSearchParams(searchParams, { replace: true });
      connection.refetch();
    }
  }, [searchParams]);

  const handleConnect = async () => {
    try {
      const authUrl = await connect.mutateAsync();
      window.location.href = authUrl;
    } catch (error: any) {
      toast.error(error.message || "Failed to start Xero connection");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast.success("Xero disconnected");
    } catch (error: any) {
      toast.error(error.message || "Failed to disconnect Xero");
    }
  };

  const isConnected = !!connection.data;
  const isExpired = connection.data
    ? new Date(connection.data.token_expires_at) < new Date()
    : false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <rect width="24" height="24" rx="4" fill="#13B5EA" />
                <path d="M5 12L8.5 8.5M8.5 8.5L5 5M8.5 8.5L12 12M12 12L8.5 15.5M12 12L15.5 8.5M15.5 8.5L19 5M15.5 8.5L12 12M12 12L15.5 15.5M15.5 15.5L19 19M15.5 15.5L12 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Xero Integration
            </CardTitle>
            <CardDescription>
              Sync invoices, payments, and contacts with Xero
            </CardDescription>
          </div>
          {isConnected && (
            <Badge variant={isExpired ? "destructive" : "default"}>
              {isExpired ? "Expired" : "Connected"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Organisation:</span>
                <span className="font-medium">{connection.data?.xero_tenant_name || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Connected:</span>
                <span>{new Date(connection.data!.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {isExpired && (
                <Button onClick={handleConnect} size="sm" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Reconnect
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnect.isPending}
                className="gap-2"
              >
                {disconnect.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Xero account to automatically sync invoices, payments, and customer contacts.
            </p>
            <Button
              onClick={handleConnect}
              disabled={connect.isPending}
              className="gap-2"
            >
              {connect.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Connect to Xero
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
