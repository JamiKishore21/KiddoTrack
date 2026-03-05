/**
 * Fetch actual road-following route geometry from Mapbox Directions API.
 * Supports up to 25 waypoints.
 *
 * @param {Array<{lat: number, lng: number}>} stops - Array of stop coordinates
 * @param {string} token - Mapbox access token
 * @returns {Promise<Array<{lat: number, lng: number}>>} Road-following coordinates
 */
export async function fetchRoadRoute(stops, token) {
    if (!stops || stops.length < 2 || !token) return null;

    // Mapbox Directions API supports max 25 waypoints
    const waypoints = stops.slice(0, 25);
    const coords = waypoints.map(s => `${Number(s.lng)},${Number(s.lat)}`).join(';');

    try {
        const res = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${token}`
        );
        const data = await res.json();

        if (data.routes?.[0]?.geometry?.coordinates) {
            // Convert [lng, lat] → {lat, lng}
            return data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
        }
        return null;
    } catch (err) {
        console.error('[Road Route] API Error:', err);
        return null;
    }
}
