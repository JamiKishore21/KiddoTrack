import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';
import { Play, Square, MapPin, Send, AlertTriangle, Info, Siren, MessageSquare } from 'lucide-react';

const DriverDashboard = () => {
    const { user } = useAuth();
    const [isSharing, setIsSharing] = useState(false);
    const [location, setLocation] = useState(null);
    const [status, setStatus] = useState('Idle');
    const watchIdRef = useRef(null);

    const [selectedBus, setSelectedBus] = useState(null);
    const [availableBuses, setAvailableBuses] = useState([]);

    // Route State
    const [assignedRoute, setAssignedRoute] = useState(null);
    const [mapMarkers, setMapMarkers] = useState([]);

    // Communication State
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState('info');
    const [parentMessages, setParentMessages] = useState([]);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // 1. Fetch available buses on load
        axios.get('http://localhost:5000/api/buses')
            .then(res => {
                const buses = res.data;
                setAvailableBuses(buses);

                // 2. Restore Session from LocalStorage
                const savedBusId = localStorage.getItem('driver_active_bus');
                const savedSharing = localStorage.getItem('driver_is_sharing') === 'true';

                if (savedBusId) {
                    const bus = buses.find(b => b._id === savedBusId);
                    if (bus) {
                        setSelectedBus(bus);
                        if (savedSharing) {
                            // Auto-resume sharing logic will be triggered by function below
                            // We set state here, and use a separate effect to trigger GPS
                            setIsSharing(true);
                            setStatus('Resuming Trip...');
                        }
                    }
                }
            })
            .catch(err => console.error(err));

        // Get initial location for Map (without starting sharing)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setLocation({ lat: latitude, lng: longitude });
                },
                (err) => console.log("Initial location fetch failed:", err)
            );
        }
    }, []);

    // Effect to handle Auto-Start Sharing if state is restored
    useEffect(() => {
        if (isSharing && selectedBus && !watchIdRef.current) {
            startSharing();
        }
    }, [isSharing, selectedBus]); // Depend on state change


    // Fetch Route when Bus is selected
    useEffect(() => {
        if (!selectedBus) {
            setAssignedRoute(null);
            return;
        }

        const fetchRoute = async () => {
            try {
                // In a real app, backend should support filtering. 
                // fetching all for MVP:
                const { data } = await axios.get('http://localhost:5000/api/routes');
                const myRoute = data.find(r => r.assignedBus && r.assignedBus._id === selectedBus._id);

                if (myRoute) {
                    // Only use stops if they have valid coordinates from database
                    // For MVP, if Admin created stops without Lat/Lng, we won't show them on map, 
                    // preventing the "Fake Bus in Delhi" issue.
                    setAssignedRoute(myRoute);
                } else {
                    setAssignedRoute(null);
                }
            } catch (error) {
                console.error("Error fetching route:", error);
            }
        };
        fetchRoute();
    }, [selectedBus]);

    // Update Map Markers (Bus + Stops)
    useEffect(() => {
        const markers = [];

        // 1. Bus Location (Driver)
        if (location) {
            markers.push({
                lat: location.lat,
                lng: location.lng,
                type: 'bus'
            });
        }

        // 2. Stops
        if (assignedRoute && assignedRoute.stops) {
            assignedRoute.stops.forEach(stop => {
                // STRICT CHECK: Only render if real coordinates exist
                if (stop.location && typeof stop.location.lat === 'number' && typeof stop.location.lng === 'number') {
                    markers.push({
                        lat: stop.location.lat,
                        lng: stop.location.lng,
                        type: 'stop',
                        studentName: stop.name
                    });
                }
            });
        }
        setMapMarkers(markers);
    }, [location, assignedRoute]);


    // ... socket logic using selectedBus ...

    // ... socket logic using selectedBus ...

    useEffect(() => {
        socket.connect();

        if (selectedBus) {
            socket.on('activeParentsList', (list) => {
                const map = {};
                list.forEach(p => {
                    map[p.studentName] = { lat: p.lat, lng: p.lng, type: 'parent', studentName: p.studentName };
                });
                setOnlineParents(prev => ({ ...prev, ...map }));
            });

            socket.on('parentLocationUpdate', (data) => {
                setOnlineParents(prev => ({
                    ...prev,
                    [data.studentName]: { lat: data.lat, lng: data.lng, type: 'parent', studentName: data.studentName }
                }));
            });

            socket.on('parentLeft', (data) => {
                setOnlineParents(prev => {
                    const next = { ...prev };
                    delete next[data.studentName];
                    return next;
                });
            });

            // Receive messages from parents
            socket.on('incomingParentMessage', (data) => {
                setParentMessages(prev => [data, ...prev]);
            });

            socket.emit('joinRoom', `bus_${selectedBus.busNumber}_driver`);
        }



        return () => {
            socket.off('parentLocationUpdate');
            socket.off('activeParentsList');
            socket.off('parentLeft');
            socket.disconnect();
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, [selectedBus]); // Re-run when bus selection changes

    const [onlineParents, setOnlineParents] = useState({});

    // Update Map Markers (Bus + Stops + Online Parents)
    useEffect(() => {
        const markers = [];

        // 1. Bus Location (Driver)
        if (location) {
            markers.push({
                lat: location.lat,
                lng: location.lng,
                type: 'bus'
            });
        }

        // 2. Stops (Static)
        if (assignedRoute && assignedRoute.stops) {
            assignedRoute.stops.forEach(stop => {
                if (stop.location) {
                    markers.push({
                        lat: stop.location.lat,
                        lng: stop.location.lng,
                        type: 'stop', // Use 'stop' type if we supported different icons
                        studentName: stop.name // Label
                    });
                }
            });
        }

        // 3. Online Parents (Real-time)
        Object.values(onlineParents).forEach(p => {
            markers.push(p);
        });

        setMapMarkers(markers);
    }, [location, assignedRoute, onlineParents]);

    const startSharing = () => {
        if (!selectedBus) return;

        setIsSharing(true);
        setStatus(' transmitting location...');

        // Persist State
        localStorage.setItem('driver_active_bus', selectedBus._id);
        localStorage.setItem('driver_is_sharing', 'true');

        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        if (watchIdRef.current) return; // Prevent double watch

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, speed, heading } = position.coords;
                const newLocation = { lat: latitude, lng: longitude };

                setLocation(newLocation);

                // Emit to server
                if (selectedBus) {
                    socket.emit('driverLocation', {
                        busId: selectedBus.busNumber, // Using Number for ID consistency with map logic
                        lat: latitude,
                        lng: longitude,
                        speed,
                        heading
                    });
                }
            },
            (error) => {
                console.error('Error getting location:', error);
                setStatus('Error: ' + error.message);
            },
            {
                enableHighAccuracy: true, //                enableHighAccuracy: true,
                timeout: 30000, // Increased to 30s to avoid timeouts
                maximumAge: 10000, // Accept cached positions up to 10s old
            }
        );
    };

    const stopSharing = () => {
        setIsSharing(false);
        setStatus('Trip Ended');

        // Clear Persistence
        localStorage.removeItem('driver_is_sharing');
        localStorage.removeItem('driver_active_bus');

        // Notify Server to remove from maps
        if (selectedBus) {
            socket.emit('driverSessionEnd', { busId: selectedBus.busNumber });
        }

        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    };

    // Send a status/traffic update to all parents tracking this bus
    const handleSendStatus = (e) => {
        e.preventDefault();
        if (!statusMessage.trim() || !selectedBus) return;
        socket.emit('driverStatusUpdate', {
            busId: selectedBus.busNumber,
            message: statusMessage.trim(),
            type: statusType,
            driverName: user?.name || 'Driver'
        });
        setStatusMessage('');
    };

    return (
        <div className="p-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 min-h-screen">
            {/* Control Panel */}
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-indigo-800">Driver Dashboard</h1>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-gray-500">Bus Number</p>
                            {selectedBus ? (
                                <p className="text-xl font-bold font-mono text-gray-800">BUS-{selectedBus.busNumber}</p>
                            ) : (
                                <select
                                    className="border rounded p-1 text-sm font-bold"
                                    onChange={(e) => {
                                        const bus = availableBuses.find(b => b._id === e.target.value);
                                        setSelectedBus(bus);
                                    }}
                                >
                                    <option value="">Select Bus</option>
                                    {availableBuses.map(b => (
                                        <option key={b._id} value={b._id}>Bus {b.busNumber}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isSharing ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                                {status}
                            </span>
                        </div>
                    </div>

                    <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-3 mb-2 text-gray-700">
                            <MapPin size={20} className="text-indigo-500" />
                            <span className="font-semibold">Current Location</span>
                        </div>
                        {location ? (
                            <div className="text-sm font-mono space-y-1 pl-8">
                                <p>Lat: {location.lat.toFixed(6)}</p>
                                <p>Lng: {location.lng.toFixed(6)}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 pl-8">Waiting for GPS...</p>
                        )}
                    </div>

                    {/* Route Info */}
                    {assignedRoute && (
                        <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h3 className="font-bold text-blue-800 mb-2">Assigned Route: {assignedRoute.name}</h3>
                            <p className="text-sm text-blue-600 mb-2">{assignedRoute.stops.length} Stops</p>
                            <ul className="text-xs text-gray-600 list-disc ml-4">
                                {assignedRoute.stops.map((stop, i) => (
                                    <li key={i}>{stop.name}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {!isSharing ? (
                        <button
                            onClick={startSharing}
                            disabled={!selectedBus}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${!selectedBus ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                        >
                            <Play size={24} />
                            Start Trip
                        </button>
                    ) : (
                        <button
                            onClick={stopSharing}
                            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                        >
                            <Square size={24} fill="currentColor" />
                            Stop Trip
                        </button>
                    )}
                </div>
                <div className="text-center text-xs text-gray-400">
                    Keep this tab open for background tracking.
                </div>
            </div>

            {/* Communication Panel */}
            <div className="space-y-4">
                {/* Status Update Broadcaster */}
                <div className="bg-white rounded-xl shadow-lg p-5">
                    <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Send size={17} className="text-indigo-500" /> Broadcast Update
                    </h2>
                    <form onSubmit={handleSendStatus} className="space-y-3">
                        <div className="flex gap-2">
                            {[
                                { type: 'info', label: 'Info', icon: <Info size={13} />, color: 'blue' },
                                { type: 'delay', label: 'Delay', icon: <AlertTriangle size={13} />, color: 'yellow' },
                                { type: 'emergency', label: 'SOS', icon: <Siren size={13} />, color: 'red' },
                            ].map(({ type, label, icon, color }) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setStatusType(type)}
                                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${statusType === type
                                            ? color === 'blue' ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : color === 'yellow' ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                                    : 'border-red-500 bg-red-50 text-red-700'
                                            : 'border-gray-200 text-gray-500'
                                        }`}
                                >
                                    {icon} {label}
                                </button>
                            ))}
                        </div>
                        <textarea
                            rows={3}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                            placeholder={
                                statusType === 'info' ? 'e.g. Bus is on schedule, arriving soon...'
                                    : statusType === 'delay' ? 'e.g. Stuck in traffic near MG Road, ~15 min delay'
                                        : 'e.g. Emergency! Bus has broken down at Stop 3'
                            }
                            value={statusMessage}
                            onChange={e => setStatusMessage(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={!statusMessage.trim() || !selectedBus}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <Send size={15} /> Send to All Parents
                        </button>
                    </form>
                </div>

                {/* Messages from Parents */}
                <div className="bg-white rounded-xl shadow-lg p-5 flex flex-col">
                    <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <MessageSquare size={17} className="text-indigo-500" />
                        Messages from Parents
                        {parentMessages.length > 0 && (
                            <span className="ml-auto bg-indigo-600 text-white rounded-full text-xs px-2 py-0.5">{parentMessages.length}</span>
                        )}
                    </h2>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {parentMessages.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">No messages yet</p>
                        ) : (
                            parentMessages.map((msg, i) => (
                                <div key={i} className="bg-indigo-50 rounded-lg p-3 text-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-indigo-700">{msg.studentName}'s Parent</span>
                                        <span className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-gray-700">{msg.message}</p>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </div>

            {/* Map Panel */}
            <div className="bg-gray-200 rounded-2xl overflow-hidden shadow-inner border border-gray-300 relative min-h-[400px]">
                <div className="absolute inset-0">
                    <MapComponent
                        markers={mapMarkers}
                        initialViewState={{ latitude: 28.6139, longitude: 77.2090, zoom: 12 }}
                    />
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;

