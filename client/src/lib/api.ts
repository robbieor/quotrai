import { QueryClient } from "@tanstack/react-query";
import type { QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server
 * In development, we usually proxy or use a relative path if served by the same server
 */
export function getApiUrl(): string {
    // In a standard Vite setup, we can use relative URLs if the server serves the web app
    // or define VITE_API_URL in .env
    const apiUrl = import.meta.env.VITE_API_URL || "";
    return apiUrl;
}

async function throwIfResNotOk(res: Response) {
    if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
    }
}

export async function apiRequest(
    method: string,
    route: string,
    data?: unknown | undefined,
): Promise<Response> {
    const baseUrl = getApiUrl();
    const url = route.startsWith("http") ? new URL(route) : new URL(route, baseUrl || window.location.origin);

    const res = await fetch(url.href, {
        method,
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
    on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
    ({ on401: unauthorizedBehavior }) =>
        async ({ queryKey }) => {
            const baseUrl = getApiUrl();

            const pathParts: string[] = [];
            let params: Record<string, unknown> | undefined;

            for (const part of queryKey) {
                if (typeof part === "string") {
                    pathParts.push(part);
                } else if (typeof part === "number") {
                    pathParts.push(String(part));
                } else if (typeof part === "object" && part !== null) {
                    params = part as Record<string, unknown>;
                    break;
                }
            }

            const path = pathParts.join("/");
            const url = path.startsWith("http") ? new URL(path) : new URL(path, baseUrl || window.location.origin);

            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        url.searchParams.set(key, String(value));
                    }
                });
            }

            const res = await fetch(url.href, {
                credentials: "include",
            });

            if (unauthorizedBehavior === "returnNull" && res.status === 401) {
                return null;
            }

            await throwIfResNotOk(res);
            return await res.json();
        };

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            queryFn: getQueryFn({ on401: "throw" }),
            refetchInterval: false,
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: false,
        },
        mutations: {
            retry: false,
        },
    },
});
