import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';
import { Play, Square, MapPin, LogOut, Radio, Send, AlertTriangle, Info, Siren, MessageSquare, Route, X, Map, RefreshCw } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { API_URL } from '../constants';
import { fetchRoadRoute } from '../utils/fetchRoadRoute';
import { startBackgroundGeolocation, stopBackgroundGeolocation, isNative } from '../utils/nativeService';
import { notify, showSystemNotification } from '../utils/notificationSound';

const DriverDashboard = () => {
    const { user, logout } = useAuth();
    const [isSharing, setIsSharing] = useState(false);
    const [location, setLocation] = useState(null);
    const [status, setStatus] = useState('Idle');
    const watchIdRef = useRef(null);
    const [selectedBus, setSelectedBus] = useState(null);
    const [availableBuses, setAvailableBuses] = useState([]);
    const [assignedRoute, setAssignedRoute] = useState(null);
    const [mapMarkers, setMapMarkers] = useState([]);
    const [panelExpanded, setPanelExpanded] = useState(false);
    const [onlineParents, setOnlineParents] = useState({});
    const [stopStatuses, setStopStatuses] = useState({});
    const [roadGeometry, setRoadGeometry] = useState(null);
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

    // Refs to always have fresh values inside watchPosition callbacks (avoids stale closures)
    const isSharingRef = useRef(false);
    const assignedRouteRef = useRef(null);
    const stopStatusesRef = useRef({});
    const selectedBusRef = useRef(null);

    // Communication State
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState('info');
    const [chatMessages, setChatMessages] = useState([]);
    const [replyMsg, setReplyMsg] = useState('');
    const messagesEndRef = useRef(null);

    // All Routes View
    const [showAllRoutes, setShowAllRoutes] = useState(false);
    const [allRoutes, setAllRoutes] = useState([]);

    const fetchAllRoutes = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/routes`);
            setAllRoutes(data);
        } catch (error) {
            console.error('Error fetching all routes:', error);
        }
    };

    useEffect(() => {
        if (showAllRoutes && allRoutes.length === 0) {
            fetchAllRoutes();
        }
    }, [showAllRoutes]);

    // Keep refs in sync with state
    useEffect(() => { isSharingRef.current = isSharing; }, [isSharing]);
    useEffect(() => { assignedRouteRef.current = assignedRoute; }, [assignedRoute]);
    useEffect(() => { stopStatusesRef.current = stopStatuses; }, [stopStatuses]);
    useEffect(() => { selectedBusRef.current = selectedBus; }, [selectedBus]);

    useEffect(() => {
        // On app open: always start fresh — driver must explicitly press Start Trip.
        // Clear any leftover sharing flags from a previous session.
        localStorage.removeItem('driver_is_sharing');
        localStorage.removeItem('driver_active_bus');
        localStorage.removeItem('driver_stop_statuses');

        axios.get(`${API_URL}/buses`)
            .then(res => {
                const buses = res.data;
                setAvailableBuses(buses);
            })
            .catch(err => console.error(err));

        // Get a current position for initial map center (display only, not sharing)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.log("Location error:", err),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }

        // Safety net: if driver closes tab without pressing Stop, tell server to end the session
        const handleBeforeUnload = () => {
            const busRef = selectedBusRef.current;
            if (isSharingRef.current && busRef) {
                socket.emit('driverSessionEnd', { busId: busRef.busNumber });
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    const fetchChatHistory = async (busId) => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
            if (!token) return;
            const { data } = await axios.get(`${API_URL}/messages/bus/${busId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChatMessages(data);
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    };

    // NOTE: No auto-startSharing from state restore. Driver must press Start Trip button explicitly.

    useEffect(() => {
        if (!selectedBus) { setAssignedRoute(null); return; }
        axios.get(`${API_URL}/routes`).then(({ data }) => {
            const route = data.find(r => r.assignedBus?._id === selectedBus._id) || null;
            setAssignedRoute(route);
            // Reset stop statuses map — always start fresh from DB.
            // We do NOT merge localStorage here since we clear it on every app open.
            if (route?.stops) {
                const dbStatuses = {};
                route.stops.forEach((s, i) => {
                    if (s.status && s.status !== 'pending') dbStatuses[i] = s.status;
                });
                setStopStatuses(dbStatuses);
            } else {
                setStopStatuses({});
            }
        }).catch(console.error);
        fetchChatHistory(selectedBus.busNumber);
    }, [selectedBus]);

    useEffect(() => {
        socket.connect();
        if (selectedBus) {
            socket.on('activeParentsList', (list) => { const map = {}; list.forEach(p => { map[p.studentName] = { lat: p.lat, lng: p.lng, type: 'parent', studentName: p.studentName }; }); setOnlineParents(prev => ({ ...prev, ...map })); });
            socket.on('parentLocationUpdate', (d) => setOnlineParents(prev => ({ ...prev, [d.studentName]: { lat: d.lat, lng: d.lng, type: 'parent', studentName: d.studentName } })));
            socket.on('parentLeft', (d) => setOnlineParents(prev => { const n = { ...prev }; delete n[d.studentName]; return n; }));
            socket.on('stopStatusUpdate', (data) => {
                if (data.updatedStops) {
                    setAssignedRoute(prev => ({ ...prev, stops: data.updatedStops }));
                }
            });
            socket.on('incomingParentMessage', (data) => {
                setChatMessages(prev => [data, ...prev].slice(0, 100));
                // Only notify for messages from parents (not our own driver replies)
                if (data.sender !== 'driver') {
                    const senderLabel = data.studentName
                        ? `💬 ${data.parentName || 'Parent'} (${data.studentName})`
                        : `💬 ${data.parentName || 'Parent'}`;
                    // In-app sound + toast (works when app is open)
                    notify.info(`${senderLabel}: ${data.message}`, { duration: 6000 });
                    // System-level OS notification (visible even when app is in background on web)
                    showSystemNotification(
                        senderLabel,
                        data.message,
                        { tag: 'parent-msg', type: 'info', urgent: false }
                    );
                }
            });
            socket.on('tripReset', () => {
                setStopStatuses({});
                localStorage.removeItem('driver_stop_statuses');
                // Use ref to avoid stale closure — assignedRoute inside this callback
                // would otherwise always be the value from when the effect first ran.
                const currentRoute = assignedRouteRef.current;
                if (currentRoute) {
                    setAssignedRoute(prev => ({
                        ...prev,
                        stops: (prev?.stops || []).map(s => ({ ...s, status: 'pending', delayMinutes: 0, actualTime: null }))
                    }));
                }
            });
            socket.emit('joinRoom', `bus_${selectedBus.busNumber}_driver`);
            socket.emit('joinRoom', `bus_${selectedBus.busNumber}`);
        }
        return () => {
            socket.off('activeParentsList');
            socket.off('parentLocationUpdate');
            socket.off('parentLeft');
            socket.off('incomingParentMessage');
            socket.off('tripReset');
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, [selectedBus]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            socket.disconnect();
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, []);

    useEffect(() => {
        const markers = [];
        if (location) markers.push({
            lat: location.lat,
            lng: location.lng,
            type: 'bus',
            busId: selectedBus?.busNumber
        });
        if (assignedRoute?.stops) assignedRoute.stops.forEach((s, i) => {
            if (s.location?.lat) markers.push({
                lat: s.location.lat, lng: s.location.lng, type: 'stop',
                studentName: s.name, stopNumber: i + 1,
                stopStatus: stopStatuses[i] || 'pending'
            });
        });
        Object.values(onlineParents).forEach(p => markers.push(p));
        setMapMarkers(markers);
    }, [location, assignedRoute, onlineParents, stopStatuses]);

    // Fetch road-following route geometry
    useEffect(() => {
        if (assignedRoute?.stops?.length >= 2) {
            const waypoints = assignedRoute.stops.filter(s => s.location?.lat).map(s => ({ lat: s.location.lat, lng: s.location.lng }));
            fetchRoadRoute(waypoints, MAPBOX_TOKEN).then(geo => setRoadGeometry(geo));
        } else {
            setRoadGeometry(null);
        }
    }, [assignedRoute]);

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleResetTrip = () => {
        if (!selectedBus) return;
        if (window.confirm("This will reset all stop statuses for this route. Start new trip?")) {
            // 1. Emit to server so DB + all clients get the reset
            socket.emit('resetTrip', { busId: selectedBus.busNumber });

            // 2. Optimistic local update — don't wait for socket echo, reset UI immediately
            setStopStatuses({});
            localStorage.removeItem('driver_stop_statuses');
            setAssignedRoute(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    stops: prev.stops.map(s => ({ ...s, status: 'pending', delayMinutes: 0, actualTime: null }))
                };
            });
        }
    };

    const markStop = (index, status) => {
        setStopStatuses(prev => {
            const updated = { ...prev, [index]: status };
            localStorage.setItem('driver_stop_statuses', JSON.stringify(updated));
            return updated;
        });
        if (selectedBus && assignedRoute) {
            socket.emit('stopReached', {
                busId: selectedBus.busNumber,
                stopIndex: index,
                status,
                stopName: assignedRoute.stops[index]?.name || `Stop ${index + 1}`,
                timestamp: new Date().toISOString()
            });
        }
    };

    const startSimulation = () => {
        if (!assignedRoute || !assignedRoute.stops || assignedRoute.stops.length === 0) {
            alert("No assigned route to simulate.");
            return;
        }

        setIsSimulating(true);
        setStatus('Testing: Moving...');
        let currentPointIdx = 0;

        let path = [];
        if (roadGeometry && roadGeometry.length > 0) {
            path = roadGeometry;
        } else {
            path = assignedRoute.stops.filter(s => s.location?.lat).map(s => ({ lat: s.location.lat, lng: s.location.lng }));
        }

        if (path.length === 0) {
            alert("No valid coordinates found in route to simulate.");
            setIsSimulating(false);
            return;
        }

        simIntervalRef.current = setInterval(() => {
            if (currentPointIdx >= path.length) {
                clearInterval(simIntervalRef.current);
                setIsSimulating(false);
                setStatus('Sim Finished');
                return;
            }

            const point = path[currentPointIdx];
            if (point.lat && point.lng) {
                const simulatedLoc = { lat: point.lat, lng: point.lng };
                setLocation(simulatedLoc);
                socket.emit('driverLocation', {
                    busId: selectedBus.busNumber,
                    lat: point.lat,
                    lng: point.lng,
                    speed: 40,
                    heading: 0,
                    driverName: user?.name
                });

                assignedRoute.stops.forEach((stop, index) => {
                    if (!stop.location?.lat) return;
                    const d = calculateDistance(point.lat, point.lng, stop.location.lat, stop.location.lng);
                    const currentStatus = stopStatuses[index] || 'pending';
                    if (d < 0.08 && currentStatus === 'pending') {
                        markStop(index, 'reached');
                    }
                });
            }
            currentPointIdx++;
        }, 3000);
    };

    const stopSimulation = () => {
        if (simIntervalRef.current) {
            clearInterval(simIntervalRef.current);
            simIntervalRef.current = null;
        }
        setIsSimulating(false);
        setStatus('Sim Stopped');
    };

    const startSharing = () => {
        if (!selectedBus) return;
        setIsSharing(true);
        isSharingRef.current = true; // Immediately enable geofencing in the callback
        setStatus('Transmitting...');
        // Note: We do NOT save isSharing to localStorage anymore — driver must always
        // press Start Trip manually each session to prevent phantom tracking.

        // Initial "I'm online" heartbeat (send location only if we already have a valid fix)
        const initialLoc = (location?.lat && location?.lng) ? { lat: location.lat, lng: location.lng } : {};
        if (initialLoc.lat) {
            socket.emit('driverLocation', {
                busId: selectedBus.busNumber,
                ...initialLoc,
                driverName: user?.name,
                status: 'starting'
            });
        }

        if (isNative) {
            startBackgroundGeolocation((loc) => {
                const { lat, lng, speed, heading } = loc;
                setLocation({ lat, lng });
                socket.emit('driverLocation', { busId: selectedBus.busNumber, lat, lng, speed, heading, driverName: user?.name });

                // GEOFENCING logic repeated for background context
                if (assignedRoute?.stops) {
                    assignedRoute.stops.forEach((stop, index) => {
                        if (!stop.location?.lat) return;
                        const dist = calculateDistance(lat, lng, stop.location.lat, stop.location.lng);
                        const currentStatus = stopStatuses[index] || 'pending';
                        if (dist < 0.08 && currentStatus === 'pending') markStop(index, 'reached');
                        else if (dist > 0.15 && currentStatus === 'reached') markStop(index, 'left');
                    });
                }
            });
        } else if (navigator.geolocation) {
            if (watchIdRef.current) return;
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    // Only process location updates when trip is actively running
                    if (!isSharingRef.current) return;

                    const { latitude, longitude, speed, heading } = pos.coords;
                    if (latitude && longitude && (latitude !== 0 || longitude !== 0)) {
                        const newLoc = { lat: latitude, lng: longitude };
                        setLocation(newLoc);

                        const currentBus = selectedBusRef.current;
                        if (!currentBus) return;
                        socket.emit('driverLocation', { busId: currentBus.busNumber, lat: latitude, lng: longitude, speed, heading, driverName: user?.name });

                        // Geofencing: use refs so we always have fresh state (no stale closure)
                        const route = assignedRouteRef.current;
                        const currentStatuses = stopStatusesRef.current;
                        if (route?.stops) {
                            route.stops.forEach((stop, index) => {
                                if (!stop.location?.lat) return;
                                const dist = calculateDistance(latitude, longitude, stop.location.lat, stop.location.lng);
                                const stopStatus = currentStatuses[index] || 'pending';
                                if (dist < 0.08 && stopStatus === 'pending') markStop(index, 'reached');
                                else if (dist > 0.15 && stopStatus === 'reached') markStop(index, 'left');
                            });
                        }
                    }
                },
                (err) => { console.error(err); setStatus('GPS Error: ' + err.message); },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0  // Never use cached/stale GPS — always get fresh position
                }
            );
        } else {
            alert('Geolocation not supported');
        }
    };

    const stopSharing = () => {
        setIsSharing(false); setStatus('Trip Ended');
        isSharingRef.current = false; // Immediately stop geofencing in the callback
        localStorage.removeItem('driver_is_sharing');
        localStorage.removeItem('driver_active_bus');
        localStorage.removeItem('driver_stop_statuses');
        setStopStatuses({});

        // Reset the stops UI to 'pending' immediately so the panel shows a clean state
        // (The DB will be reset when driver presses "Start New Trip")
        setAssignedRoute(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                stops: prev.stops.map(s => ({ ...s, status: 'pending', delayMinutes: 0, actualTime: null }))
            };
        });

        if (selectedBus) {
            socket.emit('driverSessionEnd', { busId: selectedBus.busNumber });
        }

        if (isNative) {
            stopBackgroundGeolocation();
        } else if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    };


    // Change Bus: stop any active trip, clear bus + route selection
    const handleChangeBus = () => {
        if (isSharing) {
            if (!window.confirm('A trip is currently active. Stop trip and change bus?')) return;
            stopSharing();
        }
        setSelectedBus(null);
        setAssignedRoute(null);
        setStopStatuses({});
        setLocation(null);
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

    const handleSendReply = (e) => {
        e.preventDefault();
        if (!replyMsg.trim() || !selectedBus) return;

        const timestamp = new Date().toISOString();
        const msgData = {
            busId: selectedBus.busNumber,
            message: replyMsg.trim(),
            driverName: user?.name || 'Driver',
            timestamp,
            sender: 'driver'
        };

        socket.emit('driverMessage', msgData);
        setChatMessages(prev => [msgData, ...prev].slice(0, 100));
        setReplyMsg('');
    };

    return (
        <div className="h-screen-safe flex flex-col md:flex-row overflow-hidden bg-surface-50 dark:bg-surface-950 relative">
            {/* Clean Background Design Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 dark:opacity-10" />
            </div>
            {/* Map */}
            <div className="flex-1 relative order-1 md:order-2 min-h-0">
                <div className="absolute inset-0">
                    <MapComponent
                        markers={mapMarkers}
                        drawLine={roadGeometry || (assignedRoute?.stops?.length >= 2 ? assignedRoute.stops.filter(s => s.location?.lat).map(s => ({ lat: s.location.lat, lng: s.location.lng })) : null)}
                        initialViewState={{ latitude: location?.lat || 28.6139, longitude: location?.lng || 77.2090, zoom: 14 }}
                    />
                </div>
                {/* Mobile Header */}
                <div className="absolute top-0 left-0 right-0 z-10 md:hidden">
                    <div className="bg-glass border-b border-surface-200/50 dark:border-surface-700/40 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img src="/logo.png" alt="Logo" className="w-8 h-6 object-contain" />
                            <h1 className="text-lg font-bold text-surface-900 dark:text-white truncate max-w-[100px]">Hi, {user?.name || 'Driver'}</h1>
                            {selectedBus && <span className="badge badge-info text-[10px]">BUS-{selectedBus.busNumber}</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                            {isSharing && <span className="badge badge-success px-2 py-0.5 text-[10px]"><Radio size={8} className="animate-pulse" /> LIVE</span>}
                            {selectedBus && (
                                <button
                                    onClick={handleChangeBus}
                                    className="flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 px-2 py-1 rounded-lg active:scale-95 transition-all"
                                >
                                    <RefreshCw size={10} />
                                    Change
                                </button>
                            )}
                            <ThemeToggle />
                            <button onClick={logout} className="btn-ghost p-1.5"><LogOut size={16} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Panel */}
            <div className={`order-2 md:order-1 md:w-[380px] z-20 transition-all duration-300 md:h-full
                ${panelExpanded ? 'h-[70dvh]' : 'h-[130px] md:h-full'}
                relative
                bg-white dark:bg-surface-800 rounded-t-3xl md:rounded-none
                border-t md:border-r border-surface-200 dark:border-surface-700/50 shadow-glass-lg md:shadow-none overflow-hidden flex flex-col`}>
                <div className="md:hidden flex justify-center pt-2 pb-1 cursor-pointer flex-shrink-0" onClick={() => setPanelExpanded(!panelExpanded)}>
                    <div className="w-10 h-1 bg-surface-300 dark:bg-surface-600 rounded-full" />
                </div>
                <div className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-full pb-8">
                    {/* Simplified header for desktop, hidden on mobile to avoid double-headers */}
                    <div className="hidden md:flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="Logo" className="w-10 h-8 object-contain" />
                            <div className="flex flex-col">
                                <h1 className="text-xl font-bold text-surface-900 dark:text-white">Welcome, {user?.name || 'Driver'}</h1>
                                <p className="text-xs text-brand-600 dark:text-brand-400 font-bold uppercase tracking-widest">Driver Dashboard</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2"><ThemeToggle /><button onClick={logout} className="btn-ghost p-1.5"><LogOut size={18} /></button></div>
                    </div>

                    <div className="bg-surface-50 dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-700/40">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-surface-400 dark:text-surface-500 mb-1 font-medium">Bus Number</p>
                                {selectedBus ? (
                                    <div className="flex items-center gap-2">
                                        <p className="text-lg font-bold font-mono text-surface-900 dark:text-white">BUS-{selectedBus.busNumber}</p>
                                        {!isSharing && (
                                            <button
                                                onClick={handleChangeBus}
                                                className="flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 px-2 py-1 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-all active:scale-95"
                                            >
                                                <RefreshCw size={10} /> Change Bus
                                            </button>
                                        )}
                                        {isSharing && (
                                            <button
                                                onClick={handleChangeBus}
                                                className="flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-2 py-1 rounded-lg hover:bg-red-100 transition-all active:scale-95"
                                                title="Will stop the current trip"
                                            >
                                                <RefreshCw size={10} /> Change Bus
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <select className="input py-2 text-sm" onChange={(e) => setSelectedBus(availableBuses.find(b => b._id === e.target.value))}>
                                        <option value="">Select Bus</option>
                                        {availableBuses.map(b => <option key={b._id} value={b._id}>Bus {b.busNumber}</option>)}
                                    </select>
                                )}
                            </div>
                            <div>{isSharing ? <span className="badge badge-success"><Radio size={10} className="animate-pulse" /> LIVE</span> : <span className="badge badge-neutral">{status}</span>}</div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <MapPin size={16} className="text-brand-500 flex-shrink-0" />
                            {location ? <span className="font-mono text-xs text-surface-500 dark:text-surface-400">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span> : <span className="text-surface-400 text-xs">Waiting for GPS...</span>}
                        </div>
                    </div>

                    {assignedRoute && (
                        <div className="bg-surface-50 dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-700/40">
                            <h3 className="font-bold text-brand-800 dark:text-brand-300 text-sm mb-1 flex items-center gap-2">
                                {assignedRoute.name}
                            </h3>
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] text-surface-400">Manage stops & sequence</p>
                                <button
                                    onClick={handleResetTrip}
                                    className="text-[11px] font-bold text-brand-600 hover:text-white hover:bg-brand-600 bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5 rounded-xl transition-all border border-brand-200 dark:border-brand-800 active:scale-95 shadow-sm"
                                >
                                    Start New Trip
                                </button>
                            </div>
                            <p className="text-xs text-surface-400 mt-2 mb-3">{assignedRoute.stops.length} Stops • Tap to mark status</p>

                            {/* Stop Timeline */}
                            <div className="relative">
                                {/* Vertical Line */}
                                {/* Vertical Line: Center of w-8 circle (32px) is 16px */}
                                <div className="absolute left-[16px] top-4 bottom-4 w-0.5 bg-surface-200 dark:bg-surface-700" />
                                <div className="space-y-1">
                                    {assignedRoute.stops.map((stop, i) => {
                                        const st = stop.status || 'pending';

                                        // Time Shift Logic
                                        const parseScheduledTime = (t) => {
                                            if (!t) return null;
                                            // Handle "05:20" format
                                            const m = t.match(/^(\d{1,2}):(\d{2})$/);
                                            if (m) {
                                                const h = parseInt(m[1]);
                                                const min = parseInt(m[2]);
                                                return h * 60 + min;
                                            }
                                            // Fallback to existing parseTime for other formats
                                            return parseTime(t);
                                        };

                                        const parseTime = (t) => {
                                            if (!t) return null;
                                            const m12 = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
                                            if (m12) {
                                                let h = parseInt(m12[1]), min = parseInt(m12[2]);
                                                if (m12[3].toUpperCase() === 'PM' && h !== 12) h += 12;
                                                if (m12[3].toUpperCase() === 'AM' && h === 12) h = 0;
                                                return h * 60 + min;
                                            }
                                            const m24 = t.match(/(\d+):(\d+)/);
                                            if (m24) {
                                                return parseInt(m24[1]) * 60 + parseInt(m24[2]);
                                            }
                                            return null;
                                        };
                                        const formatTime = (min) => {
                                            let h = Math.floor(min / 60) % 24, m = min % 60;
                                            const p = h >= 12 ? 'PM' : 'AM';
                                            h = h % 12 || 12;
                                            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${p}`;
                                        };

                                        const schedMin = parseScheduledTime(stop.arrivalTime);
                                        const delay = stop.delayMinutes || 0;
                                        const formattedSchedTime = schedMin !== null ? formatTime(schedMin) : stop.arrivalTime;
                                        const realTime = schedMin !== null ? formatTime(schedMin + delay) : null;

                                        return (
                                            <div key={i} className="flex items-start gap-3 relative">
                                                {/* Circle */}
                                                <div className={`z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all mt-1 ${st === 'reached' ? 'bg-green-500 border-green-600 text-white' :
                                                    st === 'left' ? 'bg-gray-400 border-gray-500 text-white' :
                                                        'bg-white dark:bg-surface-800 border-surface-300 dark:border-surface-600 text-surface-500'
                                                    }`}>
                                                    {i + 1}
                                                </div>
                                                {/* Info */}
                                                <div className="flex-1 min-w-0 py-2">
                                                    <p className={`text-xs font-semibold truncate ${st === 'left' ? 'text-surface-400 line-through' : 'text-surface-800 dark:text-surface-200'
                                                        }`}>{stop.name}</p>
                                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                                        {stop.arrivalTime && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-surface-400">Scheduled: {formattedSchedTime}</span>
                                                                {st === 'reached' ? (
                                                                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400">Actual: {stop.actualTime || realTime}</span>
                                                                ) : (
                                                                    realTime && realTime !== formattedSchedTime && (
                                                                        <span className={`text-[10px] font-bold ${delay > 0 ? 'text-red-500' : 'text-green-500'}`}>Est: {realTime}</span>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                        {delay > 0 && <span className="text-[9px] font-bold text-red-500">+{delay} min delay</span>}
                                                    </div>
                                                </div>
                                                {/* Action */}
                                                {isSharing && (
                                                    <div className="flex-shrink-0 mt-2">
                                                        {st === 'pending' && (
                                                            <button onClick={() => markStop(i, 'reached')} className="text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-lg hover:bg-green-200 transition-colors">
                                                                Reached
                                                            </button>
                                                        )}
                                                        {st === 'reached' && (
                                                            <button onClick={() => markStop(i, 'left')} className="text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-lg hover:bg-yellow-200 transition-colors">
                                                                Bus Left
                                                            </button>
                                                        )}
                                                        {st === 'left' && (
                                                            <span className="text-[10px] font-bold text-surface-400 px-2 py-1">Done ✓</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {Object.keys(onlineParents).length > 0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">{Object.keys(onlineParents).length} Parent(s) Online</p>
                            <div className="flex flex-wrap gap-1">{Object.keys(onlineParents).map(n => <span key={n} className="badge badge-success text-[10px]">{n}</span>)}</div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {!isSharing ? (
                            <button onClick={startSharing} disabled={!selectedBus} className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base shadow-lg shadow-brand-500/20">
                                <Play size={22} fill="currentColor" /> Start Trip
                            </button>
                        ) : (
                            <button onClick={stopSharing} className="w-full py-4 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-500/25">
                                <Square size={22} fill="currentColor" /> Stop Trip
                            </button>
                        )}
                    </div>

                    {/* Status Update Broadcaster */}
                    <div className="bg-surface-50 dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-700/40">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                <Send size={14} className="text-brand-500" /> Broadcast Status
                            </h3>
                        </div>

                        {/* Tabs */}
                        <div className="flex p-1 bg-surface-100 dark:bg-surface-800 rounded-xl mb-4">
                            {['delay', 'emergency', 'info'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setStatusType(tab)}
                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all capitalize ${statusType === tab
                                        ? 'bg-white dark:bg-surface-700 text-brand-600 dark:text-brand-400 shadow-sm'
                                        : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            {statusType === 'delay' && (
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Traffic Jam', msg: 'Stuck in heavy traffic. Expect slight delay.' },
                                        { label: 'Breakdown', msg: 'Vehicle breakdown. Waiting for assistance.' },
                                        { label: 'Weather', msg: 'Slow driving due to poor weather conditions.' },
                                        { label: 'Late Start', msg: 'Bus starting late from school today.' },
                                    ].map((item) => (
                                        <button
                                            key={item.label}
                                            onClick={() => {
                                                socket.emit('driverStatusUpdate', {
                                                    busId: selectedBus.busNumber,
                                                    message: item.msg,
                                                    type: 'delay',
                                                    driverName: user?.name || 'Driver'
                                                });
                                                notify.success('Delay broadcast sent');
                                            }}
                                            className="py-2 px-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/40 text-yellow-700 dark:text-yellow-400 rounded-xl text-[10px] font-bold hover:bg-yellow-100 transition-colors"
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {statusType === 'emergency' && (
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Accident', msg: 'Emergency: Minor accident occurred. All safe.' },
                                        { label: 'Medical', msg: 'Medical emergency on board. Stopping now.' },
                                        { label: 'Brake Issue', msg: 'Mechanical failure. Stopping immediately.' },
                                        { label: 'Needs Help', msg: 'Assistance required immediately at current location.' },
                                    ].map((item) => (
                                        <button
                                            key={item.label}
                                            onClick={() => {
                                                socket.emit('driverStatusUpdate', {
                                                    busId: selectedBus.busNumber,
                                                    message: item.msg,
                                                    type: 'emergency',
                                                    driverName: user?.name || 'Driver'
                                                });
                                                notify.error('Emergency alert sent!');
                                            }}
                                            className="py-2 px-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 rounded-xl text-[10px] font-bold hover:bg-red-100 transition-colors"
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {statusType === 'info' && (
                                <form onSubmit={handleSendStatus} className="space-y-3">
                                    <textarea
                                        rows={2}
                                        className="input py-2 text-xs resize-none"
                                        placeholder="Type custom info message..."
                                        value={statusMessage}
                                        onChange={e => setStatusMessage(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!statusMessage.trim() || !selectedBus}
                                        className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-2"
                                    >
                                        <Send size={14} /> Send Custom Info
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Messages from Parents */}
                    <div className="bg-surface-50 dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-700/40 flex flex-col min-h-0">
                        <h3 className="text-xs font-bold text-surface-900 dark:text-white mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MessageSquare size={14} className="text-brand-500" /> Persistent Chat
                                {chatMessages.length > 0 && <span className="badge badge-info text-[10px] px-1.5 py-0 min-w-[18px] text-center">{chatMessages.length}</span>}
                            </div>
                        </h3>

                        <div className="h-[350px] space-y-2 overflow-y-auto pr-1 custom-scrollbar flex flex-col-reverse mb-3">
                            {chatMessages.length === 0 ? (
                                <p className="text-[10px] text-surface-400 text-center py-4 italic">No messages yet</p>
                            ) : (
                                chatMessages.map((msg, i) => (
                                    <div key={i} className={`rounded-xl p-2 border ${msg.sender === 'driver' ? 'bg-brand-50/50 dark:bg-brand-900/10 border-brand-100/50 dark:border-brand-500/20 self-end max-w-[90%]' : 'bg-white dark:bg-surface-800 border-surface-200/50 dark:border-surface-700/30 self-start max-w-[90%]'}`}>
                                        <div className="flex justify-between items-center mb-1 gap-4">
                                            <span className="font-bold text-[9px] text-brand-600 dark:text-brand-400 capitalize truncate">{msg.sender === 'driver' ? 'Me (Driver)' : (msg.studentName || 'Parent')}</span>
                                            <span className="text-[8px] text-surface-400 font-mono shrink-0">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-[10px] text-surface-600 dark:text-surface-300 leading-tight">{msg.message}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={handleSendReply} className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 text-[11px] focus:ring-1 focus:ring-brand-500 focus:outline-none dark:text-white"
                                placeholder="Message parents..."
                                value={replyMsg}
                                onChange={e => setReplyMsg(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={!replyMsg.trim() || !selectedBus}
                                className="bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-xl transition-all active:scale-95"
                            >
                                <Send size={14} />
                            </button>
                        </form>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={() => setShowAllRoutes(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-brand-600 dark:text-brand-400 font-bold rounded-xl transition-colors border border-surface-200 dark:border-surface-700/50"
                        >
                            <Map size={18} /> View All Bus Routes
                        </button>
                    </div>

                    <p className="text-center text-[10px] text-surface-400 dark:text-surface-500 pt-2 italic">Keep this tab open for background tracking.</p>
                </div>
            </div>
            {/* All Routes Modal */}
            {
                showAllRoutes && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowAllRoutes(false)}>
                        <div className="bg-white dark:bg-surface-800 w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] md:max-h-[80vh] animate-slide-up" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700/50">
                                <h2 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                    <Route className="text-brand-500" size={20} /> School Bus Routes
                                </h2>
                                <button onClick={() => setShowAllRoutes(false)} className="p-2 bg-surface-100 hover:bg-surface-200 dark:bg-surface-700 dark:hover:bg-surface-600 rounded-full transition-colors"><X size={20} /></button>
                            </div>
                            <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                                {allRoutes.length === 0 ? (
                                    <p className="text-center text-surface-500 py-8">Loading routes...</p>
                                ) : (
                                    allRoutes.map(r => (
                                        <div key={r._id} className="bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700/50 rounded-2xl p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="font-bold text-surface-900 dark:text-white text-base">{r.name}</h3>
                                                {r.assignedBus ? (
                                                    <span className="badge badge-info whitespace-nowrap">BUS {r.assignedBus.busNumber}</span>
                                                ) : (
                                                    <span className="badge badge-neutral whitespace-nowrap">Unassigned</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {r.stops?.map((s, i) => (
                                                    <div key={i} className="flex items-center gap-1.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 px-2.5 py-1.5 rounded-lg text-xs shadow-sm shadow-surface-200/20 dark:shadow-none">
                                                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 text-[9px] font-bold">{i + 1}</span>
                                                        <span className="font-medium text-surface-700 dark:text-surface-300">{s.name}</span>
                                                    </div>
                                                ))}
                                                {(!r.stops || r.stops.length === 0) && <span className="text-xs text-surface-400 italic">No stops added</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default DriverDashboard;

