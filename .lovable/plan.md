

# Cheaper Eircode Lookup Alternatives

## The Core Problem
Eircodes are proprietary (owned by An Post). No free API gives point-level Eircode accuracy. Loqate (~€0.05/lookup) and Autoaddress (~€0.22/lookup) license that data — that's why they're expensive.

## Realistic Cheaper Options

### Option A: Geoapify (Recommended)
- **Free tier**: 3,000 requests/day (90K/month)
- **Paid**: €49/month for 100K requests (~€0.0005 each — 100x cheaper than Loqate)
- **Irish coverage**: Uses OpenStreetMap + commercial data. Better than raw Nominatim but not point-level for all Eircodes
- **Also covers**: UK postcodes, US ZIP, global
- **Quality**: Good for ~70% of Eircodes (towns, suburbs). Rural single-house Eircodes may still be area-level

### Option B: LocationIQ
- **Free tier**: 5,000 requests/day
- **Paid**: $49/month for 30K requests
- **Quality**: Similar to Geoapify — enhanced OpenStreetMap data

### Option C: OpenCage
- **Free tier**: 2,500 requests/day
- **Paid**: $50/month for 10K requests
- **Quality**: Aggregates multiple sources, decent Irish coverage

### Option D: Enhance What You Already Have (Free)
Your edge function already maps routing keys to area names. We can:
1. Add precise lat/lng coordinates for all ~139 routing keys in the existing lookup table
2. Use the area name + Nominatim for street-level refinement
3. Result: free, no API key needed, accuracy goes from "wrong location" to "correct area center"
4. **Tradeoff**: still area-level (not front-door), but correct area at least

## Recommendation

**Start with Option D (free fix) + Option A (Geoapify free tier) as fallback.**

- Fix the routing key table with correct GPS coordinates — this alone solves "takes me to the wrong location"
- Use Geoapify's free 3K/day tier for enhanced lookups when available
- Zero cost until you exceed 90K lookups/month
- Upgrade to Geoapify paid ($49/mo) only if volume demands it

## Implementation

| File | Change |
|------|--------|
| `supabase/functions/eircode-lookup/index.ts` | Add lat/lng to routing key table, add Geoapify as secondary geocoder with free tier |

## Cost Comparison

| Provider | Monthly Cost | Lookups |
|----------|-------------|---------|
| Current (Nominatim) | Free | Unlimited but inaccurate |
| **Option D (enhanced table)** | **Free** | **Unlimited, correct area** |
| **Geoapify free tier** | **Free** | **90K/month** |
| Geoapify paid | €49/mo | 100K/month |
| Loqate | ~€150+/mo | 3K/month |
| Autoaddress | ~€50+/mo | ~225/month |

