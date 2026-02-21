import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { socket } from '../socket';
import MapComponent from '../components/MapComponent';
import { User, Bus, MapPin, Send, AlertTriangle, Info, Siren } from 'lucide-react';

const ParentDashboard = () => {
    const [busLocation, setBusLocation] = useState(null);
    const [status, setStatus] = useState('Disconnected');
    const [eta, setEta] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    // Track selected bus
    const [trackedBusId, setTrackedBusId] = useState('');
    const [isTracking, setIsTracking] = useState(false);

    // Students/Children State
    const [myStudents, setMyStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(true);

    // Communication State
    const [busAlerts, setBusAlerts] = useState([]);
    const [parentMsg, setParentMsg] = useState('');
    const [sending, setSending] = useState(false);

    // Fetch My Students on Mount
    useEffect(() => {
        const fetchMyStudents = async () => {
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo'));
                const token = userInfo?.token;
                if (!token) {
                    console.error("No token found in userInfo");
                    return;
                }

                const { data } = await axios.get('http://localhost:5000/api/students/my', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMyStudents(data);

                // Auto-track if only one student with a bus
                if (data.length === 1 && data[0].bus) {
                    setTrackedBusId(data[0].bus.busNumber);
                    setIsTracking(true);
                    toast.success(`Tracking ${data[0].name}'s Bus (${data[0].bus.busNumber})`);
                }
            } catch (error) {
                console.error("Error fetching students:", error);
            } finally {
                setLoadingStudents(false);
            }
        };

        fetchMyStudents();
    }, []);

    useEffect(() => {
        if (!isTracking || !trackedBusId) return;

        socket.connect();
        setStatus('Waiting for updates...');

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
                toast.error(`🚨 Emergency: ${data.message}`, { duration: 10000 });
            } else if (data.type === 'delay') {
                toast(`⚠️ Delay: ${data.message}`, { duration: 8000, icon: '🕐' });
            } else {
                toast(`ℹ️ ${data.message}`, { duration: 5000 });
            }
        });

        // Get Parent's location for ETA & Share with Driver
        let watchId;
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    setUserLocation({ lat, lng });

                    // Emit to driver
                    const payload = {
                        busId: trackedBusId,
                        lat,
                        lng,
                        studentName: myStudents[0]?.name || 'Parent'
                    };

                    if (isTracking && trackedBusId) {
                        socket.emit('parentLocation', payload);
                        // Save last payload to ref or let the re-connect handler use current state if possible
                        // Actually, easier to let the map/watchPosition handle it. 
                        // But for Reconnect:
                    }
                },
                (error) => console.log('Parent location error:', error),
                { enableHighAccuracy: true }
            );

            // Re-broadcast on Reconnection (Server Restart resiliency)
            socket.on('connect', () => {
                if (isTracking && trackedBusId && userLocation) {
                    console.log("Reconnected! Resending location...");
                    socket.emit('parentLocation', {
                        busId: trackedBusId,
                        lat: userLocation.lat,
                        lng: userLocation.lng,
                        studentName: myStudents[0]?.name || 'Parent'
                    });
                }
            });
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

    // Haversine Formula for Distance (km)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    const deg2rad = (deg) => {
        return deg * (Math.PI / 180);
    };

    const [routeGeometry, setRouteGeometry] = useState(null);
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

    // Fetch actual road route from Mapbox
    useEffect(() => {
        const fetchRoute = async () => {
            if (busLocation && userLocation) {
                try {
                    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.lng},${userLocation.lat};${busLocation.lng},${busLocation.lat}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`;
                    const response = await fetch(url);
                    const data = await response.json();

                    if (data.routes && data.routes[0]) {
                        setRouteGeometry(data.routes[0].geometry.coordinates);

                        // Update ETA with real traffic data if available, or just distance
                        const route = data.routes[0];
                        setEta({
                            distance: (route.distance / 1000).toFixed(1), // meters to km
                            time: Math.round(route.duration / 60) // seconds to minutes
                        });
                    } else {
                        // Fallback logic
                        const distance = calculateDistance(busLocation.lat, busLocation.lng, userLocation.lat, userLocation.lng);
                        setEta({ distance: distance.toFixed(1), time: Math.round((distance / 30) * 60) || 1 });
                        setRouteGeometry(null);
                    }
                } catch (error) {
                    console.error("Error fetching route:", error);
                    // Fallback logic
                    const distance = calculateDistance(busLocation.lat, busLocation.lng, userLocation.lat, userLocation.lng);
                    setEta({ distance: distance.toFixed(1), time: Math.round((distance / 30) * 60) || 1 });
                    setRouteGeometry(null);
                }
            }
        };

        fetchRoute();
        // Debounce this slightly in a real app to save API calls
    }, [busLocation, userLocation]);

    // ETA Notification Logic
    useEffect(() => {
        if (!eta || !eta.time) return;

        const time = Number(eta.time);
        if (isNaN(time)) return;

        // Check thresholds
        // We use a simple session storage or local state to ensure we don't alert multiple times for the same minute
        const alertedKey = `alerted_${time}`;
        const hasAlerted = sessionStorage.getItem(alertedKey);

        if (!hasAlerted) {
            const toastOptions = {
                duration: 30000, // 30 seconds
                icon: '🚍',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                },
            };

            if (time === 10) {
                toast('Bus is 10 minutes away!', toastOptions);
                sessionStorage.setItem(alertedKey, 'true');
            } else if (time === 5) {
                toast('Bus is 5 minutes away! Get ready!', toastOptions);
                sessionStorage.setItem(alertedKey, 'true');
            } else if (time === 1) {
                toast('Bus is arriving in 1 minute! Please be at the stop.', { ...toastOptions, icon: '🛑' });
                sessionStorage.setItem(alertedKey, 'true');
            }
        }
    }, [eta]);

    // Cleanup alerts on component unmount or new bus tracking
    useEffect(() => {
        return () => sessionStorage.clear();
    }, [trackedBusId]);

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
            toast.success(`Tracking ${student.name}'s Bus`);
        } else {
            toast.error('No bus assigned to this student');
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
        toast.success('Message sent to driver!');
    };

    if (!isTracking) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                    <h1 className="text-2xl font-bold text-indigo-800 mb-2">Track Your Child</h1>
                    <p className="text-gray-500 mb-6">Select a child or enter bus number</p>

                    {loadingStudents ? (
                        <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-3 mb-8">
                            {myStudents.length > 0 ? (
                                myStudents.map(student => (
                                    <button
                                        key={student._id}
                                        onClick={() => trackStudentBus(student)}
                                        className="w-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 p-4 rounded-xl flex items-center gap-4 transition-all group group-hover:shadow-md text-left"
                                    >
                                        <div className="bg-indigo-200 p-3 rounded-full text-indigo-700">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">{student.name}</h3>
                                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                                <Bus size={14} />
                                                {student.bus ? `Bus ${student.bus.busNumber}` : 'No Bus Assigned'}
                                            </p>
                                        </div>
                                        {student.bus && <div className="ml-auto text-indigo-600 font-semibold text-sm">Track &rarr;</div>}
                                    </button>
                                ))
                            ) : (
                                <p className="text-sm text-gray-400 italic">No students linked to your account.</p>
                            )}
                        </div>
                    )}

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">Or enter manually</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <form onSubmit={handleStartTracking} className="space-y-4 mt-6">
                        <div>
                            <input
                                type="text"
                                className="w-full border rounded-xl px-4 py-3 text-lg font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. 101"
                                value={trackedBusId}
                                onChange={e => setTrackedBusId(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg">
                            Track Manually
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">
            <div className="bg-white p-4 shadow-sm z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-indigo-800 hidden sm:block">KiddoTrack</h1>
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Bus size={12} /> Bus {trackedBusId}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        {eta ? (
                            <div className="flex flex-col items-end">
                                <p className="text-lg font-bold text-indigo-700 tabular-nums leading-none">{eta.time} <span className="text-xs font-normal text-gray-500">min</span></p>
                                <p className="text-xs text-gray-400">{eta.distance} km</p>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 animate-pulse">{busLocation ? 'Calculating...' : 'Waiting for GPS...'}</p>
                        )}
                    </div>
                    <button onClick={() => setIsTracking(false)} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors">Change</button>
                </div>
            </div>

            <div className="flex-1 relative">
                {/* Map Interface */}
                <MapComponent
                    markers={[
                        ...(busLocation ? [busLocation] : []),
                        ...(userLocation ? [{ ...userLocation, type: 'parent' }] : [])
                    ]}
                    drawLine={routeGeometry ? routeGeometry.map(p => ({ lat: p[1], lng: p[0] })) : (busLocation && userLocation ? [userLocation, busLocation] : null)}
                    initialViewState={{
                        latitude: busLocation?.lat || userLocation?.lat || 28.6139,
                        longitude: busLocation?.lng || userLocation?.lng || 77.2090,
                        zoom: 13
                    }}
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

