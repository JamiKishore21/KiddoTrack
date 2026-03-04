import React, { useEffect, useState } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { Bus as BusIcon, Crosshair, Navigation, MapPin } from 'lucide-react';


const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const MapComponent = ({
    initialViewState = { latitude: 28.6139, longitude: 77.2090, zoom: 12 },
    markers = [],
    drawLine = null, // Expects array of coordinates: [{lat, lng}, {lat, lng}]
    onViewportChange,
    onMapClick,
    isSelecting = false
}) => {
    const [viewState, setViewState] = useState(initialViewState);
    const [isFollowing, setIsFollowing] = useState(true);

    // Auto-center on the BUS when it updates (if Following is enabled)
    useEffect(() => {
        const busMarker = markers.find(m => m.type !== 'parent');

        if (isFollowing && busMarker) {
            setViewState(prev => ({
                ...prev,
                latitude: Number(busMarker.lat),
                longitude: Number(busMarker.lng),
                zoom: 15,
                transitionDuration: 500 // Smooth panning
            }));
        }
    }, [markers, isFollowing]);

    const centerOnUser = () => {
        // Try finding 'parent' (User) first, then 'bus' (Driver/Self)
        const userMarker = markers.find(m => m.type === 'parent') || markers.find(m => m.type === 'bus');

        if (userMarker) {
            setIsFollowing(false); // Stop following bus logic to allow manual control, or maybe true? 
            // Actually if I center on myself (bus), following should be true? 
            // Let's just set view state.
            setViewState(prev => ({
                ...prev,
                latitude: Number(userMarker.lat),
                longitude: Number(userMarker.lng),
                zoom: 15,
                transitionDuration: 1000
            }));
        } else {
            alert("Location not found. Please Start Trip or Allow Location Access.");
        }
    };

    const enableFollowMode = () => {
        setIsFollowing(true);
        // Instant trigger will happen in useEffect if marker exists
    };

    // Create GeoJSON for the line
    const routeGeoJSON = drawLine ? {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates: drawLine.map(p => [Number(p.lng), Number(p.lat)])
        }
    } : null;

    return (
        <div className="relative w-full h-full">
            <Map
                {...viewState}
                onMove={evt => {
                    setViewState(evt.viewState);
                    // Disable follow mode if user interacts
                    if (evt.originalEvent) {
                        setIsFollowing(false);
                    }
                }}
                onClick={e => {
                    if (isSelecting && onMapClick) {
                        onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
                    }
                }}
                style={{ width: '100%', height: '100%', cursor: isSelecting ? 'crosshair' : 'grab' }}
                mapStyle="mapbox://styles/mapbox/streets-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
            >
                <NavigationControl position="top-right" />

                {/* Draw Route Line */}
                {routeGeoJSON && (
                    <Source id="route-line" type="geojson" data={routeGeoJSON}>
                        {/* Outline/Casing for 3D effect */}
                        <Layer
                            id="route-layer-casing"
                            type="line"
                            layout={{
                                'line-join': 'round',
                                'line-cap': 'round'
                            }}
                            paint={{
                                'line-color': '#111', // Dark outline
                                'line-width': 6,
                                'line-opacity': 0.1
                            }}
                        />
                        {/* Inner Main Line */}
                        <Layer
                            id="route-layer"
                            type="line"
                            layout={{
                                'line-join': 'round',
                                'line-cap': 'round'
                            }}
                            paint={{
                                'line-color': '#4285F4', // Google Blue
                                'line-width': 5,
                                'line-opacity': 1
                            }}
                        />
                    </Source>
                )}

                {markers.map((marker, index) => (
                    <Marker
                        key={`m-${index}-${marker.lat}`}
                        latitude={Number(marker.lat)}
                        longitude={Number(marker.lng)}
                        anchor="center"
                    >
                        <div className="flex flex-col items-center" style={{ zIndex: 1000 + index }}>
                            <div className={`text-white text-[9px] px-1.5 py-0.5 rounded-full mb-1 font-bold uppercase shadow-sm ${marker.type === 'stop' ? 'bg-yellow-600' : 'bg-brand-600'
                                }`}>
                                {marker.type === 'stop' ? 'Pickup' : (marker.type || 'Bus')}
                            </div>
                            <div className={`w-7 h-7 rounded-full border-2 border-white shadow-xl flex items-center justify-center transition-all ${marker.type === 'stop' ? 'bg-yellow-500 scale-110 ring-4 ring-yellow-500/20' : 'bg-brand-600 ring-4 ring-brand-500/20'
                                }`}>
                                {marker.type === 'stop' ? (
                                    <MapPin size={16} className="text-white fill-current" />
                                ) : (
                                    <BusIcon size={18} className="text-white fill-current" />
                                )}
                            </div>
                        </div>
                    </Marker>
                ))}
            </Map>

            {/* Floating Control Buttons */}
            <div className="absolute bottom-6 left-4 flex flex-col gap-3">

                {/* Follow Bus Button */}
                <button
                    onClick={enableFollowMode}
                    className={`p-3 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2 ${isFollowing ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    title="Follow Bus"
                >
                    <Navigation size={24} className={isFollowing ? 'animate-pulse' : ''} />
                    {!isFollowing && <span className="text-xs font-bold pr-1">Recenter</span>}
                </button>
            </div>
        </div>
    );
};

export default MapComponent;
