import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuickBooksConnection } from "@/hooks/useQuickBooksConnection";
import { Loader2, Link2, Unlink, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";

export function QuickBooksConnectionCard() {
  const { connection, connect, disconnect } = useQuickBooksConnection();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("quickbooks") === "connected") {
      toast.success("QuickBooks connected successfully!");
      searchParams.delete("quickbooks");
      setSearchParams(searchParams, { replace: true });
      connection.refetch();
    }
  }, [searchParams]);

  const handleConnect = async () => {
    try {
      const authUrl = await connect.mutateAsync();
      window.location.href = authUrl;
    } catch (error: any) {
      toast.error(error.message || "Failed to start QuickBooks connection");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast.success("QuickBooks disconnected");
    } catch (error: any) {
      toast.error(error.message || "Failed to disconnect QuickBooks");
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
                <rect width="24" height="24" rx="4" fill="#2CA01C" />
                <path d="M12 4C7.58 4 4 7.58 4 12s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14.4A6.4 6.4 0 1112 5.6a6.4 6.4 0 010 12.8z" fill="white" />
                <path d="M10.5 9v6M13.5 9v6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              QuickBooks Integration
            </CardTitle>
            <CardDescription>
              Sync invoices, payments, and contacts with QuickBooks
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
                <span className="text-muted-foreground">Company:</span>
                <span className="font-medium">{connection.data?.company_name || "Unknown"}</span>
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
              Connect your QuickBooks Online account to automatically sync invoices, payments, and customer contacts.
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
              Connect to QuickBooks
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
