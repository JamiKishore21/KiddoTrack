import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';
import { Plus, Bus, Map as MapIcon, Users, Route, LogOut, Radio, List, UserPlus } from 'lucide-react';
import { socket } from '../socket';
import ThemeToggle from '../components/ThemeToggle';
import { API_URL } from '../constants';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [view, setView] = useState('list');
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
    const [formData, setFormData] = useState({ busNumber: '', plateNumber: '', capacity: '' });
    const [allBusLocations, setAllBusLocations] = useState([]);
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [routeFormData, setRouteFormData] = useState({ name: '', stops: '', assignedBus: '' });

    useEffect(() => { fetchBuses(); fetchRoutes(); fetchStudents(); fetchUsers(); }, []);

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

    const handleAddStudent = async (e) => { e.preventDefault(); try { const t = JSON.parse(localStorage.getItem('userInfo'))?.token; await axios.post(`${API_URL}/students`, studentFormData, { headers: { Authorization: `Bearer ${t}` } }); setShowStudentModal(false); setStudentFormData({ name: '', parentId: '', busId: '' }); fetchStudents(); } catch (e) { alert(e.response?.data?.message || 'Error'); } };

    useEffect(() => {
        fetchBuses(); fetchRoutes(); fetchStudents(); fetchUsers(); fetchDrivers();
        socket.on('busLocationUpdate', (d) => { setAllBusLocations(prev => { const i = prev.findIndex(b => String(b.busId) === String(d.busId)); if (i > -1) { const n = [...prev]; n[i] = { ...n[i], ...d }; return n; } return [...prev, d]; }); });
        socket.on('activeBusList', (l) => { setAllBusLocations(prev => { const m = {}; prev.forEach(p => m[p.busId] = p); l.forEach(p => m[p.busId] = p); return Object.values(m); }); });
        socket.on('busSessionEnded', (d) => { setAllBusLocations(prev => prev.filter(b => b.busId !== d.busId)); });
        const join = () => socket.emit('joinRoom', 'admin_room');
        socket.on('connect', join); if (!socket.connected) socket.connect(); else join();
        return () => { socket.off('connect', join); socket.off('busLocationUpdate'); socket.off('activeBusList'); socket.off('busSessionEnded'); socket.disconnect(); };
    }, []);

    const fetchBuses = async () => { try { const { data } = await axios.get(`${API_URL}/buses`); setBuses(data); } catch (e) { console.error(e); } };
    const fetchRoutes = async () => { try { const { data } = await axios.get(`${API_URL}/routes`); setRoutes(data); } catch (e) { console.error(e); } };
    const handleAddBus = async (e) => { e.preventDefault(); try { await axios.post(`${API_URL}/buses`, formData); setShowAddModal(false); setFormData({ busNumber: '', plateNumber: '', capacity: '' }); fetchBuses(); } catch (e) { alert(e.response?.data?.message || 'Error'); } };
    const handleAddRoute = async (e) => { e.preventDefault(); try { await axios.post(`${API_URL}/routes`, { name: routeFormData.name, stops: routeFormData.stops.split(',').map(s => ({ name: s.trim() })), assignedBus: routeFormData.assignedBus || null }); setShowRouteModal(false); setRouteFormData({ name: '', stops: '', assignedBus: '' }); fetchRoutes(); } catch (e) { alert(e.response?.data?.message || 'Error'); } };

    const navItems = [
        { id: 'list', label: 'Buses', icon: Bus },
        { id: 'routes', label: 'Routes', icon: Route },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'drivers', label: 'Drivers', icon: UserPlus },
        { id: 'map', label: 'Live Map', icon: MapIcon },
    ];

    const Modal = ({ show, onClose, title, children }) => {
        if (!show) return null;
        return (
            <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fade-in" onClick={onClose}>
                <div className="bg-white dark:bg-surface-800 rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md shadow-glass-lg border border-surface-200 dark:border-surface-700/50 animate-slide-up" onClick={e => e.stopPropagation()}>
                    <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-5">{title}</h2>
                    {children}
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen-safe flex flex-col bg-surface-50 dark:bg-surface-950">
            <header className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700/50 px-4 sm:px-6 py-3 flex justify-between items-center z-20 flex-shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                    <h1 className="text-lg sm:text-xl font-bold">
                        <span className="text-gradient">Admin</span>
                        <span className="text-surface-900 dark:text-white"> Dashboard</span>
                    </h1>
                    <span className="badge badge-success"><Radio size={10} className={allBusLocations.length > 0 ? 'animate-pulse' : ''} /> {allBusLocations.length} Live</span>
                </div>
                <div className="hidden md:flex gap-1.5 items-center">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => setView(item.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${view === item.id ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400' : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'}`}>
                            <item.icon size={16} /> {item.label}
                        </button>
                    ))}
                    <button onClick={() => setShowAddModal(true)} className="btn-primary py-2 px-3 text-sm ml-1 flex items-center gap-1"><Plus size={16} /> Add Bus</button>
                    <ThemeToggle className="ml-1" />
                    <button onClick={logout} className="btn-ghost p-2 ml-0.5"><LogOut size={18} /></button>
                </div>
                <div className="flex items-center gap-1.5 md:hidden">
                    <button onClick={() => setShowAddModal(true)} className="btn-primary p-2"><Plus size={18} /></button>
                    <ThemeToggle />
                    <button onClick={logout} className="btn-ghost p-2"><LogOut size={18} /></button>
                </div>
            </header>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700/50 z-30 flex">
                {navItems.map(item => (
                    <button key={item.id} onClick={() => setView(item.id)}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${view === item.id ? 'text-brand-500 dark:text-brand-400' : 'text-surface-400 dark:text-surface-500'}`}>
                        <item.icon size={20} /><span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            <main className="flex-1 overflow-auto p-3 sm:p-6 pb-20 md:pb-6">
                {view === 'list' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {buses.map(bus => (
                            <div key={bus._id} className="card p-4 sm:p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-surface-900 dark:text-white">Bus {bus.busNumber}</h3>
                                        <p className="text-xs text-surface-400 font-mono">{bus.plateNumber}</p>
                                    </div>
                                    <span className={bus.status === 'active' ? 'badge badge-success' : 'badge badge-neutral'}>{bus.status.toUpperCase()}</span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-surface-500 dark:text-surface-400"><span>Capacity</span><span className="font-semibold text-surface-800 dark:text-surface-200">{bus.capacity}</span></div>
                                    <div className="flex justify-between text-surface-500 dark:text-surface-400"><span>Driver</span><span className="font-semibold text-surface-800 dark:text-surface-200 truncate ml-2">{bus.driver?.name || 'Unassigned'}</span></div>
                                </div>
                            </div>
                        ))}
                        {buses.length === 0 && <div className="col-span-full py-16 text-center"><Bus size={48} className="mx-auto mb-4 text-surface-300 dark:text-surface-600" /><p className="text-surface-400">No buses. Add one to start.</p></div>}
                    </div>
                )}

                {view === 'routes' && (
                    <div className="card p-4 sm:p-6">
                        <div className="flex justify-between items-center mb-5"><h3 className="section-title">Routes</h3><button onClick={() => setShowRouteModal(true)} className="btn-secondary py-2 text-sm">+ Create Route</button></div>
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead><tr className="border-b border-surface-200 dark:border-surface-700/40"><th className="px-4 py-3 text-xs font-bold text-surface-400 uppercase">Route</th><th className="px-4 py-3 text-xs font-bold text-surface-400 uppercase">Stops</th><th className="px-4 py-3 text-xs font-bold text-surface-400 uppercase">Bus</th><th className="px-4 py-3 text-xs font-bold text-surface-400 uppercase text-right">Actions</th></tr></thead>
                                <tbody>
                                    {routes.length === 0 ? <tr><td colSpan="4" className="px-4 py-8 text-center text-surface-400">No routes yet.</td></tr>
                                        : routes.map(r => (
                                            <tr key={r._id} className="border-b border-surface-100 dark:border-surface-700/30 hover:bg-surface-50 dark:hover:bg-surface-700/20 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-surface-900 dark:text-surface-100">{r.name}</td>
                                                <td className="px-4 py-3 text-surface-500 dark:text-surface-400">{r.stops?.length || 0}</td>
                                                <td className="px-4 py-3">{r.assignedBus ? <span className="badge badge-info">BUS-{r.assignedBus.busNumber}</span> : <span className="text-surface-400 text-xs">—</span>}</td>
                                                <td className="px-4 py-3 text-right"><button className="text-brand-500 dark:text-brand-400 hover:underline text-xs font-medium">Edit</button></td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden space-y-2">{routes.length === 0 ? <p className="text-center text-surface-400 py-8 text-sm">No routes.</p> : routes.map(r => (
                            <div key={r._id} className="bg-surface-50 dark:bg-surface-900 rounded-2xl p-3 border border-surface-200 dark:border-surface-700/40">
                                <div className="flex justify-between items-start mb-1"><h4 className="font-bold text-surface-800 dark:text-surface-200 text-sm">{r.name}</h4>{r.assignedBus ? <span className="badge badge-info text-[10px]">BUS-{r.assignedBus.busNumber}</span> : <span className="text-surface-400 text-xs">—</span>}</div>
                                <p className="text-xs text-surface-400">{r.stops?.length || 0} Stops</p>
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
                                        <td className="px-4 py-3 text-right"><button className="text-brand-500 dark:text-brand-400 hover:underline text-xs font-medium">Edit</button></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                        <div className="sm:hidden space-y-2">{students.length === 0 ? <p className="text-center text-surface-400 py-8 text-sm">No students.</p> : students.map(s => (
                            <div key={s._id} className="bg-surface-50 dark:bg-surface-900 rounded-2xl p-3 border border-surface-200 dark:border-surface-700/40 flex items-center gap-3">
                                <div className="bg-brand-100 dark:bg-brand-900/30 p-2 rounded-xl"><Users size={16} className="text-brand-600 dark:text-brand-400" /></div>
                                <div className="flex-1 min-w-0"><h4 className="font-bold text-surface-800 dark:text-surface-200 text-sm truncate">{s.name}</h4><p className="text-xs text-surface-400 truncate">{s.parent?.name || 'N/A'}</p></div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bus ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400' : 'bg-surface-200 dark:bg-surface-700 text-surface-500'}`}>{s.bus ? `Bus ${s.bus.busNumber}` : 'None'}</span>
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

                {view === 'map' && (
                    <div className="rounded-3xl overflow-hidden border border-surface-200 dark:border-surface-700/40 shadow-glass h-[calc(100vh-200px)] md:h-[calc(100vh-140px)]">
                        <MapComponent markers={allBusLocations} initialViewState={{ latitude: 28.6139, longitude: 77.2090, zoom: 11 }} />
                    </div>
                )}
            </main>

            <Modal show={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Bus">
                <form onSubmit={handleAddBus} className="space-y-4">
                    <div><label className="label">Bus Number</label><input type="text" required className="input" placeholder="e.g. 101" value={formData.busNumber} onChange={e => setFormData({ ...formData, busNumber: e.target.value })} /></div>
                    <div><label className="label">License Plate</label><input type="text" required className="input" placeholder="e.g. DL-1C-2024" value={formData.plateNumber} onChange={e => setFormData({ ...formData, plateNumber: e.target.value })} /></div>
                    <div><label className="label">Capacity</label><input type="number" required className="input" placeholder="e.g. 40" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} /></div>
                    <div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">Save Bus</button></div>
                </form>
            </Modal>
            <Modal show={showRouteModal} onClose={() => setShowRouteModal(false)} title="Create Route">
                <form onSubmit={handleAddRoute} className="space-y-4">
                    <div><label className="label">Route Name</label><input type="text" required className="input" placeholder="School to Downtown" value={routeFormData.name} onChange={e => setRouteFormData({ ...routeFormData, name: e.target.value })} /></div>
                    <div><label className="label">Stops (comma separated)</label><textarea className="input" placeholder="Stop A, Stop B, Stop C" rows="3" value={routeFormData.stops} onChange={e => setRouteFormData({ ...routeFormData, stops: e.target.value })} /></div>
                    <div><label className="label">Assign Bus</label><select className="input" value={routeFormData.assignedBus} onChange={e => setRouteFormData({ ...routeFormData, assignedBus: e.target.value })}><option value="">-- No Bus --</option>{buses.map(b => <option key={b._id} value={b._id}>Bus {b.busNumber} ({b.plateNumber})</option>)}</select></div>
                    <div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowRouteModal(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">Create</button></div>
                </form>
            </Modal>
            <Modal show={showStudentModal} onClose={() => setShowStudentModal(false)} title="Add Student">
                <form onSubmit={handleAddStudent} className="space-y-4">
                    <div><label className="label">Student Name</label><input type="text" required className="input" placeholder="John Doe" value={studentFormData.name} onChange={e => setStudentFormData({ ...studentFormData, name: e.target.value })} /></div>
                    <div><label className="label">Parent</label><select required className="input" value={studentFormData.parentId} onChange={e => setStudentFormData({ ...studentFormData, parentId: e.target.value })}><option value="">Select Parent</option>{users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}</select></div>
                    <div><label className="label">Assign Bus</label><select required className="input" value={studentFormData.busId} onChange={e => setStudentFormData({ ...studentFormData, busId: e.target.value })}><option value="">Select Bus</option>{buses.map(b => <option key={b._id} value={b._id}>Bus {b.busNumber} ({b.plateNumber})</option>)}</select></div>
                    <div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowStudentModal(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">Add Student</button></div>
                </form>
            </Modal>
            <Modal show={showDriverModal} onClose={() => setShowDriverModal(false)} title="Add New Driver">
                <p className="text-xs text-surface-400 dark:text-surface-500 mb-4">The driver will use these credentials to log in.</p>
                {driverError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-xl mb-4 text-sm">{driverError}</div>}
                <form onSubmit={handleAddDriver} className="space-y-4">
                    <div><label className="label">Full Name</label><input type="text" required className="input" placeholder="e.g. Ravi Kumar" value={driverFormData.name} onChange={e => setDriverFormData({ ...driverFormData, name: e.target.value })} /></div>
                    <div><label className="label">Email</label><input type="email" required className="input" placeholder="driver@example.com" value={driverFormData.email} onChange={e => setDriverFormData({ ...driverFormData, email: e.target.value })} /></div>
                    <div><label className="label">Password</label><input type="password" required minLength={6} className="input" placeholder="Min. 6 characters" value={driverFormData.password} onChange={e => setDriverFormData({ ...driverFormData, password: e.target.value })} /></div>
                    <div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowDriverModal(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">Create Driver</button></div>
                </form>
            </Modal>
        </div >
    );
};

export default AdminDashboard;

