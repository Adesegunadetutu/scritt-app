/**
 * Calculates the straight-line distance between two coordinates in kilometers.
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return "Distance unknown";

  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Logic for user-friendly formatting
  if (distance < 1) {
    return "Under 1km away";
  }
  
  return `${distance.toFixed(1)}km away`;
};

/**
 * Converts degrees to radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * OPTIONAL: Helper to check if coordinates are valid
 */
export const isValidCoordinate = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};