import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';
import { Play, Square, MapPin, LogOut, Radio, Send, AlertTriangle, Info, Siren, MessageSquare } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

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
    const [panelExpanded, setPanelExpanded] = useState(true);
    const [onlineParents, setOnlineParents] = useState({});

    // Communication State
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState('info');
    const [parentMessages, setParentMessages] = useState([]);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        axios.get('http://localhost:5000/api/buses')
            .then(res => {
                const buses = res.data;
                setAvailableBuses(buses);
                const savedBusId = localStorage.getItem('driver_active_bus');
                const savedSharing = localStorage.getItem('driver_is_sharing') === 'true';
                if (savedBusId) {
                    const bus = buses.find(b => b._id === savedBusId);
                    if (bus) { setSelectedBus(bus); if (savedSharing) { setIsSharing(true); setStatus('Resuming...'); } }
                }
            })
            .catch(err => console.error(err));
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.log("Location error:", err)
            );
        }
    }, []);

    useEffect(() => { if (isSharing && selectedBus && !watchIdRef.current) startSharing(); }, [isSharing, selectedBus]);

    useEffect(() => {
        if (!selectedBus) { setAssignedRoute(null); return; }
        axios.get('http://localhost:5000/api/routes').then(({ data }) => {
            setAssignedRoute(data.find(r => r.assignedBus?._id === selectedBus._id) || null);
        }).catch(console.error);
    }, [selectedBus]);

    useEffect(() => {
        socket.connect();
        if (selectedBus) {
            socket.on('activeParentsList', (list) => { const map = {}; list.forEach(p => { map[p.studentName] = { lat: p.lat, lng: p.lng, type: 'parent', studentName: p.studentName }; }); setOnlineParents(prev => ({ ...prev, ...map })); });
            socket.on('parentLocationUpdate', (d) => setOnlineParents(prev => ({ ...prev, [d.studentName]: { lat: d.lat, lng: d.lng, type: 'parent', studentName: d.studentName } })));
            socket.on('parentLeft', (d) => setOnlineParents(prev => { const n = { ...prev }; delete n[d.studentName]; return n; }));
            socket.on('incomingParentMessage', (data) => setParentMessages(prev => [data, ...prev]));
            socket.emit('joinRoom', `bus_${selectedBus.busNumber}_driver`);
        }
        return () => { socket.off('parentLocationUpdate'); socket.off('activeParentsList'); socket.off('parentLeft'); socket.disconnect(); if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); };
    }, [selectedBus]);

    useEffect(() => {
        const markers = [];
        if (location) markers.push({ lat: location.lat, lng: location.lng, type: 'bus' });
        if (assignedRoute?.stops) assignedRoute.stops.forEach(s => { if (s.location?.lat) markers.push({ lat: s.location.lat, lng: s.location.lng, type: 'stop', studentName: s.name }); });
        Object.values(onlineParents).forEach(p => markers.push(p));
        setMapMarkers(markers);
    }, [location, assignedRoute, onlineParents]);

    const startSharing = () => {
        if (!selectedBus) return;
        setIsSharing(true); setStatus('Transmitting...');
        localStorage.setItem('driver_active_bus', selectedBus._id); localStorage.setItem('driver_is_sharing', 'true');
        if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
        if (watchIdRef.current) return;
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => { const { latitude, longitude, speed, heading } = pos.coords; setLocation({ lat: latitude, lng: longitude }); if (selectedBus) socket.emit('driverLocation', { busId: selectedBus.busNumber, lat: latitude, lng: longitude, speed, heading }); },
            (err) => { console.error(err); setStatus('Error: ' + err.message); },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
        );
    };

    const stopSharing = () => {
        setIsSharing(false); setStatus('Trip Ended');
        localStorage.removeItem('driver_is_sharing'); localStorage.removeItem('driver_active_bus');
        if (selectedBus) socket.emit('driverSessionEnd', { busId: selectedBus.busNumber });
        if (watchIdRef.current) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
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
        <div className="h-screen-safe flex flex-col md:flex-row overflow-hidden bg-surface-100 dark:bg-surface-950">
            {/* Map */}
            <div className="flex-1 relative order-1 md:order-2 min-h-0">
                <div className="absolute inset-0">
                    <MapComponent markers={mapMarkers} initialViewState={{ latitude: location?.lat || 28.6139, longitude: location?.lng || 77.2090, zoom: 14 }} />
                </div>
                {/* Mobile Header */}
                <div className="absolute top-0 left-0 right-0 z-10 md:hidden">
                    <div className="bg-glass border-b border-surface-200/50 dark:border-surface-700/40 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-surface-900 dark:text-white">Driver</h1>
                            {selectedBus && <span className="badge badge-info text-[10px]">BUS-{selectedBus.busNumber}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            {isSharing && <span className="badge badge-success px-2 py-0.5 text-[10px]"><Radio size={8} className="animate-pulse" /> LIVE</span>}
                            <ThemeToggle />
                            <button onClick={logout} className="btn-ghost p-1.5"><LogOut size={16} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Panel */}
            <div className={`order-2 md:order-1 md:w-[380px] z-20 transition-all duration-300 md:h-full
                ${panelExpanded ? 'h-[55%]' : 'h-auto'}
                md:relative fixed bottom-0 left-0 right-0
                bg-white dark:bg-surface-800 rounded-t-3xl md:rounded-none
                border-t md:border-r border-surface-200 dark:border-surface-700/50 shadow-glass-lg md:shadow-none`}>
                <div className="md:hidden flex justify-center pt-2 pb-1 cursor-pointer" onClick={() => setPanelExpanded(!panelExpanded)}>
                    <div className="w-10 h-1 bg-surface-300 dark:bg-surface-600 rounded-full" />
                </div>
                <div className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-full pb-8">
                    <div className="hidden md:flex items-center justify-between">
                        <h1 className="text-xl font-bold text-surface-900 dark:text-white">Driver Dashboard</h1>
                        <div className="flex items-center gap-2"><ThemeToggle /><button onClick={logout} className="btn-ghost p-1.5"><LogOut size={18} /></button></div>
                    </div>

                    <div className="bg-surface-50 dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-700/40">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                                <p className="text-xs text-surface-400 dark:text-surface-500 mb-1 font-medium">Bus Number</p>
                                {selectedBus ? (
                                    <p className="text-lg font-bold font-mono text-surface-900 dark:text-white">BUS-{selectedBus.busNumber}</p>
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
                        <div className="bg-brand-50 dark:bg-brand-950/20 p-4 rounded-2xl border border-brand-100 dark:border-brand-900/30">
                            <h3 className="font-bold text-brand-800 dark:text-brand-300 text-sm mb-1">{assignedRoute.name}</h3>
                            <p className="text-xs text-brand-600 dark:text-brand-400 mb-2">{assignedRoute.stops.length} Stops</p>
                            <div className="flex flex-wrap gap-1.5">
                                {assignedRoute.stops.map((s, i) => <span key={i} className="bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full text-[10px] font-medium">{s.name}</span>)}
                            </div>
                        </div>
                    )}

                    {Object.keys(onlineParents).length > 0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">{Object.keys(onlineParents).length} Parent(s) Online</p>
                            <div className="flex flex-wrap gap-1">{Object.keys(onlineParents).map(n => <span key={n} className="badge badge-success text-[10px]">{n}</span>)}</div>
                        </div>
                    )}

                    {!isSharing ? (
                        <button onClick={startSharing} disabled={!selectedBus} className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"><Play size={22} /> Start Trip</button>
                    ) : (
                        <button onClick={stopSharing} className="w-full py-4 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-500/25">
                            <Square size={22} fill="currentColor" /> Stop Trip
                        </button>
                    )}

                    {/* Status Update Broadcaster */}
                    <div className="bg-surface-50 dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-700/40">
                        <h3 className="text-xs font-bold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
                            <Send size={14} className="text-brand-500" /> Broadcast Status
                        </h3>
                        <form onSubmit={handleSendStatus} className="space-y-3">
                            <div className="flex gap-1.5">
                                {[
                                    { type: 'info', icon: <Info size={12} /> },
                                    { type: 'delay', icon: <AlertTriangle size={12} /> },
                                    { type: 'emergency', icon: <Siren size={12} /> },
                                ].map(({ type, icon }) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setStatusType(type)}
                                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${statusType === type
                                            ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                                            : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700/50 text-surface-500'
                                            }`}
                                    >
                                        {icon} {type.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                rows={2}
                                className="input py-2 text-xs resize-none"
                                placeholder="Message to parents..."
                                value={statusMessage}
                                onChange={e => setStatusMessage(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={!statusMessage.trim() || !selectedBus}
                                className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-2"
                            >
                                <Send size={14} /> Send Broadcast
                            </button>
                        </form>
                    </div>

                    {/* Messages from Parents */}
                    <div className="bg-surface-50 dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-700/40">
                        <h3 className="text-xs font-bold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
                            <MessageSquare size={14} className="text-brand-500" /> Parent Messages
                            {parentMessages.length > 0 && <span className="badge badge-info text-[10px] px-1.5 py-0 min-w-[18px] text-center">{parentMessages.length}</span>}
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {parentMessages.length === 0 ? (
                                <p className="text-[10px] text-surface-400 text-center py-4 italic">No messages yet</p>
                            ) : (
                                parentMessages.map((msg, i) => (
                                    <div key={i} className="bg-white dark:bg-surface-800 rounded-xl p-2.5 border border-surface-200/50 dark:border-surface-700/30">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-[10px] text-brand-600 dark:text-brand-400 capitalize">{msg.studentName || 'Parent'}</span>
                                            <span className="text-[8px] text-surface-400 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-[11px] text-surface-600 dark:text-surface-300 leading-snug">{msg.message}</p>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <p className="text-center text-[10px] text-surface-400 dark:text-surface-500 pt-2 italic">Keep this tab open for background tracking.</p>
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;

