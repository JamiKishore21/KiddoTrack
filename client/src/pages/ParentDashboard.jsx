import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { notify, showSystemNotification } from '../utils/notificationSound';
import axios from 'axios';
import { socket } from '../socket';
import MapComponent from '../components/MapComponent';
import { User, Bus, ArrowLeft, Clock, LogOut, Radio, MapPin, Send, AlertTriangle, Info, Siren, MessageSquare, X, Route as RouteIcon, Map, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { API_URL } from '../constants';
import { fetchRoadRoute } from '../utils/fetchRoadRoute';

const ParentDashboard = () => {
    const { user, logout } = useAuth();
    const [busLocation, setBusLocation] = useState(null);
    const [status, setStatus] = useState('Disconnected');
    const [eta, setEta] = useState(null);
    const [trackedBusId, setTrackedBusId] = useState('');
    const [isTracking, setIsTracking] = useState(false);
    const [myStudents, setMyStudents] = useState([]);
    const [trackedStudent, setTrackedStudent] = useState(null);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [isSelectingPickpoint, setIsSelectingPickpoint] = useState(false);
    const [tempPickpoint, setTempPickpoint] = useState(null);
    const [busRoute, setBusRoute] = useState(null);
    const [stopStatuses, setStopStatuses] = useState({});
    const [routeRoadGeometry, setRouteRoadGeometry] = useState(null);
    const [allBuses, setAllBuses] = useState([]);
    const [showBusDropdown, setShowBusDropdown] = useState(false);

    // Communication State
    const [busAlerts, setBusAlerts] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [parentMsg, setParentMsg] = useState('');
    const [sending, setSending] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [activeTab, setActiveTab] = useState('feed');
    const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

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

    const fetchNotificationHistory = async (busId) => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const token = userInfo?.token;
            const userId = userInfo?._id;
            if (!token) return;
            const { data } = await axios.get(`${API_URL}/notifications/bus/${busId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBusAlerts(data);
            const unread = data.filter(n => !n.readBy.some(id => String(id) === String(userId))).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

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

    const markAllAsRead = async () => {
        if (unreadCount === 0) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
            await axios.put(`${API_URL}/notifications/read-all?busId=${trackedBusId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Re-fetch history to get the most accurate state from server
            await fetchNotificationHistory(trackedBusId);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    useEffect(() => {
        const fetchMyStudents = async () => {
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo'));
                const token = userInfo?.token;
                if (!token) return;
                const { data } = await axios.get(`${API_URL}/students/my`, { headers: { Authorization: `Bearer ${token}` } });
                setMyStudents(data);
                if (data.length === 1 && data[0].bus) {
                    const bId = data[0].bus.busNumber;
                    setTrackedBusId(bId);
                    setTrackedStudent(data[0]);
                    // Enter pickpoint selection instead of auto-tracking
                    setIsSelectingPickpoint(true);
                    setTempPickpoint(data[0].stop?.lat ? { lat: data[0].stop.lat, lng: data[0].stop.lng } : null);
                    notify.info('Please set your pickup point on the map');
                    fetchNotificationHistory(bId);
                    fetchChatHistory(bId);
                }
            } catch (e) { console.error(e); } finally { setLoadingStudents(false); }
        };
        const fetchAllBuses = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/buses`);
                setAllBuses(data);
            } catch (e) { console.error('Error fetching buses:', e); }
        };
        fetchMyStudents();
        fetchAllBuses();
    }, []);

    useEffect(() => {
        if ((!isTracking && !isSelectingPickpoint) || !trackedBusId) return;
        socket.connect(); setStatus('Waiting...');
        socket.emit('joinRoom', `bus_${trackedBusId}`);

        // Also fetch history when trackedBusId changes manually
        fetchNotificationHistory(trackedBusId);
        fetchChatHistory(trackedBusId);

        socket.on('busLocationUpdate', (data) => {
            console.log('Update received:', data);
            setBusLocation({
                lat: data.lat,
                lng: data.lng,
                busId: data.busId,
                type: 'bus'
            });
            setStatus('Live Tracking');
        });

        // When driver stops trip (or session expires), clear bus marker and reset status
        socket.on('busSessionEnded', (data) => {
            if (String(data.busId) === String(trackedBusId)) {
                setBusLocation(null);
                setEta(null);
                setStatus('Trip Ended');
                notify.info('The bus trip has ended.');
                showSystemNotification(
                    '🛍️ Trip Ended',
                    `Bus ${data.busId} trip has ended.`,
                    { type: 'info', tag: 'kt-trip-end', urgent: false }
                );
            }
        });

        // Listen for driver status/traffic updates
        socket.on('busStatusUpdate', (data) => {
            setBusAlerts(prev => [data, ...prev].slice(0, 50));
            setUnreadCount(prev => prev + 1);
            if (data.type === 'emergency') {
                notify.error(`🚨 Emergency: ${data.message}`, { duration: 10000 });
                showSystemNotification(
                    `🚨 Emergency — Bus ${data.busId}`,
                    data.message,
                    { type: 'error', tag: 'kt-emergency', urgent: true, autoClose: false }
                );
            } else if (data.type === 'delay') {
                notify.warning(`⚠️ Delay: ${data.message}`, { duration: 8000 });
                showSystemNotification(
                    `⏰ Bus Delay — Bus ${data.busId}`,
                    data.message,
                    { type: 'warning', tag: 'kt-delay' }
                );
            } else {
                notify.info(`ℹ️ ${data.message}`, { duration: 5000 });
                showSystemNotification(
                    `🚌 Bus ${data.busId} — Update`,
                    data.message,
                    { type: 'info', tag: 'kt-bus-info' }
                );
            }
        });

        socket.on('incomingParentMessage', (data) => {
            // Incoming driver reply to parent
            if (data.busId === trackedBusId && data.sender === 'driver') {
                setChatMessages(prev => [data, ...prev].slice(0, 100));
                notify.info(`💬 Driver: ${data.message}`, { duration: 6000 });
                showSystemNotification(
                    `💬 Driver — Bus ${data.busId}`,
                    data.message,
                    { type: 'info', tag: 'kt-driver-msg' }
                );
            } else if (data.busId === trackedBusId) {
                setChatMessages(prev => [data, ...prev].slice(0, 100));
            }
        });

        socket.on('stopStatusUpdate', (data) => {
            if (String(data.busId) === String(trackedBusId)) {
                if (data.updatedStops) {
                    setBusRoute(prev => ({ ...prev, stops: data.updatedStops }));
                } else {
                    setStopStatuses(prev => ({ ...prev, [data.stopIndex]: data.status }));
                }
            }
        });

        socket.on('tripReset', (data) => {
            if (String(data.busId) === String(trackedBusId)) {
                setStopStatuses({});
                notify.info('New trip started! Route reset.');
            }
        });

        socket.on('connect', () => {
            if (isTracking && trackedBusId) {
                // Only emit if we actually have some location data (currently not implemented for parents here)
                // socket.emit('parentLocation', { busId: trackedBusId, lat: parentLat, lng: parentLng, ... });
            }
        });

        return () => {
            socket.off('busLocationUpdate');
            socket.off('busSessionEnded');
            socket.off('busStatusUpdate');
            socket.off('stopStatusUpdate');
            socket.off('incomingParentMessage');
            socket.off('tripReset');
            socket.off('connect');
        };
    }, [isTracking, trackedBusId, isSelectingPickpoint, myStudents]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            socket.disconnect();
        };
    }, []);

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const [routeGeometry, setRouteGeometry] = useState(null);
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

    useEffect(() => {
        // UBER-STYLE: Destination is the student's manually selected stop (Pickpoint)
        const destination = (trackedStudent?.stop?.lat && trackedStudent?.stop?.lng)
            ? { lat: trackedStudent.stop.lat, lng: trackedStudent.stop.lng }
            : null;

        if (!busLocation || !destination) return;

        (async () => {
            try {
                const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${busLocation.lng},${busLocation.lat};${destination.lng},${destination.lat}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`);
                const data = await res.json();
                if (data.routes?.[0]) {
                    setRouteGeometry(data.routes[0].geometry.coordinates);
                    setEta({ distance: (data.routes[0].distance / 1000).toFixed(1), time: Math.round(data.routes[0].duration / 60) });
                }
                else {
                    const d = calculateDistance(busLocation.lat, busLocation.lng, destination.lat, destination.lng);
                    setEta({ distance: d.toFixed(1), time: Math.round((d / 30) * 60) || 1 });
                    setRouteGeometry(null);
                }
            } catch {
                const d = calculateDistance(busLocation.lat, busLocation.lng, destination.lat, destination.lng);
                setEta({ distance: d.toFixed(1), time: Math.round((d / 30) * 60) || 1 });
                setRouteGeometry(null);
            }
        })();
    }, [busLocation, trackedStudent]);

    // Fetch bus route when tracking starts or when selecting pickpoint
    useEffect(() => {
        if (!trackedBusId || (!isTracking && !isSelectingPickpoint)) return;
        (async () => {
            try {
                const { data } = await axios.get(`${API_URL}/routes`);
                const route = data.find(r => r.assignedBus && String(r.assignedBus.busNumber) === String(trackedBusId));
                setBusRoute(route || null);
                // Initialize stop statuses from DB
                if (route?.stops) {
                    const dbStatuses = {};
                    route.stops.forEach((s, i) => { if (s.status && s.status !== 'pending') dbStatuses[i] = s.status; });
                    setStopStatuses(dbStatuses);
                } else {
                    setStopStatuses({});
                }
            } catch (e) { console.error('Error fetching route:', e); }
        })();
    }, [trackedBusId, isTracking, isSelectingPickpoint]);

    // Fetch road-following geometry for the bus route
    useEffect(() => {
        if (busRoute?.stops?.length >= 2) {
            const waypoints = busRoute.stops.filter(s => s.location?.lat).map(s => ({ lat: s.location.lat, lng: s.location.lng }));
            fetchRoadRoute(waypoints, MAPBOX_TOKEN).then(geo => setRouteRoadGeometry(geo));
        } else {
            setRouteRoadGeometry(null);
        }
    }, [busRoute]);

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

    const handleChangeBus = () => {
        setIsTracking(false);
        setIsSelectingPickpoint(false);
        setTempPickpoint(null);
        setBusLocation(null);
        setEta(null);
        setStatus('Disconnected');
        setTrackedBusId('');
        setTrackedStudent(null);
    };

    const handleStartTracking = (e) => {
        e.preventDefault();
        if (trackedBusId.trim()) {
            setIsTracking(true);
        }
    };

    const trackStudentBus = (student) => {
        if (student.bus) {
            setTrackedBusId(student.bus.busNumber);
            setTrackedStudent(student);
            setBusAlerts([]);
            // Instead of immediate tracking, enter selection mode
            setIsSelectingPickpoint(true);
            setTempPickpoint(student.stop?.lat ? { lat: student.stop.lat, lng: student.stop.lng } : null);
            notify.info('Please select your pickup point on the map');
        } else {
            notify.error('No bus assigned to this student');
        }
    };

    const confirmPickpoint = () => {
        if (!tempPickpoint) {
            notify.error('Please click on the map to set a pickup point');
            return;
        }
        setIsTracking(true);
        setIsSelectingPickpoint(false);
        // Temporarily override student stop for this session
        setTrackedStudent(prev => ({ ...prev, stop: tempPickpoint }));
        notify.success(`Tracking ${trackedStudent?.name || 'Bus'}`);
    };

    // Send a message to the driver
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!parentMsg.trim() || !trackedBusId) return;
        setSending(true);
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const msgData = {
            busId: trackedBusId,
            message: parentMsg.trim(),
            parentName: userInfo?.name || 'Parent',
            studentName: myStudents[0]?.name || 'Student',
            timestamp: new Date().toISOString(),
            sender: 'parent'
        };
        socket.emit('parentMessage', msgData);
        setChatMessages(prev => [msgData, ...prev].slice(0, 50));
        setParentMsg('');
        setSending(false);
        notify.success('Message sent!');
    };

    const markersData = [
        ...(busLocation ? [busLocation] : []),
        ...(isSelectingPickpoint && tempPickpoint ? [{ ...tempPickpoint, type: 'stop', studentName: 'Your Selection', stopStatus: 'highlight' }] : []),
        ...(!isSelectingPickpoint && trackedStudent?.stop?.lat ? [{ lat: trackedStudent.stop.lat, lng: trackedStudent.stop.lng, type: 'stop', studentName: `Your Pickup`, stopStatus: 'highlight' }] : []),
        // Route stops
        ...(busRoute?.stops?.filter(s => s.location?.lat).map((s, i) => {
            const isMySelection = tempPickpoint && Math.abs(s.location.lat - tempPickpoint.lat) < 0.0001 && Math.abs(s.location.lng - tempPickpoint.lng) < 0.0001;
            return {
                lat: s.location.lat,
                lng: s.location.lng,
                type: 'stop',
                studentName: s.name,
                stopNumber: i + 1,
                stopStatus: isMySelection ? 'highlight' : (stopStatuses[i] || 'pending')
            };
        }) || [])
    ];

    const routeDrawLine = routeRoadGeometry
        || (busRoute?.stops?.length >= 2
            ? busRoute.stops.filter(s => s.location?.lat).map(s => ({ lat: s.location.lat, lng: s.location.lng }))
            : null);

    if (!isTracking && !isSelectingPickpoint) {
        return (
            <div className="min-h-screen-safe flex flex-col bg-surface-50 dark:bg-surface-950 relative overflow-hidden">
                {/* Clean Background Design Elements */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 dark:opacity-10" />
                </div>

                <div className="flex items-center justify-between px-4 py-3 relative z-10">
                    <span />
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button onClick={logout} className="btn-ghost p-2"><LogOut size={20} /></button>
                    </div>
                </div>

                {/* Welcome Message Outside Card */}
                <div className="px-4 pt-6 pb-4 text-center relative z-10 animate-fade-in-up">
                    <div className="inline-flex items-center justify-center bg-white dark:bg-surface-800 p-2 rounded-3xl shadow-lg border border-surface-200/50 dark:border-surface-700/50 mb-5 relative group">
                        <img src="/logo.png" alt="Logo" className="w-16 h-12 object-contain" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white mb-2 tracking-tight truncate max-w-full px-4">
                        Welcome, {user?.name || 'Parent'}
                    </h1>
                    <p className="text-brand-600 dark:text-brand-400 text-xs sm:text-sm font-bold tracking-[0.2em] uppercase">Track Your Child</p>
                </div>

                <div className="flex-1 flex items-start justify-center px-4 pt-4 pb-12 relative z-10">
                    <div className="card border dark:border-surface-700/50 p-6 sm:p-8 w-full max-w-md animate-fade-in shadow-xl shadow-surface-200/50 dark:shadow-none bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl">
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
                        <div className="relative mt-4">
                            <input
                                type="text"
                                className="input text-center text-lg font-mono w-full"
                                placeholder="Search Bus (e.g. 101)..."
                                value={trackedBusId}
                                onChange={e => {
                                    setTrackedBusId(e.target.value);
                                    setShowBusDropdown(true);
                                }}
                                onFocus={() => setShowBusDropdown(true)}
                            />
                            {showBusDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                    {allBuses.filter(b => b.busNumber.toLowerCase().includes(trackedBusId.toLowerCase())).map(b => (
                                        <button
                                            key={b._id}
                                            type="button"
                                            className="w-full text-left px-4 py-3 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-surface-800 dark:text-surface-200 border-b border-surface-100 dark:border-surface-700/50 last:border-0 flex items-center justify-between"
                                            onClick={() => {
                                                setTrackedBusId(b.busNumber);
                                                setShowBusDropdown(false);
                                                const student = myStudents.find(s => s.bus?.busNumber === b.busNumber);
                                                if (student) setTrackedStudent(student);
                                                setIsSelectingPickpoint(true);
                                                setTempPickpoint(student?.stop?.lat ? { lat: student.stop.lat, lng: student.stop.lng } : null);
                                                notify.info('Please select your pickup point on the map');
                                            }}
                                        >
                                            <span className="font-bold flex items-center gap-2"><Bus size={14} /> Bus {b.busNumber}</span>
                                            <span className="text-xs text-surface-400">{b.plateNumber}</span>
                                        </button>
                                    ))}
                                    {allBuses.filter(b => b.busNumber.toLowerCase().includes(trackedBusId.toLowerCase())).length === 0 && (
                                        <div className="px-4 py-3 text-sm text-surface-500 text-center">No buses found</div>
                                    )}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    const bId = trackedBusId.trim();
                                    if (bId) {
                                        const student = myStudents.find(s => s.bus?.busNumber === bId);
                                        if (student) setTrackedStudent(student);
                                        setIsSelectingPickpoint(true);
                                        setTempPickpoint(student?.stop?.lat ? { lat: student.stop.lat, lng: student.stop.lng } : null);
                                        setShowBusDropdown(false);
                                        notify.info('Please select your pickup point on the map');
                                    }
                                }}
                                className="btn-primary w-full mt-3"
                            >
                                Track Manually
                            </button>
                        </div>

                        {/* Temporary Test Notifications Section */}
                        <div className="mt-8 pt-6 border-t border-surface-200 dark:border-surface-700/40">
                            <button
                                onClick={() => setShowAllRoutes(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-brand-600 dark:text-brand-400 font-bold rounded-xl transition-colors border border-surface-200 dark:border-surface-700/50"
                            >
                                <Map size={18} /> Browse All Bus Routes
                            </button>
                        </div>
                    </div>
                </div>

                {/* All Routes Modal */}
                {showAllRoutes && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowAllRoutes(false)}>
                        <div className="bg-white dark:bg-surface-800 w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] md:max-h-[80vh] animate-slide-up" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700/50">
                                <h2 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                    <RouteIcon className="text-brand-500" size={20} /> School Bus Routes
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
                )}
            </div>
        );
    }

    return (
        <div className="h-screen-safe flex flex-col bg-surface-50 dark:bg-surface-950 relative overflow-hidden">
            {/* Clean Background Design Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 dark:opacity-10" />
            </div>
            <div className="bg-glass border-b border-surface-200/50 dark:border-surface-700/40 px-3 sm:px-4 py-2.5 z-10 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-1">
                        <img src="/logo.png" alt="Logo" className="w-8 h-6 object-contain hidden md:block" />
                        <h1 className="text-lg font-bold text-surface-900 dark:text-white hidden md:block">KiddoTrack</h1>
                    </div>
                    <span className="badge badge-info"><Bus size={11} /> Bus {trackedBusId}</span>
                    {isSelectingPickpoint ? (
                        <span className="badge badge-warning text-[10px]"><MapPin size={10} /> Set Pickup</span>
                    ) : status === 'Live Tracking' ? (
                        <span className="badge badge-success"><Radio size={10} className="animate-pulse" /> LIVE</span>
                    ) : (
                        <span className="badge badge-warning text-[10px]">{status}</span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    {isSelectingPickpoint ? (
                        <p className="text-[10px] text-surface-500 font-bold">Tap map to set pickup</p>
                    ) : eta ? (
                        <div className="text-right mr-1 flex flex-col items-end">
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-brand-600 dark:text-brand-400 tabular-nums leading-none">{eta.time}</span>
                                <span className="text-[10px] font-bold text-brand-600/70 dark:text-brand-400/70 uppercase">min</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-60">
                                <span className="text-[9px] font-bold text-surface-500 uppercase tracking-wider">{eta.distance} km</span>
                                <span className="text-[8px] text-surface-400 uppercase font-medium">to Pickup</span>
                            </div>
                        </div>
                    ) : <p className="text-[10px] text-surface-400 animate-pulse">{busLocation ? 'Calculating...' : 'Waiting...'}</p>}
                    {/* Change Bus button — visible on both mobile and desktop */}
                    <button
                        onClick={handleChangeBus}
                        className="flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 px-2 py-1 rounded-lg active:scale-95 transition-all"
                    >
                        <RefreshCw size={10} /> Change
                    </button>
                    <ThemeToggle />
                    <button onClick={logout} className="btn-ghost p-1.5"><LogOut size={18} /></button>
                </div>
            </div>
            <div className="flex-1 relative min-h-0">
                {isSelectingPickpoint && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-sm animate-bounce-in">
                        <div className="bg-white dark:bg-surface-800 p-4 rounded-2xl shadow-xl border-2 border-brand-500/30 flex flex-col items-center text-center gap-3">
                            <div className="bg-brand-100 dark:bg-brand-900/30 p-2 rounded-full text-brand-600 dark:text-brand-400">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-surface-900 dark:text-white">Set Pickup Point</h3>
                                <p className="text-[10px] text-surface-500">Click anywhere on the map to set your manual pickup location</p>
                            </div>
                            <div className="flex gap-2 w-full mt-1">
                                <button onClick={() => setIsSelectingPickpoint(false)} className="btn-ghost flex-1 text-xs py-2">Cancel</button>
                                <button onClick={confirmPickpoint} disabled={!tempPickpoint} className="btn-primary flex-1 text-xs py-2 shadow-lg shadow-brand-500/20">Confirm Pickup</button>
                            </div>
                        </div>
                    </div>
                )}

                <MapComponent
                    markers={markersData}
                    drawLine={routeDrawLine || (routeGeometry ? routeGeometry.map(p => ({ lat: p[1], lng: p[0] })) : (busLocation && trackedStudent?.stop?.lat ? [{ lat: trackedStudent.stop.lat, lng: trackedStudent.stop.lng }, busLocation] : null))}
                    initialViewState={{ latitude: busLocation?.lat || trackedStudent?.stop?.lat || 28.6139, longitude: busLocation?.lng || trackedStudent?.stop?.lng || 77.2090, zoom: 13 }}
                    isSelecting={isSelectingPickpoint}
                    onMapClick={(coords) => setTempPickpoint(coords)}
                />

                {/* Sidebar Panel (Responsive) */}
                <div className={`absolute md:right-3 md:top-3 md:bottom-6 md:w-72 flex-col z-40 transition-all duration-300 ${isMobilePanelOpen ? 'fixed inset-0 md:absolute flex bg-white dark:bg-surface-900 md:bg-transparent' : 'hidden md:flex'}`}>
                    <div className="bg-white/95 dark:bg-surface-800/95 backdrop-blur md:rounded-2xl shadow-2xl border-b md:border border-surface-200 dark:border-surface-700/50 flex-1 flex flex-col pointer-events-auto overflow-hidden">
                        {/* Mobile Header */}
                        <div className="md:hidden flex items-center justify-between p-4 bg-brand-600 text-white">
                            <h2 className="font-bold flex items-center gap-2">
                                {activeTab === 'feed' ? <Radio size={18} /> : <Send size={18} />}
                                {activeTab === 'feed' ? 'Bus Feed' : 'Chat App'}
                            </h2>
                            <button onClick={() => setIsMobilePanelOpen(false)} className="p-1 hover:bg-white/20 rounded-lg"><X size={24} /></button>
                        </div>

                        {/* Tabs Header */}
                        <div className="flex border-b border-surface-200 dark:border-surface-700/50">
                            <button
                                onClick={() => setActiveTab('route')}
                                className={`flex-1 py-3 text-[11px] font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'route' ? 'bg-brand-50/50 dark:bg-brand-900/20 text-brand-600 border-b-2 border-brand-500' : 'text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700/30'}`}
                            >
                                <RouteIcon size={14} /> Full Route
                            </button>
                            <button
                                onClick={() => setActiveTab('feed')}
                                className={`flex-1 py-3 text-[11px] font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'feed' ? 'bg-brand-50/50 dark:bg-brand-900/20 text-brand-600 border-b-2 border-brand-500' : 'text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700/30'}`}
                            >
                                <Radio size={14} /> Feed
                                {unreadCount > 0 && <span className="bg-red-500 text-white text-[8px] px-1 rounded-full">{unreadCount}</span>}
                            </button>
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={`flex-1 py-3 text-[11px] font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'bg-brand-50/50 dark:bg-brand-900/20 text-brand-600 border-b-2 border-brand-500' : 'text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700/30'}`}
                            >
                                <Send size={14} /> Chat
                                {chatMessages.length > 0 && activeTab !== 'chat' && <span className="bg-brand-500 text-white text-[8px] px-1 rounded-full">New</span>}
                            </button>
                        </div>

                        {activeTab === 'route' ? (
                            <div className="flex-1 overflow-y-auto p-0">
                                {/* Route Header */}
                                <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
                                    <h3 className="font-bold text-sm flex items-center gap-2"><Bus size={16} /> Bus {trackedBusId}</h3>
                                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{busRoute?.name || 'Route'}</span>
                                </div>
                                {/* Tabs: Full Route / Bus Info */}
                                <div className="flex border-b border-surface-200 dark:border-surface-700/50">
                                    <div className="flex-1 py-2.5 text-center text-[11px] font-bold text-emerald-600 border-b-2 border-emerald-500">FULL ROUTE</div>
                                    <div className="flex-1 py-2.5 text-center text-[11px] font-bold text-surface-400">BUS INFO</div>
                                </div>

                                {!busRoute || !busRoute.stops?.length ? (
                                    <div className="p-8 text-center text-surface-400">
                                        <RouteIcon size={32} className="mx-auto mb-3 opacity-30" />
                                        <p className="text-xs">No route assigned to this bus</p>
                                    </div>
                                ) : (
                                    <div className="relative px-4 py-3">
                                        {/* Adjusted Vertical Line Alignment: 16px padding + 10px (half of 20px circle) = 26px */}
                                        <div className="absolute left-[26px] top-6 bottom-6 w-1 bg-emerald-500 rounded-full" />

                                        <div className="space-y-0">
                                            {busRoute.stops.map((stop, i) => {
                                                const st = stop.status || 'pending';
                                                const isActive = st === 'reached';
                                                const isDone = st === 'left';

                                                const parseScheduledTime = (t) => {
                                                    if (!t) return null;
                                                    const m = t.match(/^(\d{1,2}):(\d{2})$/);
                                                    if (m) {
                                                        const h = parseInt(m[1]);
                                                        const min = parseInt(m[2]);
                                                        return h * 60 + min;
                                                    }
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
                                                    <div key={i} className="relative flex items-start gap-4 min-h-[64px]">
                                                        {/* Stop Circle */}
                                                        <div className={`z-10 w-5 h-5 rounded-full border-[3px] flex-shrink-0 mt-1 transition-all ${isActive ? 'bg-emerald-500 border-emerald-600 ring-4 ring-emerald-500/20' :
                                                            isDone ? 'bg-emerald-500 border-emerald-600' :
                                                                'bg-white dark:bg-surface-800 border-surface-300 dark:border-surface-600'
                                                            }`} />

                                                        {/* Content */}
                                                        <div className="flex-1 pb-4">
                                                            <p className={`text-sm font-bold ${isDone ? 'text-surface-800 dark:text-surface-200' : isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-surface-800 dark:text-surface-200'
                                                                }`}>{stop.name}</p>
                                                            <div className="flex flex-col gap-0.5 mt-1">
                                                                {stop.arrivalTime && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] text-surface-400">Scheduled: {formattedSchedTime}</span>
                                                                        {isActive ? (
                                                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Actual: {stop.actualTime || realTime}</span>
                                                                        ) : (
                                                                            realTime && realTime !== formattedSchedTime && (
                                                                                <span className={`text-[10px] font-bold ${delay > 0 ? 'text-red-500' : 'text-emerald-500'}`}>Est: {realTime}</span>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {delay > 0 && <span className="text-[9px] font-bold text-red-500">+{delay} min delay</span>}
                                                            </div>
                                                        </div>

                                                        {/* Status */}
                                                        <div className="flex-shrink-0 mt-1">
                                                            {isDone && <span className="text-xs font-bold text-emerald-600">Bus Left</span>}
                                                            {isActive && <span className="text-xs font-bold text-emerald-600 animate-pulse">At Stop</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'feed' ? (
                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                <div className="p-2 border-b border-surface-100 dark:border-surface-700/30 flex justify-between items-center">
                                    <span className="text-[10px] text-surface-400 font-bold uppercase pl-1">Recent Broadcasts</span>
                                    {busAlerts.length > 0 && <button onClick={markAllAsRead} className="text-[10px] text-brand-500 hover:text-brand-600 font-bold px-2 py-1">Mark Read</button>}
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                    {busAlerts.filter(n => !(n.readBy || []).some(id => String(id) === String(user?._id))).length === 0 ? (
                                        <p className="text-[10px] text-surface-400 text-center py-8 italic">No new updates</p>
                                    ) : (
                                        busAlerts.filter(n => !(n.readBy || []).some(id => String(id) === String(user?._id))).map((alert, i) => (
                                            <div key={i} className={`p-2 rounded-xl text-[11px] border ${alert.type === 'emergency' ? 'bg-red-50 border-red-100 text-red-700' : alert.type === 'delay' ? 'bg-yellow-50 border-yellow-100 text-yellow-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <span className="font-bold uppercase text-[9px]">{alert.type}</span>
                                                    <span className="opacity-60 text-[8px]">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                {alert.message}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-surface-50/30 dark:bg-surface-900/20">
                                <div className="flex-1 overflow-y-auto p-3 space-y-3 flex flex-col-reverse custom-scrollbar">
                                    {chatMessages.length === 0 ? (
                                        <div className="h-full flex items-center justify-center opacity-40 flex-col gap-2">
                                            <Send size={24} />
                                            <p className="text-[10px]">No messages yet</p>
                                        </div>
                                    ) : (
                                        chatMessages.map((m, i) => (
                                            <div key={i} className={`p-2.5 rounded-2xl text-[11px] max-w-[85%] shadow-sm ${m.sender === 'parent' ? 'bg-brand-600 text-white self-end rounded-tr-none' : 'bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-100 self-start rounded-tl-none border border-surface-100 dark:border-surface-600'}`}>
                                                <p className="leading-tight">{m.message}</p>
                                                <p className="text-[8px] opacity-70 mt-1 text-right font-mono">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-2 border-t border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800">
                                    <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            className="flex-1 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none dark:text-white"
                                            placeholder="Message driver..."
                                            value={parentMsg}
                                            onChange={e => setParentMsg(e.target.value)}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!parentMsg.trim() || sending}
                                            className="bg-brand-600 hover:bg-brand-700 disabled:bg-surface-300 dark:disabled:bg-surface-700 text-white p-2 rounded-xl transition-all active:scale-95 shadow-md"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Panel Toggle */}
                {!isMobilePanelOpen && (
                    <button
                        onClick={() => setIsMobilePanelOpen(true)}
                        className="md:hidden absolute bottom-6 right-4 z-30 bg-brand-600 text-white p-4 rounded-full shadow-2xl active:scale-95 transition-all flex items-center gap-2"
                    >
                        <MessageSquare size={24} />
                        {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{unreadCount}</span>}
                    </button>
                )}

                {/* Mobile Alerts Overlay (Only unread) */}
                <div className="absolute top-3 left-3 right-3 z-10 space-y-2 pointer-events-none md:hidden">
                    {busAlerts.filter(n => !n.readBy.some(id => String(id) === String(user?._id))).slice(0, 1).map((alert, i) => (
                        <div key={i} className={`px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs font-bold pointer-events-auto border-l-4 ${alert.type === 'emergency' ? 'bg-red-50 border-red-600 text-red-900' :
                            alert.type === 'delay' ? 'bg-yellow-50 border-yellow-500 text-yellow-900' :
                                'bg-blue-50 border-blue-500 text-blue-900'
                            }`}>
                            <div className="flex items-center gap-2 flex-1">
                                {alert.type === 'emergency' ? <Siren size={16} className="text-red-600" /> :
                                    alert.type === 'delay' ? <AlertTriangle size={16} className="text-yellow-600" /> :
                                        <Info size={16} className="text-blue-600" />}
                                <span>{alert.message}</span>
                            </div>
                            <button onClick={markAllAsRead} className="text-[10px] bg-white/50 px-2 py-1 rounded-lg">Clear</button>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default ParentDashboard;

