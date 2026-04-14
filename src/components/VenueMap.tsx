import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Marker,
  InfoWindow,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import { Button } from '@/components/ui/button';
import { Clock, Users, Navigation as NavIcon } from 'lucide-react';
import { db, collection, onSnapshot } from '@/lib/firebase';

const STADIUM_CENTER = { lat: 33.9535, lng: -118.3392 };

const SECTOR_COORDS = [
  { id: 'S1', paths: [{ lat: 33.9545, lng: -118.3402 }, { lat: 33.9545, lng: -118.3382 }, { lat: 33.9535, lng: -118.3392 }] },
  { id: 'S2', paths: [{ lat: 33.9545, lng: -118.3382 }, { lat: 33.9535, lng: -118.3372 }, { lat: 33.9535, lng: -118.3392 }] },
  { id: 'S3', paths: [{ lat: 33.9535, lng: -118.3372 }, { lat: 33.9525, lng: -118.3382 }, { lat: 33.9535, lng: -118.3392 }] },
  { id: 'S4', paths: [{ lat: 33.9525, lng: -118.3382 }, { lat: 33.9525, lng: -118.3402 }, { lat: 33.9535, lng: -118.3392 }] },
  { id: 'S5', paths: [{ lat: 33.9525, lng: -118.3402 }, { lat: 33.9535, lng: -118.3412 }, { lat: 33.9535, lng: -118.3392 }] },
  { id: 'S6', paths: [{ lat: 33.9535, lng: -118.3412 }, { lat: 33.9545, lng: -118.3402 }, { lat: 33.9535, lng: -118.3392 }] },
  { id: 'S7', paths: [{ lat: 33.9545, lng: -118.3402 }, { lat: 33.9550, lng: -118.3392 }, { lat: 33.9545, lng: -118.3382 }] },
  { id: 'S8', paths: [{ lat: 33.9525, lng: -118.3382 }, { lat: 33.9520, lng: -118.3392 }, { lat: 33.9525, lng: -118.3402 }] },
];

interface DirectionsProps {
  destination: google.maps.LatLngLiteral | null;
  userLocation: google.maps.LatLngLiteral | null;
}

const Directions = ({ destination, userLocation }: DirectionsProps) => {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const geometryLibrary = useMapsLibrary('geometry');
  const [route, setRoute] = useState<google.maps.DirectionsRoute | null>(null);
  const polylineRef = React.useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!routesLibrary || !geometryLibrary || !map || !destination || !userLocation) {
      if (polylineRef.current) polylineRef.current.setMap(null);
      return;
    }

    const service = new routesLibrary.DirectionsService();
    
    // Check if user is too far from stadium (e.g. testing from home)
    // If > 10km, use a mock starting point for the demo
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
      } else {
        console.warn("Directions request returned no results or failed:", status);
      }
    });

    return () => {
      if (polylineRef.current) polylineRef.current.setMap(null);
    };
  }, [routesLibrary, geometryLibrary, map, destination, userLocation]);

  return null;
};

interface SectorOverlayProps {
  key?: string;
  sector: { id: string; paths: google.maps.LatLngLiteral[] };
  density: number;
  waitTime: number;
  onNavigate: (pos: google.maps.LatLngLiteral) => void;
}

const SectorOverlay = ({ sector, density, waitTime, onNavigate }: SectorOverlayProps) => {
  const map = useMap();
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);

  const getColor = (d: number) => {
    if (d > 80) return '#ef4444';
    if (d > 50) return '#f59e0b';
    return '#22c55e';
  };

  useEffect(() => {
    if (!map) return;
    const poly = new google.maps.Polygon({
      paths: sector.paths,
      strokeColor: getColor(density),
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: getColor(density),
      fillOpacity: 0.35,
      map: map
    });

    poly.addListener('click', () => setInfoWindowOpen(true));

    return () => poly.setMap(null);
  }, [map, density, sector.paths]);

  const center = sector.paths[0];

  return (
    <>
      {infoWindowOpen && (
        <InfoWindow position={center} onCloseClick={() => setInfoWindowOpen(false)}>
          <div className="p-2 text-zinc-900">
            <h3 className="font-bold text-lg mb-2">Sector {sector.id}</h3>
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-500" />
                <span className="text-sm">Density: <strong>{density}%</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-500" />
                <span className="text-sm">Wait: <strong>{waitTime}m</strong></span>
              </div>
            </div>
            <Button 
              size="sm" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => onNavigate(center)}
            >
              <NavIcon className="mr-2 h-3 w-3" />
              Navigate Here
            </Button>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

function VenueMap({ 
  onToggleAR, 
  userLocation: externalLocation,
  isSimulating = false
}: { 
  onToggleAR: () => void; 
  userLocation?: google.maps.LatLngLiteral | null;
  isSimulating?: boolean;
}) {
  const handleNavigate = useCallback((pos: google.maps.LatLngLiteral) => setNavDestination(pos), []);
  const [internalLocation, setInternalLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [navDestination, setNavDestination] = useState<google.maps.LatLngLiteral | null>(null);
  const [sectorData, setSectorData] = useState<Record<string, { density: number; waitTime: number }>>({});
  const [mapReady, setMapReady] = useState(false);
  const geometryLibrary = useMapsLibrary('geometry');

  // Use external location if provided, otherwise internal geolocation
  const userLocation = externalLocation || internalLocation;

  useEffect(() => {
    if (!externalLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setInternalLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }

    const unsubscribe = onSnapshot(collection(db, 'queues'), (snapshot) => {
      const data: Record<string, { density: number; waitTime: number }> = {};
      snapshot.docs.forEach(doc => {
        const q = doc.data();
        if (q.sectorId) {
          data[q.sectorId] = {
            density: q.density || Math.floor(Math.random() * 100),
            waitTime: q.waitTime || 0
          };
        }
      });
      setSectorData(data);
    });

    return () => unsubscribe();
  }, [externalLocation]);

  return (
    <div className="h-full w-full relative">
        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={STADIUM_CENTER}
          center={isSimulating && userLocation ? userLocation : undefined}
          defaultZoom={17}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          mapId={null}
          onIdle={() => setMapReady(true)}
        >
          {mapReady && userLocation && (
            <Marker 
              key={`${userLocation.lat}-${userLocation.lng}`} 
              position={userLocation} 
            />
          )}

          {mapReady && SECTOR_COORDS.map(s => (
            <SectorOverlay 
              key={s.id} 
              sector={s} 
              density={sectorData[s.id]?.density || 20} 
              waitTime={sectorData[s.id]?.waitTime || 5}
              onNavigate={handleNavigate}
            />
          ))}

          {mapReady && <Directions destination={navDestination} userLocation={userLocation} />}
        </Map>

        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <Button 
            className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-white"
            onClick={onToggleAR}
          >
            <NavIcon className="mr-2 h-4 w-4" />
            Switch to AR
          </Button>
          {navDestination && (
            <Button 
              variant="destructive"
              onClick={() => setNavDestination(null)}
            >
              Cancel Navigation
            </Button>
          )}
        </div>
    </div>
  );
}

export default React.memo(VenueMap);
