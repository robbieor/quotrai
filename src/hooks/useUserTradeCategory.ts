import { useProfile } from "./useProfile";
import { mapTradeTypeToCategory } from "@/utils/tradeTypeMapping";
import type { TradeCategory } from "./useTemplates";

/**
 * Returns the user's trade category based on their profile trade_type.
 * This is used to filter templates to only show relevant ones.
 */
export function useUserTradeCategory(): TradeCategory | undefined {
  const { profile } = useProfile();
  return mapTradeTypeToCategory(profile?.trade_type);
}
