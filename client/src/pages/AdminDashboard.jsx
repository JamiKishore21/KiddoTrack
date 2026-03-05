import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';
import { Plus, Bus, Map as MapIcon, Users, Route, LogOut, Radio, List, UserPlus, Trash2, ArrowUp, ArrowDown, ArrowLeft, Clock, MapPin, Eye } from 'lucide-react';
import { socket } from '../socket';
import ThemeToggle from '../components/ThemeToggle';
import { API_URL } from '../constants';
import { fetchRoadRoute } from '../utils/fetchRoadRoute';

const navItems = [
    { id: 'list', label: 'Buses', icon: Bus },
    { id: 'routes', label: 'Routes', icon: Route },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'drivers', label: 'Drivers', icon: UserPlus },
    { id: 'map', label: 'Live Map', icon: MapIcon },
    { id: 'monitor', label: 'Monitor', icon: Eye },
    { id: 'feed', label: 'Live Feed', icon: Radio },
];

const Modal = ({ show, onClose, title, children }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-white dark:bg-surface-800 rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md shadow-glass-lg border border-surface-200 dark:border-surface-700/50" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-5">{title}</h2>
                {children}
            </div>
        </div>
    );
};

// --- Stable Form Components ---
const DriverForm = ({ onSubmit, onClose, formData, setFormData, error, isEdit = false }) => (
    <div className="w-full">
        <p className="text-xs text-surface-400 dark:text-surface-500 mb-4">{isEdit ? 'Update driver details.' : 'The driver will use these credentials to log in.'}</p>
        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-xl mb-4 text-sm">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
            <div><label className="label">Full Name</label><input type="text" required className="input" placeholder="e.g. Ravi Kumar" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><label className="label">Email</label><input type="email" required className="input" placeholder="driver@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
            {!isEdit && <div><label className="label">Password</label><input type="password" required minLength={6} className="input" placeholder="Min. 6 characters" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} /></div>}
            <div className="flex gap-3 mt-6"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">{isEdit ? 'Update Driver' : 'Create Driver'}</button></div>
        </form>
    </div>
);

const BusForm = ({ onSubmit, onClose, formData, setFormData, drivers = [], isEdit = false }) => (
    <form onSubmit={onSubmit} className="space-y-4">
        <div><label className="label">Bus Number</label><input type="text" required className="input" placeholder="e.g. 101" value={formData.busNumber} onChange={e => setFormData({ ...formData, busNumber: e.target.value })} /></div>
        <div><label className="label">License Plate</label><input type="text" required className="input" placeholder="e.g. DL-1C-2024" value={formData.plateNumber} onChange={e => setFormData({ ...formData, plateNumber: e.target.value })} /></div>
        <div><label className="label">Capacity</label><input type="number" required className="input" placeholder="e.g. 40" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} /></div>
        <div>
            <label className="label">Assign Driver</label>
            <select className="input" value={formData.driverId || ''} onChange={e => setFormData({ ...formData, driverId: e.target.value })}>
                <option value="">-- No Driver --</option>
                {drivers.map(d => <option key={d._id} value={d._id}>{d.name} ({d.email})</option>)}
            </select>
        </div>
        <div className="flex gap-3 mt-6"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">{isEdit ? 'Update Bus' : 'Save Bus'}</button></div>
    </form>
);

const RouteForm = ({ onSubmit, onClose, formData, setFormData, buses, isEdit = false }) => (
    <form onSubmit={onSubmit} className="space-y-4">
        <div><label className="label">Route Name</label><input type="text" required className="input" placeholder="School to Downtown" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
        <div><label className="label">Stops (comma separated)</label><textarea className="input" placeholder="Stop A, Stop B, Stop C" rows="3" value={formData.stops} onChange={e => setFormData({ ...formData, stops: e.target.value })} /></div>
        <div><label className="label">Assign Bus</label><select className="input" value={formData.assignedBus} onChange={e => setFormData({ ...formData, assignedBus: e.target.value })}><option value="">-- No Bus --</option>{buses.map(b => <option key={b._id} value={b._id}>Bus {b.busNumber} ({b.plateNumber})</option>)}</select></div>
        <div className="flex gap-3 mt-6"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">{isEdit ? 'Update Route' : 'Create Route'}</button></div>
    </form>
);

const StudentForm = ({ onSubmit, onClose, formData, setFormData, users, buses, isEdit = false }) => (
    <form onSubmit={onSubmit} className="space-y-4">
        <div><label className="label">Student Name</label><input type="text" required className="input" placeholder="John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
        <div><label className="label">Parent</label><select required className="input" value={formData.parentId} onChange={e => setFormData({ ...formData, parentId: e.target.value })}><option value="">Select Parent</option>{users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}</select></div>
        <div><label className="label">Assign Bus</label><select required className="input" value={formData.busId} onChange={e => setFormData({ ...formData, busId: e.target.value })}><option value="">Select Bus</option>{buses.map(b => <option key={b._id} value={b._id}>Bus {b.busNumber} ({b.plateNumber})</option>)}</select></div>
        <div className="flex gap-3 mt-6"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">{isEdit ? 'Update Student' : 'Add Student'}</button></div>
    </form>
);

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [view, setView] = useState(localStorage.getItem('admin_dashboard_view') || 'list');
    const [buses, setBuses] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [students, setStudents] = useState([]);
    const [users, setUsers] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showDriverModal, setShowDriverModal] = useState(false);
    const [driverFormData, setDriverFormData] = useState({ name: '', email: '', password: '' });
    const [driverError, setDriverError] = useState('');
    const [studentFormData, setStudentFormData] = useState({ name: '', parentId: '', busId: '' });
    const [formData, setFormData] = useState({ busNumber: '', plateNumber: '', capacity: '', driverId: '' });
    const [allBusLocations, setAllBusLocations] = useState([]);
    const [busAlerts, setBusAlerts] = useState([]);
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [routeFormData, setRouteFormData] = useState({ name: '', stops: '', assignedBus: '' });

    // Route Editor State
    const [routeEditorData, setRouteEditorData] = useState({ name: '', assignedBus: '', stops: [] });
    const [editingRouteId, setEditingRouteId] = useState(null);
    const [roadGeometry, setRoadGeometry] = useState(null);
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

    const [editId, setEditId] = useState(null);
    const [unreadFeedCount, setUnreadFeedCount] = useState(0);

    // Monitor Bus State
    const [monitorBusId, setMonitorBusId] = useState('');
    const [monitorRoute, setMonitorRoute] = useState(null);
    const [monitorStopStatuses, setMonitorStopStatuses] = useState({});
    const [monitorRoadGeo, setMonitorRoadGeo] = useState(null);

    useEffect(() => {
        localStorage.setItem('admin_dashboard_view', view);
        if (view === 'feed') setUnreadFeedCount(0);
    }, [view]);


    const fetchStudents = async () => { try { const t = JSON.parse(localStorage.getItem('userInfo'))?.token; const { data } = await axios.get(`${API_URL}/students`, { headers: { Authorization: `Bearer ${t}` } }); setStudents(data); } catch (e) { console.error(e); } };
    const fetchUsers = async () => { try { const t = JSON.parse(localStorage.getItem('userInfo'))?.token; const { data } = await axios.get(`${API_URL}/auth/parents`, { headers: { Authorization: `Bearer ${t}` } }); setUsers(data); } catch (e) { console.error(e); } };
    const fetchDrivers = async () => { try { const t = JSON.parse(localStorage.getItem('userInfo'))?.token; const { data } = await axios.get(`${API_URL}/auth/drivers`, { headers: { Authorization: `Bearer ${t}` } }); setDrivers(data); } catch (e) { console.error(e); } };

    const handleAddDriver = async (e) => {
        e.preventDefault();
        setDriverError('');
        try {
            const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
            await axios.post(`${API_URL}/auth/create-driver`, driverFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowDriverModal(false);
            setDriverFormData({ name: '', email: '', password: '' });
            fetchDrivers();
        } catch (error) {
            setDriverError(error.response?.data?.message || 'Error creating driver');
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        try {
            const t = JSON.parse(localStorage.getItem('userInfo'))?.token;
            if (editId) {
                await axios.put(`${API_URL}/students/${editId}`, studentFormData, { headers: { Authorization: `Bearer ${t}` } });
            } else {
                await axios.post(`${API_URL}/students`, studentFormData, { headers: { Authorization: `Bearer ${t}` } });
            }
            setShowStudentModal(false); setEditId(null); setStudentFormData({ name: '', parentId: '', busId: '' }); fetchStudents();
        } catch (e) { alert(e.response?.data?.message || 'Error'); }
    };

    const fetchAllNotifications = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
            const lastCleared = localStorage.getItem('admin_feed_last_cleared') || 0;
            const { data } = await axios.get(`${API_URL}/notifications/bus/ALL`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Show only notifications after the last clear
            setBusAlerts(data.filter(n => new Date(n.timestamp).getTime() > Number(lastCleared)));
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        fetchBuses(); fetchRoutes(); fetchStudents(); fetchUsers(); fetchDrivers();
        if (view === 'feed') fetchAllNotifications();

        const onBusUpdate = (d) => { setAllBusLocations(prev => { const i = prev.findIndex(b => String(b.busId) === String(d.busId)); if (i > -1) { const n = [...prev]; n[i] = { ...n[i], ...d }; return n; } return [...prev, d]; }); };
        const onActiveList = (l) => { setAllBusLocations(prev => { const m = {}; prev.forEach(p => m[p.busId] = p); l.forEach(p => m[p.busId] = p); return Object.values(m); }); };
        const onSessionEnd = (d) => { setAllBusLocations(prev => prev.filter(b => b.busId !== d.busId)); };
        const onStatusUpdate = (d) => {
            setBusAlerts(prev => [d, ...prev].slice(0, 10));
            if (view !== 'feed') setUnreadFeedCount(prev => prev + 1);
        };

        socket.on('busLocationUpdate', onBusUpdate);
        socket.on('activeBusList', onActiveList);
        socket.on('busSessionEnded', onSessionEnd);
        socket.on('busStatusUpdate', onStatusUpdate);

        // Listen for stop status updates (for Monitor view)
        const onStopStatus = (data) => {
            setMonitorStopStatuses(prev => ({ ...prev, [`${data.busId}_${data.stopIndex}`]: data.status }));
            if (data.updatedStops) {
                setRoutes(prev => prev.map(r => {
                    if (r.assignedBus?.busNumber === data.busId || r.assignedBus?._id === data.busId) {
                        return { ...r, stops: data.updatedStops };
                    }
                    return r;
                }));
            }
        };
        socket.on('stopStatusUpdate', onStopStatus);

        const onTripReset = (data) => {
            setMonitorStopStatuses(prev => {
                const n = { ...prev };
                Object.keys(n).forEach(k => { if (k.startsWith(`${data.busId}_`)) delete n[k]; });
                return n;
            });
        };
        socket.on('tripReset', onTripReset);

        const join = () => socket.emit('joinRoom', 'admin_room');
        socket.on('connect', join);
        if (!socket.connected) socket.connect(); else join();

        return () => {
            socket.off('connect', join);
            socket.off('busLocationUpdate', onBusUpdate);
            socket.off('activeBusList', onActiveList);
            socket.off('busSessionEnded', onSessionEnd);
            socket.off('busStatusUpdate', onStatusUpdate);
            socket.off('stopStatusUpdate', onStopStatus);
            socket.off('tripReset', onTripReset);
            socket.disconnect();
        };
    }, [view]);

    // Road route geometry for route editor
    useEffect(() => {
        if (routeEditorData.stops.length >= 2) {
            fetchRoadRoute(routeEditorData.stops, MAPBOX_TOKEN).then(geo => setRoadGeometry(geo));
        } else {
            setRoadGeometry(null);
        }
    }, [routeEditorData.stops]);

    const fetchBuses = async () => { try { const { data } = await axios.get(`${API_URL}/buses`); setBuses(data); } catch (e) { console.error(e); } };
    const fetchRoutes = async () => { try { const { data } = await axios.get(`${API_URL}/routes`); setRoutes(data); } catch (e) { console.error(e); } };
    const handleAddBus = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await axios.put(`${API_URL}/buses/${editId}`, formData);
            } else {
                await axios.post(`${API_URL}/buses`, formData);
            }
            setShowAddModal(false); setEditId(null); setFormData({ busNumber: '', plateNumber: '', capacity: '', driverId: '' }); fetchBuses();
        } catch (e) { alert(e.response?.data?.message || 'Error'); }
    };
    const handleAddRoute = async (e) => {
        e.preventDefault();
        try {
            const payload = { name: routeFormData.name, stops: routeFormData.stops.split(',').map(s => ({ name: s.trim() })), assignedBus: routeFormData.assignedBus || null };
            if (editId) {
                await axios.put(`${API_URL}/routes/${editId}`, payload);
            } else {
                await axios.post(`${API_URL}/routes`, payload);
            }
            setShowRouteModal(false); setEditId(null); setRouteFormData({ name: '', stops: '', assignedBus: '' }); fetchRoutes();
        } catch (e) { alert(e.response?.data?.message || 'Error'); }
    };

    const handleDeleteBus = async (id) => { if (window.confirm('Delete this bus?')) { try { await axios.delete(`${API_URL}/buses/${id}`); fetchBuses(); } catch (e) { console.error(e); } } };
    const handleDeleteRoute = async (id) => { if (window.confirm('Delete this route?')) { try { await axios.delete(`${API_URL}/routes/${id}`); fetchRoutes(); } catch (e) { console.error(e); } } };
    const handleDeleteStudent = async (id) => { if (window.confirm('Delete this student?')) { try { const t = JSON.parse(localStorage.getItem('userInfo'))?.token; await axios.delete(`${API_URL}/students/${id}`, { headers: { Authorization: `Bearer ${t}` } }); fetchStudents(); } catch (e) { console.error(e); } } };

    const startEditBus = (bus) => { setEditId(bus._id); setFormData({ busNumber: bus.busNumber, plateNumber: bus.plateNumber, capacity: bus.capacity, driverId: bus.driver?._id || '' }); setShowAddModal(true); };
    const startEditRoute = (r) => {
        setEditingRouteId(r._id);
        setRouteEditorData({
            name: r.name,
            assignedBus: r.assignedBus?._id || '',
            stops: r.stops?.map((s, i) => ({
                name: s.name || '',
                lat: s.location?.lat || null,
                lng: s.location?.lng || null,
                arrivalTime: s.arrivalTime || '',
                departureTime: s.departureTime || '',
                order: s.order || i
            })) || []
        });
        setView('routeEditor');
    };
    const openNewRouteEditor = () => {
        setEditingRouteId(null);
        setRouteEditorData({ name: '', assignedBus: '', stops: [] });
        setView('routeEditor');
    };
    const handleRouteEditorMapClick = (coords) => {
        setRouteEditorData(prev => ({
            ...prev,
            stops: [...prev.stops, { name: `Stop ${prev.stops.length + 1}`, lat: coords.lat, lng: coords.lng, arrivalTime: '', departureTime: '', order: prev.stops.length }]
        }));
    };
    const updateStop = (index, field, value) => {
        setRouteEditorData(prev => {
            const stops = [...prev.stops];
            stops[index] = { ...stops[index], [field]: value };
            return { ...prev, stops };
        });
    };
    const removeStop = (index) => {
        setRouteEditorData(prev => ({ ...prev, stops: prev.stops.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })) }));
    };
    const moveStop = (index, direction) => {
        setRouteEditorData(prev => {
            const stops = [...prev.stops];
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= stops.length) return prev;
            [stops[index], stops[newIndex]] = [stops[newIndex], stops[index]];
            return { ...prev, stops: stops.map((s, i) => ({ ...s, order: i })) };
        });
    };
    const saveRouteEditor = async () => {
        if (!routeEditorData.name.trim()) { alert('Route name is required'); return; }
        if (routeEditorData.stops.length < 2) { alert('At least 2 stops required'); return; }
        const payload = {
            name: routeEditorData.name,
            assignedBus: routeEditorData.assignedBus || null,
            stops: routeEditorData.stops.map((s, i) => ({
                name: s.name,
                location: { lat: s.lat, lng: s.lng },
                order: i,
                arrivalTime: s.arrivalTime,
                departureTime: s.departureTime
            }))
        };
        try {
            if (editingRouteId) {
                await axios.put(`${API_URL}/routes/${editingRouteId}`, payload);
            } else {
                await axios.post(`${API_URL}/routes`, payload);
            }
            fetchRoutes();
            setView('routes');
        } catch (e) { alert(e.response?.data?.message || 'Error saving route'); }
    };
    const startEditStudent = (s) => { setEditId(s._id); setStudentFormData({ name: s.name, parentId: s.parent?._id || '', busId: s.bus?._id || '' }); setShowStudentModal(true); };


    return (
        <div className="h-screen-safe flex flex-col bg-surface-50 dark:bg-surface-950 relative overflow-hidden">
            {/* Clean Background Design Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 dark:opacity-10" />
            </div>
            <header className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700/50 px-4 sm:px-6 py-3 flex justify-between items-center z-20 flex-shrink-0">
                <div className="flex items-center gap-2 sm:gap-4">
                    <img src="/logo.png" alt="Logo" className="w-12 h-9 object-contain hidden sm:block" />
                    <div className="flex flex-col">
                        <h1 className="text-lg sm:text-xl font-bold text-surface-900 dark:text-white">Welcome, {user?.name || 'Admin'}</h1>
                        <p className="text-xs font-bold uppercase tracking-wider text-gradient">Admin Dashboard</p>
                    </div>
                    <span className="badge badge-success"><Radio size={10} className={allBusLocations.length > 0 ? 'animate-pulse' : ''} /> {allBusLocations.length} Live</span>
                </div>
                <div className="hidden lg:flex gap-1.5 items-center">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => setView(item.id)}
                            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${view === item.id ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400' : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'}`}>
                            <item.icon size={16} /> {item.label}
                            {item.id === 'feed' && unreadFeedCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce">{unreadFeedCount}</span>
                            )}
                        </button>
                    ))}
                    <button onClick={() => { setEditId(null); setFormData({ busNumber: '', plateNumber: '', capacity: '', driverId: '' }); setShowAddModal(true); }} className="btn-primary py-2 px-3 text-sm ml-1 flex items-center gap-1"><Plus size={16} /> Add Bus</button>
                    <ThemeToggle className="ml-1" />
                    <button onClick={logout} className="btn-ghost p-2 ml-0.5"><LogOut size={18} /></button>
                </div>
                <div className="flex items-center gap-1.5 lg:hidden">
                    <button onClick={() => { setEditId(null); setFormData({ busNumber: '', plateNumber: '', capacity: '', driverId: '' }); setShowAddModal(true); }} className="btn-primary p-2"><Plus size={18} /></button>
                    <ThemeToggle />
                    <button onClick={logout} className="btn-ghost p-2"><LogOut size={18} /></button>
                </div>
            </header>

            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700/50 z-30 flex">
                {navItems.map(item => (
                    <button key={item.id} onClick={() => setView(item.id)}
                        className={`relative flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${view === item.id ? 'text-brand-500 dark:text-brand-400' : 'text-surface-400 dark:text-surface-500'}`}>
                        <item.icon size={20} /><span className="text-[10px] font-medium">{item.label}</span>
                        {item.id === 'feed' && unreadFeedCount > 0 && (
                            <span className="absolute top-1 right-4 bg-red-500 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center">{unreadFeedCount}</span>
                        )}
                    </button>
                ))}
            </nav>

            <main className={`flex-1 overflow-auto p-3 sm:p-6 pb-20 lg:pb-6 ${['map', 'monitor', 'routeEditor'].includes(view) ? 'flex flex-col' : ''}`}>
                {view === 'feed' && (
                    <div className="max-w-3xl mx-auto space-y-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Radio size={20} className="text-brand-500" /> Live Broadcast Feed</h2>
                            <button onClick={() => {
                                localStorage.setItem('admin_feed_last_cleared', Date.now());
                                setBusAlerts([]);
                            }} className="text-xs text-surface-400 hover:text-red-500 font-bold uppercase tracking-wider">Clear Feed</button>
                        </div>
                        {busAlerts.length === 0 ? (
                            <div className="card p-12 text-center">
                                <Radio size={48} className="mx-auto mb-4 text-surface-200" />
                                <p className="text-surface-400">No broadcasts recorded yet.</p>
                            </div>
                        ) : (
                            busAlerts.map((alert, i) => (
                                <div key={i} className={`card p-4 border-l-4 animate-slide-up ${alert.type === 'emergency' ? 'border-red-500 bg-red-50/30' : alert.type === 'delay' ? 'border-yellow-500 bg-yellow-50/30' : 'border-blue-500 bg-blue-50/30'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`badge ${alert.type === 'emergency' ? 'badge-error' : alert.type === 'delay' ? 'badge-warning' : 'badge-info'} text-[10px] uppercase`}>{alert.type}</span>
                                            <span className="font-bold text-sm">Bus {alert.busId}</span>
                                        </div>
                                        <span className="text-[10px] text-surface-400 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-sm text-surface-700 dark:text-surface-200">{alert.message}</p>
                                    <div className="mt-2 text-[10px] text-surface-400">Broadcast by: {alert.driverName}</div>
                                </div>
                            ))
                        )}
                    </div>
                )}
                {view === 'list' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {buses.map(bus => {
                            const liveData = allBusLocations.find(l => String(l.busId) === String(bus.busNumber));
                            const isLive = !!liveData;
                            return (
                                <div key={bus._id} className={`card p-4 sm:p-5 border-2 transition-all ${isLive ? 'border-green-500' : 'border-transparent'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base sm:text-lg font-bold text-surface-900 dark:text-white">Bus {bus.busNumber}</h3>
                                                {isLive && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                                            </div>
                                            <p className="text-xs text-surface-400 font-mono">{bus.plateNumber}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {isLive ? (
                                                <span className="badge badge-success text-[10px] py-0 px-1.5 animate-pulse">LIVE</span>
                                            ) : (
                                                <span className="badge badge-neutral text-[10px] py-0 px-1.5 opacity-60">OFFLINE</span>
                                            )}
                                            <span className="text-[9px] font-bold text-surface-400 uppercase tracking-tighter">System: {bus.status}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between text-surface-500 dark:text-surface-400"><span>Capacity</span><span className="font-semibold text-surface-800 dark:text-surface-200">{bus.capacity}</span></div>
                                        <div className="flex justify-between text-surface-500 dark:text-surface-400">
                                            <span>Driver</span>
                                            <span className={`font-semibold truncate ml-2 text-right ${isLive ? 'text-brand-600 dark:text-brand-400' : 'text-surface-800 dark:text-surface-200'}`}>
                                                {liveData?.driverName || (bus.driver ? bus.driver.name : 'Unassigned')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4 pt-4 border-t border-surface-100 dark:border-surface-700/30">
                                        <button onClick={() => startEditBus(bus)} className="flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-brand-500 hover:text-white transition-colors">Edit</button>
                                        <button onClick={() => handleDeleteBus(bus._id)} className="px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Plus size={14} className="rotate-45" /></button>
                                    </div>
                                </div>
                            );
                        })}
                        {buses.length === 0 && <div className="col-span-full py-16 text-center"><Bus size={48} className="mx-auto mb-4 text-surface-300 dark:text-surface-600" /><p className="text-surface-400">No buses. Add one to start.</p></div>}
                    </div>
                )}

                {view === 'routes' && (
                    <div className="card p-4 sm:p-6">
                        <div className="flex justify-between items-center mb-5"><h3 className="section-title">Routes</h3><button onClick={openNewRouteEditor} className="btn-secondary py-2 text-sm">+ Create Route</button></div>
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead><tr className="border-b border-surface-200 dark:border-surface-700/40"><th className="px-4 py-3 text-xs font-bold text-surface-400 uppercase">Route</th><th className="px-4 py-3 text-xs font-bold text-surface-400 uppercase">Stops</th><th className="px-4 py-3 text-xs font-bold text-surface-400 uppercase">Bus</th><th className="px-4 py-3 text-xs font-bold text-surface-400 uppercase text-right">Actions</th></tr></thead>
                                <tbody>
                                    {routes.length === 0 ? <tr><td colSpan="4" className="px-4 py-8 text-center text-surface-400">No routes yet.</td></tr>
                                        : routes.map(r => (
                                            <tr key={r._id} className="border-b border-surface-100 dark:border-surface-700/30 hover:bg-surface-50 dark:hover:bg-surface-700/20 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-surface-900 dark:text-surface-100">{r.name}</td>
                                                <td className="px-4 py-3 text-surface-500 dark:text-surface-400">
                                                    <div className="flex flex-wrap gap-1">
                                                        {r.stops?.slice(0, 4).map((s, idx) => (
                                                            <span key={idx} className="bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 px-2 py-0.5 rounded text-[10px] font-medium">{s.name}</span>
                                                        ))}
                                                        {r.stops?.length > 4 && <span className="text-[10px] font-bold text-brand-500">+{r.stops.length - 4} more</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">{r.assignedBus ? <span className="badge badge-info">BUS-{r.assignedBus.busNumber}</span> : <span className="text-surface-400 text-xs">—</span>}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        <button onClick={() => startEditRoute(r)} className="text-brand-500 dark:text-brand-400 hover:underline text-xs font-medium">Edit on Map</button>
                                                        <button onClick={() => handleDeleteRoute(r._id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden space-y-2">{routes.length === 0 ? <p className="text-center text-surface-400 py-8 text-sm">No routes.</p> : routes.map(r => (
                            <div key={r._id} className="bg-surface-50 dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-700/40">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-surface-800 dark:text-surface-200 text-base mb-1 truncate">{r.name}</h4>
                                        <p className="text-xs text-surface-400">{r.stops?.length || 0} Stops</p>
                                    </div>
                                    {r.assignedBus ? <span className="badge badge-info text-[10px]">BUS-{r.assignedBus.busNumber}</span> : <span className="text-surface-400 text-xs">—</span>}
                                </div>
                                <div className="flex gap-2 mt-4 pt-4 border-t border-surface-100 dark:border-surface-700/30">
                                    <button onClick={() => startEditRoute(r)} className="flex-1 text-[10px] font-bold uppercase tracking-wider py-2 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 border border-brand-100 dark:border-brand-800">Edit on Map</button>
                                    <button onClick={() => handleDeleteRoute(r._id)} className="px-3 py-2 rounded-lg text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}</div>
                    </div>
                )}

                {view === 'students' && (
                    <div className="card p-4 sm:p-6">
                        <div className="flex justify-between items-center mb-5"><h3 className="section-title">Students</h3><button onClick={() => setShowStudentModal(true)} className="btn-secondary py-2 text-sm">+ Add Student</button></div>
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead><tr className="border-b border-surface-200 dark:border-surface-700/40"><th className="px-4 py-3 text-xs font-bold text-surface-400 uppercase">Student</th><th className="px-4 py-3 text-xs font-bold text-surface-400 uppercase">Parent</th><th className="px-4 py-3 text-xs font-bold text-surface-400 uppercase">Bus</th><th className="px-4 py-3 text-xs font-bold text-surface-400 uppercase text-right">Actions</th></tr></thead>
                                <tbody>{students.length === 0 ? <tr><td colSpan="4" className="px-4 py-8 text-center text-surface-400">No students.</td></tr> : students.map(s => (
                                    <tr key={s._id} className="border-b border-surface-100 dark:border-surface-700/30 hover:bg-surface-50 dark:hover:bg-surface-700/20 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-surface-900 dark:text-surface-100">{s.name}</td><td className="px-4 py-3 text-surface-500 dark:text-surface-400">{s.parent?.name || 'N/A'}</td>
                                        <td className="px-4 py-3">{s.bus ? <span className="badge badge-info">Bus {s.bus.busNumber}</span> : <span className="text-surface-400 text-xs">None</span>}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-3">
                                                <button onClick={() => startEditStudent(s)} className="text-brand-500 dark:text-brand-400 hover:underline text-xs font-medium">Edit</button>
                                                <button onClick={() => handleDeleteStudent(s._id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                        <div className="sm:hidden space-y-3">{students.length === 0 ? <p className="text-center text-surface-400 py-8 text-sm">No students.</p> : students.map(s => (
                            <div key={s._id} className="bg-surface-50 dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-700/40">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-brand-100 dark:bg-brand-900/30 p-2.5 rounded-xl"><Users size={18} className="text-brand-600 dark:text-brand-400" /></div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-surface-900 dark:text-surface-100 text-base truncate">{s.name}</h4>
                                        <p className="text-xs text-surface-400 truncate">Parent: {s.parent?.name || 'N/A'}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${s.bus ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 border border-brand-100' : 'bg-surface-100 dark:bg-surface-800 text-surface-500'}`}>{s.bus ? `Bus ${s.bus.busNumber}` : 'None'}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => startEditStudent(s)} className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300">Edit</button>
                                    <button onClick={() => handleDeleteStudent(s._id)} className="px-3 py-2 rounded-lg text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}</div>
                    </div>
                )}

                {view === 'drivers' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Driver Accounts</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Only admins can create driver accounts</p>
                                </div>
                                <button
                                    onClick={() => { setShowDriverModal(true); setDriverError(''); }}
                                    className="text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded font-semibold transition-colors flex items-center gap-1"
                                >
                                    <UserPlus size={15} /> Add Driver
                                </button>
                            </div>
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Assigned Bus</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drivers.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-8 text-center text-gray-400">No drivers yet. Add one to get started.</td>
                                        </tr>
                                    ) : (
                                        drivers.map(driver => (
                                            <tr key={driver._id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{driver.name}</td>
                                                <td className="px-4 py-3">{driver.email}</td>
                                                <td className="px-4 py-3">
                                                    {driver.assignedBus
                                                        ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">Bus {driver.assignedBus.busNumber}</span>
                                                        : <span className="text-gray-400 italic">Unassigned</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">Active</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {view === 'routeEditor' && (
                    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0 flex-1">
                        {/* Map Panel */}
                        <div className="flex-[2] rounded-3xl overflow-hidden border border-surface-200 dark:border-surface-700/40 shadow-glass relative min-h-[350px] lg:min-h-0">
                            <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-surface-800/90 backdrop-blur px-4 py-2 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700/50">
                                <p className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1"><MapPin size={14} /> Click on map to add stops</p>
                            </div>
                            <MapComponent
                                markers={routeEditorData.stops.map((s, i) => ({ lat: s.lat, lng: s.lng, type: 'stop', stopNumber: i + 1, studentName: s.name }))}
                                drawLine={roadGeometry || (routeEditorData.stops.length >= 2 ? routeEditorData.stops.map(s => ({ lat: s.lat, lng: s.lng })) : null)}
                                initialViewState={{ latitude: routeEditorData.stops[0]?.lat || 17.3850, longitude: routeEditorData.stops[0]?.lng || 78.4867, zoom: 13 }}
                                isSelecting={true}
                                onMapClick={handleRouteEditorMapClick}
                            />
                        </div>

                        {/* Stop List Panel */}
                        <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-surface-800 rounded-3xl border border-surface-200 dark:border-surface-700/40 shadow-glass overflow-hidden">
                            {/* Header */}
                            <div className="p-4 border-b border-surface-200 dark:border-surface-700/50">
                                <button onClick={() => setView('routes')} className="btn-ghost text-xs mb-3 flex items-center gap-1"><ArrowLeft size={14} /> Back to Routes</button>
                                <input type="text" className="input text-lg font-bold mb-2" placeholder="Route Name" value={routeEditorData.name} onChange={e => setRouteEditorData(prev => ({ ...prev, name: e.target.value }))} />
                                <select className="input text-sm" value={routeEditorData.assignedBus} onChange={e => setRouteEditorData(prev => ({ ...prev, assignedBus: e.target.value }))}>
                                    <option value="">-- Assign Bus --</option>
                                    {buses.map(b => <option key={b._id} value={b._id}>Bus {b.busNumber} ({b.plateNumber})</option>)}
                                </select>
                            </div>

                            {/* Stop List */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {routeEditorData.stops.length === 0 ? (
                                    <div className="text-center py-12 text-surface-400">
                                        <MapPin size={32} className="mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">Click on the map to add stops</p>
                                    </div>
                                ) : (
                                    routeEditorData.stops.map((stop, i) => (
                                        <div key={i} className="bg-surface-50 dark:bg-surface-900 rounded-2xl p-3 border border-surface-200 dark:border-surface-700/40 relative">
                                            <div className="flex items-start gap-2">
                                                {/* Stop Number */}
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold">{i + 1}</div>
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <input type="text" className="input py-1 text-sm font-semibold" placeholder="Stop Name" value={stop.name} onChange={e => updateStop(i, 'name', e.target.value)} />
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold text-surface-400 uppercase flex items-center gap-1"><Clock size={10} /> Arrival</label>
                                                            <input type="time" className="input py-1 text-xs" value={stop.arrivalTime} onChange={e => updateStop(i, 'arrivalTime', e.target.value)} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold text-surface-400 uppercase flex items-center gap-1"><Clock size={10} /> Departure</label>
                                                            <input type="time" className="input py-1 text-xs" value={stop.departureTime} onChange={e => updateStop(i, 'departureTime', e.target.value)} />
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-surface-400 font-mono">{stop.lat?.toFixed(5)}, {stop.lng?.toFixed(5)}</p>
                                                </div>
                                                {/* Actions */}
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => moveStop(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-20"><ArrowUp size={14} /></button>
                                                    <button onClick={() => moveStop(i, 1)} disabled={i === routeEditorData.stops.length - 1} className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-20"><ArrowDown size={14} /></button>
                                                    <button onClick={() => removeStop(i)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-surface-200 dark:border-surface-700/50">
                                <p className="text-xs text-surface-400 mb-3 text-center">{routeEditorData.stops.length} stops added</p>
                                <button onClick={saveRouteEditor} disabled={routeEditorData.stops.length < 2 || !routeEditorData.name.trim()} className="btn-primary w-full py-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                                    {editingRouteId ? 'Update Route' : 'Save Route'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'map' && (
                    <div className="rounded-3xl overflow-hidden border border-surface-200 dark:border-surface-700/40 shadow-glass flex-1 h-full min-h-0">
                        <MapComponent markers={allBusLocations} initialViewState={{ latitude: 28.6139, longitude: 77.2090, zoom: 11 }} />
                    </div>
                )}

                {view === 'monitor' && (
                    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0 flex-1">
                        {/* Map */}
                        <div className="flex-[2] rounded-3xl overflow-hidden border border-surface-200 dark:border-surface-700/40 shadow-glass relative min-h-[350px] lg:min-h-0">
                            {/* Bus Selector Overlay */}
                            <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-surface-800/90 backdrop-blur px-4 py-2 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700/50">
                                <select className="bg-transparent text-sm font-bold text-surface-900 dark:text-white focus:outline-none cursor-pointer" value={monitorBusId} onChange={e => {
                                    setMonitorBusId(e.target.value);
                                    setMonitorStopStatuses({});
                                    setMonitorRoute(null);
                                    setMonitorRoadGeo(null);
                                    // Fetch route for selected bus
                                    if (e.target.value) {
                                        const busNum = buses.find(b => b._id === e.target.value)?.busNumber;
                                        const route = routes.find(r => r.assignedBus?._id === e.target.value || String(r.assignedBus?.busNumber) === String(busNum));
                                        setMonitorRoute(route || null);
                                        if (route && route.stops) {
                                            const dbStatuses = {};
                                            route.stops.forEach((s, idx) => { if (s.status && s.status !== 'pending') dbStatuses[`${busNum}_${idx}`] = s.status; });
                                            setMonitorStopStatuses(dbStatuses);
                                        }
                                        if (route?.stops?.length >= 2) {
                                            const waypoints = route.stops.filter(s => s.location?.lat).map(s => ({ lat: s.location.lat, lng: s.location.lng }));
                                            fetchRoadRoute(waypoints, MAPBOX_TOKEN).then(geo => setMonitorRoadGeo(geo));
                                        }
                                    }
                                }}>
                                    <option value="">Select a Bus to Monitor</option>
                                    {buses.map(b => <option key={b._id} value={b._id}>Bus {b.busNumber} ({b.plateNumber})</option>)}
                                </select>
                            </div>
                            <MapComponent
                                markers={[
                                    ...(monitorBusId ? allBusLocations.filter(l => String(l.busId) === String(buses.find(b => b._id === monitorBusId)?.busNumber)) : []),
                                    ...(monitorRoute?.stops?.filter(s => s.location?.lat).map((s, i) => ({
                                        lat: s.location.lat, lng: s.location.lng, type: 'stop',
                                        studentName: s.name, stopNumber: i + 1,
                                        stopStatus: monitorStopStatuses[i] || 'pending'
                                    })) || [])
                                ]}
                                drawLine={monitorRoadGeo || (monitorRoute?.stops?.length >= 2 ? monitorRoute.stops.filter(s => s.location?.lat).map(s => ({ lat: s.location.lat, lng: s.location.lng })) : null)}
                                initialViewState={{ latitude: 17.3850, longitude: 78.4867, zoom: 12 }}
                            />
                        </div>

                        {/* Stop Timeline Panel */}
                        <div className="w-full lg:w-80 flex flex-col bg-white dark:bg-surface-800 rounded-3xl border border-surface-200 dark:border-surface-700/40 shadow-glass overflow-hidden">
                            {/* Header */}
                            <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
                                <h3 className="font-bold text-sm flex items-center gap-2"><Eye size={16} /> Bus Monitor</h3>
                                {monitorBusId && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Bus {buses.find(b => b._id === monitorBusId)?.busNumber}</span>}
                            </div>
                            <div className="flex border-b border-surface-200 dark:border-surface-700/50">
                                <div className="flex-1 py-2.5 text-center text-[11px] font-bold text-emerald-600 border-b-2 border-emerald-500">FULL ROUTE</div>
                                <div className="flex-1 py-2.5 text-center text-[11px] font-bold text-surface-400">BUS INFO</div>
                            </div>

                            {/* Stop List */}
                            <div className="flex-1 overflow-y-auto">
                                {!monitorBusId ? (
                                    <div className="p-8 text-center text-surface-400">
                                        <Eye size={32} className="mx-auto mb-3 opacity-30" />
                                        <p className="text-xs">Select a bus from the dropdown to monitor its route</p>
                                    </div>
                                ) : !monitorRoute || !monitorRoute.stops?.length ? (
                                    <div className="p-8 text-center text-surface-400">
                                        <Route size={32} className="mx-auto mb-3 opacity-30" />
                                        <p className="text-xs">No route assigned to this bus</p>
                                    </div>
                                ) : (
                                    <div className="relative px-4 py-3">
                                        {/* Adjusted Vertical Line Alignment: 16px padding + 10px (half of 20px circle) = 26px */}
                                        <div className="absolute left-[26px] top-6 bottom-6 w-1 bg-emerald-500 rounded-full" />
                                        <div className="space-y-0">
                                            {monitorRoute.stops.map((stop, i) => {
                                                const currentBusNum = buses.find(b => b._id === monitorBusId)?.busNumber;
                                                const st = monitorStopStatuses[`${currentBusNum}_${i}`] || stop.status || 'pending';
                                                const isActive = st === 'reached';
                                                const isDone = st === 'left';

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

                                                const schedMin = parseTime(stop.arrivalTime);
                                                const delay = stop.delayMinutes || 0;
                                                const realTime = schedMin !== null ? formatTime(schedMin + delay) : null;

                                                return (
                                                    <div key={i} className="relative flex items-start gap-4 min-h-[64px]">
                                                        <div className={`z-10 w-5 h-5 rounded-full border-[3px] flex-shrink-0 mt-1 transition-all ${isActive ? 'bg-emerald-500 border-emerald-600 ring-4 ring-emerald-500/20' :
                                                            isDone ? 'bg-emerald-500 border-emerald-600' :
                                                                'bg-white dark:bg-surface-800 border-surface-300 dark:border-surface-600'
                                                            }`} />
                                                        <div className="flex-1 pb-4">
                                                            <p className={`text-sm font-bold ${isDone ? 'text-surface-800 dark:text-surface-200' : isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-surface-800 dark:text-surface-200'
                                                                }`}>{stop.name}</p>
                                                            <div className="flex flex-col gap-0.5 mt-1">
                                                                {stop.arrivalTime && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] text-surface-400">Scheduled: {stop.arrivalTime}</span>
                                                                        {isActive ? (
                                                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Actual: {stop.actualTime || realTime}</span>
                                                                        ) : (
                                                                            realTime && realTime !== stop.arrivalTime && (
                                                                                <span className={`text-[10px] font-bold ${delay > 0 ? 'text-red-500' : 'text-emerald-500'}`}>Est: {realTime}</span>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {delay > 0 && <span className="text-[9px] font-bold text-red-500">+{delay} min delay</span>}
                                                            </div>
                                                        </div>
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
                        </div>
                    </div>
                )}
            </main>

            <Modal show={showAddModal} onClose={() => { setShowAddModal(false); setEditId(null); }} title={editId ? "Edit Bus" : "Add New Bus"}>
                <BusForm onSubmit={handleAddBus} onClose={() => { setShowAddModal(false); setEditId(null); }} formData={formData} setFormData={setFormData} drivers={drivers} isEdit={!!editId} />
            </Modal>
            <Modal show={showRouteModal} onClose={() => { setShowRouteModal(false); setEditId(null); }} title={editId ? "Edit Route" : "Create Route"}>
                <RouteForm onSubmit={handleAddRoute} onClose={() => { setShowRouteModal(false); setEditId(null); }} formData={routeFormData} setFormData={setRouteFormData} buses={buses} isEdit={!!editId} />
            </Modal>
            <Modal show={showStudentModal} onClose={() => { setShowStudentModal(false); setEditId(null); }} title={editId ? "Edit Student" : "Add Student"}>
                <StudentForm onSubmit={handleAddStudent} onClose={() => { setShowStudentModal(false); setEditId(null); }} formData={studentFormData} setFormData={setStudentFormData} users={users} buses={buses} isEdit={!!editId} />
            </Modal>
            <Modal show={showDriverModal} onClose={() => setShowDriverModal(false)} title="Add New Driver">
                <DriverForm onSubmit={handleAddDriver} onClose={() => setShowDriverModal(false)} formData={driverFormData} setFormData={setDriverFormData} error={driverError} />
            </Modal>
        </div >
    );
};

export default AdminDashboard;

