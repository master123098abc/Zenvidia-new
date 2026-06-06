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
