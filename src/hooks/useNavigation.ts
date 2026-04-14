import { useState, useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

const STADIUM_CENTER = { lat: 33.9535, lng: -118.3392 };

export function useNavigation(destination: google.maps.LatLngLiteral | null, userLocation: google.maps.LatLngLiteral | null) {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const geometryLibrary = useMapsLibrary('geometry');
  const [route, setRoute] = useState<google.maps.DirectionsRoute | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!routesLibrary || !geometryLibrary || !map || !destination || !userLocation) {
      if (polylineRef.current) polylineRef.current.setMap(null);
      return;
    }

    const service = new routesLibrary.DirectionsService();
    
    // Check if user is too far (demo fallback logic)
    const distanceToStadium = geometryLibrary.spherical.computeDistanceBetween(
      userLocation,
      STADIUM_CENTER
    );

    const actualOrigin = distanceToStadium > 10000 
      ? { lat: STADIUM_CENTER.lat + 0.005, lng: STADIUM_CENTER.lng + 0.005 }
      : userLocation;

    service.route({
      origin: actualOrigin,
      destination: destination,
      travelMode: google.maps.TravelMode.WALKING,
    }, (result, status) => {
      if (status === 'OK' && result && result.routes[0]) {
        setRoute(result.routes[0]);
        if (polylineRef.current) polylineRef.current.setMap(null);
        polylineRef.current = new google.maps.Polyline({
          path: result.routes[0].overview_path,
          geodesic: true,
          strokeColor: '#3b82f6',
          strokeOpacity: 0.9,
          strokeWeight: 8,
          map: map
        });
      }
    });

    return () => {
      if (polylineRef.current) polylineRef.current.setMap(null);
    };
  }, [routesLibrary, geometryLibrary, map, destination, userLocation]);

  return { route };
}
