import { get, set, del, keys } from 'idb-keyval';
import { supabase } from '@/integrations/supabase/client';

export interface QueuedOperation {
  id: string;
  type: 'clock_in' | 'clock_out' | 'location_ping';
  payload: Record<string, unknown>;
  created_at: string;
  retry_count: number;
}

const QUEUE_PREFIX = 'offline_queue_';

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function enqueueOperation(
  type: QueuedOperation['type'],
  payload: Record<string, unknown>
): Promise<void> {
  const op: QueuedOperation = {
    id: generateId(),
    type,
    payload,
    created_at: new Date().toISOString(),
    retry_count: 0,
  };
  await set(`${QUEUE_PREFIX}${op.id}`, op);
}

export async function getQueuedOperations(): Promise<QueuedOperation[]> {
  const allKeys = await keys();
  const queueKeys = allKeys.filter(
    (k) => typeof k === 'string' && k.startsWith(QUEUE_PREFIX)
  );
  const ops: QueuedOperation[] = [];
  for (const key of queueKeys) {
    const op = await get<QueuedOperation>(key);
    if (op) ops.push(op);
  }
  // Sort by creation time
  return ops.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export async function removeOperation(id: string): Promise<void> {
  await del(`${QUEUE_PREFIX}${id}`);
}

async function processOperation(op: QueuedOperation): Promise<boolean> {
  try {
    switch (op.type) {
      case 'clock_in': {
        const { error } = await supabase
          .from('time_entries')
          .insert(op.payload as any);
        if (error) throw error;
        break;
      }
      case 'clock_out': {
        const { time_entry_id, ...updates } = op.payload as any;
        const { error } = await supabase
          .from('time_entries')
          .update(updates)
          .eq('id', time_entry_id);
        if (error) throw error;
        break;
      }
      case 'location_ping': {
        const { error } = await supabase
          .from('location_pings')
          .insert(op.payload as any);
        if (error) throw error;
        break;
      }
    }
    return true;
  } catch (error) {
    console.error(`Failed to process queued operation ${op.id}:`, error);
    return false;
  }
}

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  const ops = await getQueuedOperations();
  let synced = 0;
  let failed = 0;

  for (const op of ops) {
    const success = await processOperation(op);
    if (success) {
      await removeOperation(op.id);
      synced++;
    } else {
      // Increment retry count, remove after 10 retries
      if (op.retry_count >= 10) {
        await removeOperation(op.id);
        failed++;
      } else {
        await set(`${QUEUE_PREFIX}${op.id}`, {
          ...op,
          retry_count: op.retry_count + 1,
        });
        failed++;
      }
    }
  }

  return { synced, failed };
}

// Auto-sync when coming back online
export function setupOnlineSync(onSync?: (result: { synced: number; failed: number }) => void): () => void {
  const handler = async () => {
    const result = await flushQueue();
    if (result.synced > 0) {
      onSync?.(result);
    }
  };

  window.addEventListener('online', handler);
  
  // Also try to sync periodically (every 60s)
  const interval = setInterval(async () => {
    if (navigator.onLine) {
      await handler();
    }
  }, 60000);

  return () => {
    window.removeEventListener('online', handler);
    clearInterval(interval);
  };
}

export async function getQueueSize(): Promise<number> {
  const allKeys = await keys();
  return allKeys.filter(
    (k) => typeof k === 'string' && k.startsWith(QUEUE_PREFIX)
  ).length;
}
