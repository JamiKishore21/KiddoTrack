import React, { useEffect, useState } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { Bus as BusIcon, Crosshair, Navigation, MapPin } from 'lucide-react';


const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const MapComponent = ({
    initialViewState = { latitude: 28.6139, longitude: 77.2090, zoom: 12 },
    markers = [],
    drawLine = null,
    onViewportChange,
    onMapClick,
    isSelecting = false
}) => {
    const [viewState, setViewState] = useState(initialViewState);
    const [isFollowing, setIsFollowing] = useState(true);

    useEffect(() => {
        const busMarker = markers.find(m => m.type !== 'parent' && m.type !== 'stop');
        const stopMarkers = markers.filter(m => m.type === 'stop');

        if (isFollowing && busMarker) {
            setViewState(prev => ({
                ...prev,
                latitude: Number(busMarker.lat),
                longitude: Number(busMarker.lng),
                zoom: 15,
                transitionDuration: 500
            }));
        } else if (isSelecting && stopMarkers.length > 0 && isFollowing) {
            // Auto-center on the first few stops during selection if not moved manually
            const centerLat = stopMarkers.reduce((acc, m) => acc + Number(m.lat), 0) / stopMarkers.length;
            const centerLng = stopMarkers.reduce((acc, m) => acc + Number(m.lng), 0) / stopMarkers.length;
            setViewState(prev => ({
                ...prev,
                latitude: centerLat,
                longitude: centerLng,
                zoom: 13,
                transitionDuration: 1000
            }));
            setIsFollowing(false); // Only auto-center once when stops load
        }
    }, [markers, isFollowing, isSelecting]);

    const centerOnUser = () => {
        const userMarker = markers.find(m => m.type === 'parent') || markers.find(m => m.type === 'bus');
        if (userMarker) {
            setViewState(prev => ({
                ...prev,
                latitude: Number(userMarker.lat),
                longitude: Number(userMarker.lng),
                zoom: 15,
                transitionDuration: 1000
            }));
        } else {
            alert("Location not found.");
        }
    };

    const enableFollowMode = () => {
        setIsFollowing(true);
    };

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
                    if (evt.originalEvent) setIsFollowing(false);
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
                        <Layer id="route-layer-casing" type="line"
                            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                            paint={{ 'line-color': '#111', 'line-width': 6, 'line-opacity': 0.1 }}
                        />
                        <Layer id="route-layer" type="line"
                            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                            paint={{ 'line-color': '#4285F4', 'line-width': 5, 'line-opacity': 1 }}
                        />
                    </Source>
                )}

                {/* Render Markers */}
                {markers.filter(m => m.lat && m.lng && (Number(m.lat) !== 0 || Number(m.lng) !== 0)).map((marker, index) => (
                    <Marker
                        key={`m-${index}-${marker.lat}`}
                        latitude={Number(marker.lat)}
                        longitude={Number(marker.lng)}
                        anchor="center"
                        onClick={e => {
                            if (isSelecting && onMapClick) {
                                e.originalEvent.stopPropagation();
                                onMapClick({ lat: marker.lat, lng: marker.lng });
                            }
                        }}
                    >
                        <div className={`flex flex-col items-center ${isSelecting && marker.type === 'stop' ? 'cursor-pointer hover:scale-110 active:scale-95 transition-transform' : ''}`} style={{ zIndex: 1000 + index }}>
                            {/* Stop Marker — Numbered */}
                            {marker.type === 'stop' && (
                                <>
                                    <div className={`text-white text-[9px] px-2 py-0.5 rounded-full mb-1 font-bold uppercase shadow-lg border border-white/20 ${marker.stopStatus === 'highlight' ? 'bg-brand-600 scale-110' : 'bg-amber-600'}`}>
                                        {marker.studentName || 'Stop'}
                                    </div>
                                    <div className={`w-8 h-8 rounded-full border-2 border-white shadow-2xl flex items-center justify-center transition-all ${marker.stopStatus === 'reached' ? 'bg-emerald-500 ring-4 ring-emerald-500/20' :
                                        marker.stopStatus === 'left' ? 'bg-slate-400 ring-2 ring-slate-300/20' :
                                            marker.stopStatus === 'highlight' ? 'bg-brand-600 ring-4 ring-brand-500/30 scale-110' :
                                                'bg-amber-500 ring-4 ring-amber-500/20'
                                        }`}>
                                        {marker.stopNumber ? (
                                            <span className="text-white text-xs font-black">{marker.stopNumber}</span>
                                        ) : (
                                            <MapPin size={18} className="text-white fill-current" />
                                        )}
                                    </div>
                                </>
                            )}
                            {/* Bus Marker */}
                            {marker.type !== 'stop' && marker.type !== 'parent' && (
                                <>
                                    <div className="text-white text-[9px] px-1.5 py-0.5 rounded-full mb-1 font-bold uppercase shadow-sm bg-brand-600">
                                        {marker.type === 'lastKnown' ? `Bus ${marker.busId} (Offline)` : (marker.busId ? `Bus ${marker.busId}` : 'Bus')}
                                    </div>
                                    <div className={`w-7 h-7 rounded-full border-2 border-white shadow-xl flex items-center justify-center transition-all ${marker.type === 'lastKnown' ? 'bg-gray-500 opacity-60' : 'bg-brand-600 ring-4 ring-brand-500/20'
                                        }`}>
                                        <BusIcon size={18} className="text-white fill-current" />
                                    </div>
                                </>
                            )}
                            {/* Parent Marker */}
                            {marker.type === 'parent' && (
                                <>
                                    <div className="text-white text-[9px] px-1.5 py-0.5 rounded-full mb-1 font-bold shadow-sm bg-green-600">
                                        {marker.studentName || 'Parent'}
                                    </div>
                                    <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white shadow-lg" />
                                </>
                            )}
                        </div>
                    </Marker>
                ))}
            </Map>

            {/* Floating Control Buttons */}
            <div className="absolute bottom-6 left-4 flex flex-col gap-3">
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
