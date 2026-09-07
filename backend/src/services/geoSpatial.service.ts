export class GeoSpatialService {
  /**
   * Calculates Great Circle Distance between two coordinates in Kilometers using Haversine formula
   */
  public static calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    if (lat1 === lat2 && lon1 === lon2) return 0;
    
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
      Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Number(distance.toFixed(2));
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
