import React, { useState, useEffect, useCallback } from 'react';
import {
  Map,
  Marker,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import { Button } from '@/components/ui/button';
import { Clock, Users, Navigation as NavIcon } from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { useCrowdData } from '@/hooks/useCrowdData';

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

interface SectorOverlayProps {
  sector: { id: string; paths: google.maps.LatLngLiteral[] };
  density: number;
  waitTime: number;
  onNavigate: (pos: google.maps.LatLngLiteral) => void;
}

const SectorOverlay = ({ sector, density, waitTime, onNavigate }: SectorOverlayProps) => {
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);
  const getColor = (d: number) => {
    if (d > 80) return '#ef4444';
    if (d > 50) return '#f59e0b';
    return '#22c55e';
  };

  const center = sector.paths[0];

  return (
    <>
      <Marker 
        position={center} 
        onClick={() => setInfoWindowOpen(true)}
        opacity={0} // Hidden marker just to anchor the info window
      />
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
  const [navDestination, setNavDestination] = useState<google.maps.LatLngLiteral | null>(null);
  const handleNavigate = useCallback((pos: google.maps.LatLngLiteral) => setNavDestination(pos), []);
  const [internalLocation, setInternalLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [mapReady, setMapReady] = useState(false);
  
  const { sectors } = useCrowdData();
  const userLocation = externalLocation || internalLocation;
  
  useNavigation(navDestination, userLocation);

  useEffect(() => {
    if (!externalLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setInternalLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }
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

          {mapReady && SECTOR_COORDS.map(s => {
            const data = sectors.find(sec => sec.id === s.id);
            return (
              <SectorOverlay 
                key={s.id} 
                sector={s} 
                density={data?.density || 20} 
                waitTime={data?.waitTime || 5}
                onNavigate={handleNavigate}
              />
            );
          })}
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
