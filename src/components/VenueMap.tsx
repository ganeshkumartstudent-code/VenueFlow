import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
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
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ map }));
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !destination || !userLocation) {
      if (directionsRenderer) directionsRenderer.setDirections({ routes: [] });
      return;
    }

    directionsService.route({
      origin: userLocation,
      destination: destination,
      travelMode: google.maps.TravelMode.WALKING,
    }, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);
      }
    });
  }, [directionsService, directionsRenderer, destination, userLocation]);

  return null;
};

interface SectorOverlayProps {
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

function VenueMap({ onToggleAR }: { onToggleAR: () => void }) {
  const handleNavigate = useCallback((pos: google.maps.LatLngLiteral) => setNavDestination(pos), []);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [navDestination, setNavDestination] = useState<google.maps.LatLngLiteral | null>(null);
  const [sectorData, setSectorData] = useState<Record<string, { density: number; waitTime: number }>>({});

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
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
            density: Math.floor(Math.random() * 100),
            waitTime: q.waitTime || 0
          };
        }
      });
      setSectorData(data);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="h-full w-full relative">
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={STADIUM_CENTER}
          defaultZoom={17}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          mapId="VENUE_FLOW_MAP"
        >
          {userLocation && (
            <AdvancedMarker position={userLocation}>
              <div className="h-4 w-4 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-pulse" />
            </AdvancedMarker>
          )}

          {SECTOR_COORDS.map(s => (
            <SectorOverlay 
              key={s.id} 
              sector={s} 
              density={sectorData[s.id]?.density || 20} 
              waitTime={sectorData[s.id]?.waitTime || 5}
              onNavigate={handleNavigate}
            />
          ))}

          <Directions destination={navDestination} userLocation={userLocation} />
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
      </APIProvider>
    </div>
  );
}

export default React.memo(VenueMap);
