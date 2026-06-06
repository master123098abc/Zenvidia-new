import { supabase } from './supabase';

export const updateUserLocation = async (userId: string, latitude: number, longitude: number) => {
  // PostGIS Point format: POINT(longitude latitude)
  const location = `POINT(${longitude} ${latitude})`;
  
  const { error } = await supabase
    .from('creators')
    .update({ location })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating location:', error);
    throw error;
  }
};

export const getNearbyCreators = async (userId: string, latitude: number, longitude: number, radiusInKm: number = 10) => {
  // Supabase RPC call to find nearby users
  const { data, error } = await supabase
    .rpc('get_nearby_creators', {
      user_lat: latitude,
      user_lon: longitude,
      radius_km: radiusInKm,
      requesting_user_id: userId
    });

  if (error) {
    console.error('Error fetching nearby creators:', error);
    throw error;
  }

  return data;
};

let trackingWatchId: number | null = null;
let lastUpdateTime = 0;

export const startContinuousTracking = (
  userId: string,
  onPositionUpdate: (coords: GeolocationCoordinates, nearby: any[]) => void,
  onError: (err: Error) => void
) => {
  if (!navigator.geolocation) {
    onError(new Error("Geolocation is not supported by your browser"));
    return;
  }

  // Force first update to be immediate
  lastUpdateTime = 0;

  trackingWatchId = navigator.geolocation.watchPosition(
    async (position) => {
      const now = Date.now();
      const { latitude, longitude } = position.coords;
      
      // Update at most once every 30 seconds
      if (now - lastUpdateTime >= 30000) {
        lastUpdateTime = now;
        try {
          await updateUserLocation(userId, latitude, longitude);
          const nearby = await getNearbyCreators(userId, latitude, longitude, 10);
          onPositionUpdate(position.coords, nearby || []);
        } catch (err: any) {
          console.error("Continuous tracking update failed", err);
        }
      }
    },
    (err) => {
      console.error("Geolocation error:", err);
      onError(new Error("Location permissions denied. Please enable location to find creators nearby."));
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
  );
};

export const stopContinuousTracking = () => {
  if (trackingWatchId !== null) {
    navigator.geolocation.clearWatch(trackingWatchId);
    trackingWatchId = null;
  }
};
