import fetch from "node-fetch";

const LOQATE_API_KEY = process.env.LOQATE_API_KEY || "HT81-ER29-ME28-PB99";

export interface LoqateGeocodeResult {
    formattedAddress: string;
    streetAddress: string | null;
    locality: string | null;
    county: string | null;
    country: string;
    latitude: number | null;
    longitude: number | null;
    eircode: string | null;
    precise: boolean;
}

/**
 * Geocode an Irish Eircode using Loqate API.
 */
export async function geocodeEircode(eircode: string): Promise<LoqateGeocodeResult | null> {
    try {
        const formattedEircode = eircode.replace(/\s/g, "").toUpperCase();

        // Loqate Find Endpoint
        const findUrl = `https://api.addressy.com/Capture/Interactive/Find/v1.1/json?Key=${LOQATE_API_KEY}&Text=${encodeURIComponent(formattedEircode)}&Countries=IE`;

        const findResponse = await fetch(findUrl);
        const findData = await findResponse.json();

        if (!findData || !findData.Items || findData.Items.length === 0) {
            return null;
        }

        // Find the best match (usually the first one for a specific Eircode)
        const bestMatch = findData.Items.find((item: any) => item.Type === "Address") || findData.Items[0];

        if (!bestMatch.Id) {
            return null;
        }

        // Loqate Retrieve Endpoint
        const retrieveUrl = `https://api.addressy.com/Capture/Interactive/Retrieve/v1.0/json?Key=${LOQATE_API_KEY}&Id=${bestMatch.Id}`;

        const retrieveResponse = await fetch(retrieveUrl);
        const retrieveData = await retrieveResponse.json();

        if (!retrieveData || !retrieveData.Items || retrieveData.Items.length === 0) {
            return null;
        }

        const item = retrieveData.Items[0];

        return {
            formattedAddress: item.Label.replace(/\n/g, ", "),
            streetAddress: item.Line1,
            locality: item.City,
            county: item.ProvinceName,
            country: "Ireland",
            latitude: item.Latitude ? parseFloat(item.Latitude) : null,
            longitude: item.Longitude ? parseFloat(item.Longitude) : null,
            eircode: item.PostalCode,
            precise: true
        };
    } catch (error) {
        console.error("Loqate geocoding error:", error);
        return null;
    }
}
