import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { notify } from '../utils/notificationSound';
import axios from 'axios';
import { socket } from '../socket';
import MapComponent from '../components/MapComponent';
import { User, Bus, ArrowLeft, Clock, LogOut, Radio, MapPin, Send, AlertTriangle, Info, Siren } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const ParentDashboard = () => {
    const { logout } = useAuth();
    const [busLocation, setBusLocation] = useState(null);
    const [status, setStatus] = useState('Disconnected');
    const [eta, setEta] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [trackedBusId, setTrackedBusId] = useState('');
    const [isTracking, setIsTracking] = useState(false);
    const [myStudents, setMyStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(true);

    // Communication State
    const [busAlerts, setBusAlerts] = useState([]);
    const [parentMsg, setParentMsg] = useState('');
    const [sending, setSending] = useState(false);
    useEffect(() => {
        const fetchMyStudents = async () => {
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo'));
                const token = userInfo?.token;
                if (!token) return;
                const { data } = await axios.get('http://localhost:5000/api/students/my', { headers: { Authorization: `Bearer ${token}` } });
                setMyStudents(data);
                if (data.length === 1 && data[0].bus) { setTrackedBusId(data[0].bus.busNumber); setIsTracking(true); notify.success(`Tracking ${data[0].name}'s Bus`); }
            } catch (e) { console.error(e); } finally { setLoadingStudents(false); }
        };
        fetchMyStudents();
    }, []);

    useEffect(() => {
        if (!isTracking || !trackedBusId) return;
        socket.connect(); setStatus('Waiting...');
        socket.emit('joinRoom', `bus_${trackedBusId}`);
        socket.on('busLocationUpdate', (data) => {
            console.log('Update received:', data);
            setBusLocation({ lat: data.lat, lng: data.lng });
            setStatus('Live Tracking');
        });

        // Listen for driver status/traffic updates
        socket.on('busStatusUpdate', (data) => {
            setBusAlerts(prev => [data, ...prev].slice(0, 5)); // keep last 5
            if (data.type === 'emergency') {
                notify.error(`🚨 Emergency: ${data.message}`, { duration: 10000 });
            } else if (data.type === 'delay') {
                notify.warning(`⚠️ Delay: ${data.message}`, { duration: 8000 });
            } else {
                notify.info(`ℹ️ ${data.message}`, { duration: 5000 });
            }
        });
        let watchId;
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (pos) => { const lat = pos.coords.latitude, lng = pos.coords.longitude; setUserLocation({ lat, lng }); if (isTracking && trackedBusId) socket.emit('parentLocation', { busId: trackedBusId, lat, lng, studentName: myStudents[0]?.name || 'Parent' }); },
                console.log, { enableHighAccuracy: true }
            );
            socket.on('connect', () => { if (isTracking && trackedBusId && userLocation) socket.emit('parentLocation', { busId: trackedBusId, lat: userLocation.lat, lng: userLocation.lng, studentName: myStudents[0]?.name || 'Parent' }); });
        }
        return () => {
            socket.off('busLocationUpdate');
            socket.off('busStatusUpdate');
            socket.disconnect();
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [isTracking, trackedBusId]);

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const [routeGeometry, setRouteGeometry] = useState(null);
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

    useEffect(() => {
        if (!busLocation || !userLocation) return;
        (async () => {
            try {
                const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.lng},${userLocation.lat};${busLocation.lng},${busLocation.lat}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`);
                const data = await res.json();
                if (data.routes?.[0]) { setRouteGeometry(data.routes[0].geometry.coordinates); setEta({ distance: (data.routes[0].distance / 1000).toFixed(1), time: Math.round(data.routes[0].duration / 60) }); }
                else { const d = calculateDistance(busLocation.lat, busLocation.lng, userLocation.lat, userLocation.lng); setEta({ distance: d.toFixed(1), time: Math.round((d / 30) * 60) || 1 }); setRouteGeometry(null); }
            } catch { const d = calculateDistance(busLocation.lat, busLocation.lng, userLocation.lat, userLocation.lng); setEta({ distance: d.toFixed(1), time: Math.round((d / 30) * 60) || 1 }); setRouteGeometry(null); }
        })();
    }, [busLocation, userLocation]);

    useEffect(() => {
        if (!eta?.time) return; const t = Number(eta.time); if (isNaN(t)) return;
        const k = `alerted_${t}`;
        if (!sessionStorage.getItem(k)) {
            if (t === 10) { notify.busAlert('Bus is 10 minutes away!', 10); sessionStorage.setItem(k, 'true'); }
            else if (t === 5) { notify.busAlert('Get ready! 5 min away!', 5); sessionStorage.setItem(k, 'true'); }
            else if (t === 1) { notify.busAlert('Bus arriving in 1 min!', 1); sessionStorage.setItem(k, 'true'); }
        }
    }, [eta]);

    useEffect(() => { return () => sessionStorage.clear(); }, [trackedBusId]);

    const handleStartTracking = (e) => {
        e.preventDefault();
        if (trackedBusId.trim()) {
            setIsTracking(true);
        }
    };

    const trackStudentBus = (student) => {
        if (student.bus) {
            setTrackedBusId(student.bus.busNumber);
            setIsTracking(true);
            setBusAlerts([]);
            notify.success(`Tracking ${student.name}'s Bus`);
        } else {
            notify.error('No bus assigned to this student');
        }
    };

    // Send a message to the driver
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!parentMsg.trim() || !trackedBusId) return;
        setSending(true);
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        socket.emit('parentMessage', {
            busId: trackedBusId,
            message: parentMsg.trim(),
            parentName: userInfo?.name || 'Parent',
            studentName: myStudents[0]?.name || 'Student'
        });
        setParentMsg('');
        setSending(false);
        notify.success('Message sent to driver!');
    };

    if (!isTracking) {
        return (
            <div className="min-h-screen-safe flex flex-col bg-surface-50 dark:bg-surface-950">
                <div className="flex items-center justify-between px-4 py-3">
                    <span />
                    <div className="flex items-center gap-2"><ThemeToggle /><button onClick={logout} className="btn-ghost p-2"><LogOut size={20} /></button></div>
                </div>
                <div className="flex-1 flex items-center justify-center px-4 pb-8">
                    <div className="card p-6 sm:p-8 w-full max-w-md animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="inline-flex bg-brand-100 dark:bg-brand-900/30 p-3 rounded-2xl mb-4"><Bus size={28} className="text-brand-600 dark:text-brand-400" /></div>
                            <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white mb-1">Track Your Child</h1>
                            <p className="text-surface-400 dark:text-surface-500 text-sm">Select a child or enter bus number</p>
                        </div>
                        {loadingStudents ? (
                            <div className="flex justify-center py-6"><div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" /></div>
                        ) : (
                            <div className="space-y-2 mb-6">
                                {myStudents.length > 0 ? myStudents.map(s => (
                                    <button key={s._id} onClick={() => trackStudentBus(s)}
                                        className="w-full bg-surface-50 dark:bg-surface-900 hover:bg-brand-50 dark:hover:bg-brand-950/20 border border-surface-200 dark:border-surface-700/50 p-4 rounded-2xl flex items-center gap-3 transition-all active:scale-[0.98] text-left group">
                                        <div className="bg-brand-100 dark:bg-brand-900/30 p-2.5 rounded-xl text-brand-600 dark:text-brand-400 group-hover:bg-brand-200 dark:group-hover:bg-brand-800/30 transition-colors"><User size={20} /></div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-surface-800 dark:text-surface-200 truncate">{s.name}</h3>
                                            <p className="text-xs text-surface-400 dark:text-surface-500 flex items-center gap-1"><Bus size={12} /> {s.bus ? `Bus ${s.bus.busNumber}` : 'No Bus'}</p>
                                        </div>
                                        {s.bus && <span className="text-brand-500 dark:text-brand-400 font-semibold text-xs">Track →</span>}
                                    </button>
                                )) : <p className="text-sm text-surface-400 italic py-4 text-center">No students linked.</p>}
                            </div>
                        )}
                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-surface-200 dark:border-surface-700/40" />
                            <span className="flex-shrink-0 mx-4 text-surface-400 dark:text-surface-500 text-xs uppercase">Or manually</span>
                            <div className="flex-grow border-t border-surface-200 dark:border-surface-700/40" />
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); if (trackedBusId.trim()) setIsTracking(true); }} className="space-y-3 mt-4">
                            <input type="text" className="input text-center text-lg font-mono" placeholder="e.g. 101" value={trackedBusId} onChange={e => setTrackedBusId(e.target.value)} />
                            <button type="submit" className="btn-primary w-full">Track Manually</button>
                        </form>

                        {/* Temporary Test Notifications Section */}
                        <div className="mt-8 pt-6 border-t border-surface-200 dark:border-surface-700/40">
                            <h4 className="text-xs font-bold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-4 text-center">Test Notification System</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => notify.success('Success Sound!')} className="btn-ghost text-[11px] py-2 border border-surface-200 dark:border-surface-700/50">🔊 Success</button>
                                <button onClick={() => notify.error('Error Sound!')} className="btn-ghost text-[11px] py-2 border border-surface-200 dark:border-surface-700/50">🔊 Error</button>
                                <button onClick={() => notify.busAlert('Bus is 5 min away!', 5)} className="btn-ghost text-[11px] py-2 border border-surface-200 dark:border-surface-700/50">🔊 Warning (5m)</button>
                                <button onClick={() => notify.busAlert('Bus arriving in 1 min!', 1)} className="btn-ghost text-[11px] py-2 border border-surface-200 dark:border-surface-700/50">🔊 Urgent (1m)</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen-safe flex flex-col bg-surface-100 dark:bg-surface-950">
            <div className="bg-glass border-b border-surface-200/50 dark:border-surface-700/40 px-3 sm:px-4 py-2.5 z-10 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsTracking(false)} className="btn-ghost p-1.5 md:hidden"><ArrowLeft size={20} /></button>
                    <h1 className="text-lg font-bold text-surface-900 dark:text-white hidden md:block">KiddoTrack</h1>
                    <span className="badge badge-info"><Bus size={11} /> Bus {trackedBusId}</span>
                    {status === 'Live Tracking' ? <span className="badge badge-success"><Radio size={10} className="animate-pulse" /> LIVE</span> : <span className="badge badge-warning text-[10px]">{status}</span>}
                </div>
                <div className="flex items-center gap-2">
                    {eta ? (
                        <div className="text-right mr-1">
                            <p className="text-base font-bold text-brand-600 dark:text-brand-400 tabular-nums leading-none">{eta.time} <span className="text-[10px] font-normal text-surface-400">min</span></p>
                            <p className="text-[10px] text-surface-400">{eta.distance} km</p>
                        </div>
                    ) : <p className="text-[10px] text-surface-400 animate-pulse">{busLocation ? 'Calculating...' : 'Waiting...'}</p>}
                    <button onClick={() => setIsTracking(false)} className="btn-ghost text-xs hidden md:block">Change</button>
                    <ThemeToggle />
                    <button onClick={logout} className="btn-ghost p-1.5"><LogOut size={18} /></button>
                </div>
            </div>
            <div className="flex-1 relative min-h-0">
                <MapComponent
                    markers={[
                        ...(busLocation ? [busLocation] : []),
                        ...(userLocation ? [{ ...userLocation, type: 'parent' }] : [])
                    ]}
                    drawLine={routeGeometry ? routeGeometry.map(p => ({ lat: p[1], lng: p[0] })) : (busLocation && userLocation ? [userLocation, busLocation] : null)}
                    initialViewState={{ latitude: busLocation?.lat || userLocation?.lat || 28.6139, longitude: busLocation?.lng || userLocation?.lng || 77.2090, zoom: 13 }}
                />

                {/* Driver Alerts Overlay */}
                {busAlerts.length > 0 && (
                    <div className="absolute top-3 left-3 right-3 z-10 space-y-2 pointer-events-none">
                        {busAlerts.slice(0, 2).map((alert, i) => {
                            const styles = {
                                emergency: { bg: 'bg-red-600', text: 'text-white', icon: <Siren size={15} /> },
                                delay: { bg: 'bg-yellow-400', text: 'text-yellow-900', icon: <AlertTriangle size={15} /> },
                                info: { bg: 'bg-blue-500', text: 'text-white', icon: <Info size={15} /> },
                            }[alert.type] || { bg: 'bg-gray-700', text: 'text-white', icon: <Info size={15} /> };
                            return (
                                <div key={i} className={`${styles.bg} ${styles.text} px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium pointer-events-auto`}>
                                    {styles.icon}
                                    <div className="flex-1">
                                        <span className="font-bold capitalize">{alert.type}: </span>{alert.message}
                                    </div>
                                    <span className="text-xs opacity-70">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Message Driver Panel */}
                <div className="absolute bottom-4 left-3 right-3 z-10">
                    <form onSubmit={handleSendMessage} className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-3 flex gap-2 items-center">
                        <input
                            type="text"
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="Message driver (e.g. My child is absent today)"
                            value={parentMsg}
                            onChange={e => setParentMsg(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={!parentMsg.trim() || sending}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white p-2.5 rounded-lg transition-colors flex-shrink-0"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ParentDashboard;

