import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';
import { Plus, Bus, Map as MapIcon, List, UserPlus } from 'lucide-react';
import { socket } from '../socket';

const AdminDashboard = () => {
    const { user } = useAuth();
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
    const [studentFormData, setStudentFormData] = useState({
        name: '',
        parentId: '',
        busId: ''
    });

    useEffect(() => {
        fetchBuses();
        fetchRoutes();
        fetchStudents();
        fetchUsers();
        fetchDrivers();

        // ... socket logic ...
    }, []);

    const fetchStudents = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const token = userInfo?.token;

            const { data } = await axios.get('http://localhost:5000/api/students', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStudents(data);
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const token = userInfo?.token;
            const { data } = await axios.get('http://localhost:5000/api/auth/parents', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(data);
        } catch (error) {
            console.error('Error fetching parents:', error);
        }
    };

    const fetchDrivers = async () => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const token = userInfo?.token;
            const { data } = await axios.get('http://localhost:5000/api/auth/drivers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDrivers(data);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    const handleAddDriver = async (e) => {
        e.preventDefault();
        setDriverError('');
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const token = userInfo?.token;
            await axios.post('http://localhost:5000/api/auth/create-driver', driverFormData, {
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
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const token = userInfo?.token;

            await axios.post('http://localhost:5000/api/students', studentFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowStudentModal(false);
            setStudentFormData({ name: '', parentId: '', busId: '' });
            fetchStudents();
        } catch (error) {
            alert(error.response?.data?.message || 'Error adding student');
        }
    };

    // ... (render logic updates) ...

    {/* Header Navigation Updates */ }
    {/* This section was part of the old structure and is now replaced by the new return block. */ }
    {/*
    <div className="flex gap-4">
        <button onClick={() => setView('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${view === 'list' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
            <List size={20} /> Buses
        </button>
        <button onClick={() => setView('students')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${view === 'students' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
            <List size={20} /> Students
        </button>
        {/* ... other buttons ... }
    </div>
    */}

    {/* Student View */ }
    {/* This section was part of the old structure and is now replaced by the new return block. */ }
    {/*
    {
        view === 'students' && (
            <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800">Managed Students</h3>
                        <button
                            onClick={() => setShowStudentModal(true)}
                            className="text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1 rounded font-semibold transition-colors"
                        >
                            + Add Student
                        </button>
                    </div>
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-xs">
                            <tr>
                                <th className="px-4 py-3">Student Name</th>
                                <th className="px-4 py-3">Parent</th>
                                <th className="px-4 py-3">Assigned Bus</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(student => (
                                <tr key={student._id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                                    <td className="px-4 py-3">{student.parent?.name || 'N/A'}</td>
                                    <td className="px-4 py-3">
                                        {student.bus ? `Bus ${student.bus.busNumber}` : 'Unassigned'}
                                    </td>
                                    <td className="px-4 py-3 text-right">Edit</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }
    */}
    const [formData, setFormData] = useState({
        busNumber: '',
        plateNumber: '',
        capacity: ''
    });

    const [allBusLocations, setAllBusLocations] = useState([]);
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [routeFormData, setRouteFormData] = useState({
        name: '',
        stops: '', // comma separated for MVP
        assignedBus: ''
    });

    useEffect(() => {
        fetchBuses();
        fetchRoutes();

        // 1. SETUP LISTENERS FIRST (To avoid missing events)
        socket.on('busLocationUpdate', (data) => {
            console.log("Admin received bus update:", data);
            setAllBusLocations(prev => {
                const index = prev.findIndex(b => String(b.busId) === String(data.busId));
                if (index > -1) {
                    const newLocs = [...prev];
                    newLocs[index] = { ...newLocs[index], ...data };
                    return newLocs;
                } else {
                    return [...prev, data];
                }
            });
        });

        socket.on('activeBusList', (list) => {
            console.log("Admin received Initial Sync:", list);
            setAllBusLocations(prev => {
                const map = {};
                prev.forEach(p => map[p.busId] = p);
                list.forEach(p => map[p.busId] = p);
                return Object.values(map);
            });
        });

        socket.on('busSessionEnded', (data) => {
            setAllBusLocations(prev => prev.filter(b => b.busId !== data.busId));
        });

        // 2. DEFINE JOIN LOGIC
        const joinAdminRoom = () => {
            console.log("Joined Admin Room");
            socket.emit('joinRoom', 'admin_room');
        };
        socket.on('connect', joinAdminRoom);

        // 3. TRIGGER CONNECTION / JOIN
        if (!socket.connected) {
            socket.connect();
        } else {
            // If already connected, manual join because 'connect' event won't fire again
            joinAdminRoom();
        }

        // CLEANUP
        return () => {
            socket.off('connect', joinAdminRoom);
            socket.off('busLocationUpdate');
            socket.off('activeBusList');
            socket.off('busSessionEnded');
            socket.disconnect();
        }
    }, []);

    const fetchBuses = async () => {
        try {
            const { data } = await axios.get('http://localhost:5000/api/buses');
            setBuses(data);
        } catch (error) {
            console.error('Error fetching buses:', error);
        }
    };

    const fetchRoutes = async () => {
        try {
            const { data } = await axios.get('http://localhost:5000/api/routes');
            setRoutes(data);
        } catch (error) {
            console.error('Error fetching routes:', error);
        }
    };

    const handleAddBus = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/buses', formData);
            setShowAddModal(false);
            setFormData({ busNumber: '', plateNumber: '', capacity: '' });
            fetchBuses();
        } catch (error) {
            alert(error.response?.data?.message || 'Error adding bus');
        }
    };

    const handleAddRoute = async (e) => {
        e.preventDefault();
        try {
            // Convert comma separated stops to array of objects
            const stopsArray = routeFormData.stops.split(',').map(s => ({ name: s.trim() }));

            await axios.post('http://localhost:5000/api/routes', {
                name: routeFormData.name,
                stops: stopsArray,
                assignedBus: routeFormData.assignedBus || null
            });

            setShowRouteModal(false);
            setRouteFormData({ name: '', stops: '', assignedBus: '' });
            fetchRoutes();
        } catch (error) {
            alert(error.response?.data?.message || 'Error adding route');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow px-6 py-4 flex justify-between items-center z-10">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-indigo-600">Admin</span> Dashboard
                </h1>
                <div className="flex gap-4">
                    <button onClick={() => setView('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${view === 'list' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <List size={20} /> Buses
                    </button>
                    <button onClick={() => setView('routes')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${view === 'routes' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <List size={20} /> Routes
                    </button>
                    <button onClick={() => setView('students')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${view === 'students' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <List size={20} /> Students
                    </button>
                    <button onClick={() => setView('drivers')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${view === 'drivers' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <UserPlus size={20} /> Drivers
                    </button>
                    <button onClick={() => setView('map')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${view === 'map' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <MapIcon size={20} /> Live Map
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-indigo-200">
                        <Plus size={20} /> Add Bus
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 p-6 overflow-hidden relative">
                {/* Debug Info Overlay */}
                <div className="absolute bottom-4 left-4 z-20 bg-black/80 text-white p-4 rounded-lg text-xs font-mono max-w-sm pointer-events-none">
                    <p className="font-bold text-yellow-400 mb-1">DEBUG MONITOR</p>
                    <p>Bus Count: {allBusLocations.length}</p>
                    <p>Last Update: {new Date().toLocaleTimeString()}</p>
                    <div className="mt-2 border-t border-gray-600 pt-2">
                        {allBusLocations.length === 0 ? (
                            <p className="text-gray-400">Waiting for driver data...</p>
                        ) : (
                            allBusLocations.map(b => (
                                <p key={b.busId}>Bus {b.busId}: {b.lat.toFixed(4)}, {b.lng.toFixed(4)}</p>
                            ))
                        )}
                    </div>
                </div>

                {view === 'list' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {buses.map(bus => (
                            <div key={bus._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800">Bus {bus.busNumber}</h3>
                                        <p className="text-sm text-gray-500">{bus.plateNumber}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${bus.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {bus.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex justify-between">
                                        <span>Capacity:</span>
                                        <span className="font-medium text-gray-900">{bus.capacity}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Driver:</span>
                                        <span className="font-medium text-gray-900">{bus.driver?.name || 'Unassigned'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {buses.length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-400">
                                <Bus size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No buses found. Add one to get started.</p>
                            </div>
                        )}
                    </div>
                )}

                {view === 'routes' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-800">Managed Routes</h3>
                                <button
                                    onClick={() => setShowRouteModal(true)}
                                    className="text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1 rounded font-semibold transition-colors"
                                >
                                    + Create Route
                                </button>
                            </div>
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Route Name</th>
                                        <th className="px-4 py-3">Stops</th>
                                        <th className="px-4 py-3">Assigned Bus</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {routes.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-8 text-center text-gray-400">No routes created yet.</td>
                                        </tr>
                                    ) : (
                                        routes.map(route => (
                                            <tr key={route._id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{route.name}</td>
                                                <td className="px-4 py-3">{route.stops?.length || 0} Stops</td>
                                                <td className="px-4 py-3">
                                                    {route.assignedBus ? (
                                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">
                                                            BUS-{route.assignedBus.busNumber}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-indigo-600 hover:underline cursor-pointer">Edit</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {view === 'students' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-800">Managed Students</h3>
                                <button
                                    onClick={() => setShowStudentModal(true)}
                                    className="text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1 rounded font-semibold transition-colors"
                                >
                                    + Add Student
                                </button>
                            </div>
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Student Name</th>
                                        <th className="px-4 py-3">Parent</th>
                                        <th className="px-4 py-3">Assigned Bus</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-8 text-center text-gray-400">No students added yet.</td>
                                        </tr>
                                    ) : (
                                        students.map(student => (
                                            <tr key={student._id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                                                <td className="px-4 py-3">{student.parent?.name || 'N/A'}</td>
                                                <td className="px-4 py-3">
                                                    {student.bus ? `Bus ${student.bus.busNumber}` : 'Unassigned'}
                                                </td>
                                                <td className="px-4 py-3 text-right">Edit</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
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
                    <div className="absolute inset-0 bg-gray-200 m-6 rounded-2xl overflow-hidden shadow-inner border border-gray-300">
                        <MapComponent
                            markers={allBusLocations}
                            initialViewState={{ latitude: 28.6139, longitude: 77.2090, zoom: 11 }}
                        />
                    </div>
                )}
            </main>

            {/* Add Bus Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100">
                        <h2 className="text-xl font-bold mb-4">Add New Bus</h2>
                        <form onSubmit={handleAddBus} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bus Number</label>
                                <input type="text" required className="w-full border rounded-lg px-3 py-2" placeholder="e.g. 101" value={formData.busNumber} onChange={e => setFormData({ ...formData, busNumber: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                                <input type="text" required className="w-full border rounded-lg px-3 py-2" placeholder="e.g. DL-1C-2024" value={formData.plateNumber} onChange={e => setFormData({ ...formData, plateNumber: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                                <input type="number" required className="w-full border rounded-lg px-3 py-2" placeholder="e.g. 40" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Bus</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Route Modal */}
            {showRouteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100">
                        <h2 className="text-xl font-bold mb-4">Create New Route</h2>
                        <form onSubmit={handleAddRoute} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="e.g. School to Downtown"
                                    value={routeFormData.name}
                                    onChange={e => setRouteFormData({ ...routeFormData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Stops (comma separated)</label>
                                <textarea
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="e.g. Stop A, Stop B, Stop C"
                                    rows="3"
                                    value={routeFormData.stops}
                                    onChange={e => setRouteFormData({ ...routeFormData, stops: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Bus</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={routeFormData.assignedBus}
                                    onChange={e => setRouteFormData({ ...routeFormData, assignedBus: e.target.value })}
                                >
                                    <option value="">-- No Bus Assigned --</option>
                                    {buses.map(bus => (
                                        <option key={bus._id} value={bus._id}>Bus {bus.busNumber} ({bus.plateNumber})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowRouteModal(false)} className="flex-1 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Create Route</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Student Modal */}
            {showStudentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100">
                        <h2 className="text-xl font-bold mb-4">Add New Student</h2>
                        <form onSubmit={handleAddStudent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                                <input type="text" required className="w-full border rounded-lg px-3 py-2" placeholder="e.g. John Doe" value={studentFormData.name} onChange={e => setStudentFormData({ ...studentFormData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Parent</label>
                                <select required className="w-full border rounded-lg px-3 py-2" value={studentFormData.parentId} onChange={e => setStudentFormData({ ...studentFormData, parentId: e.target.value })}>
                                    <option value="">Select Parent</option>
                                    {users.map(user => (
                                        <option key={user._id} value={user._id}>{user.name} ({user.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Bus</label>
                                <select required className="w-full border rounded-lg px-3 py-2" value={studentFormData.busId} onChange={e => setStudentFormData({ ...studentFormData, busId: e.target.value })}>
                                    <option value="">Select Bus</option>
                                    {buses.map(bus => (
                                        <option key={bus._id} value={bus._id}>Bus {bus.busNumber} ({bus.plateNumber})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowStudentModal(false)} className="flex-1 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add Student</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Add Driver Modal */}
            {showDriverModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-1">Add New Driver</h2>
                        <p className="text-xs text-gray-400 mb-4">The driver will use these credentials to log in.</p>
                        {driverError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{driverError}</div>
                        )}
                        <form onSubmit={handleAddDriver} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input type="text" required className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Ravi Kumar" value={driverFormData.name} onChange={e => setDriverFormData({ ...driverFormData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" required className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="driver@example.com" value={driverFormData.email} onChange={e => setDriverFormData({ ...driverFormData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input type="password" required minLength={6} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Min. 6 characters" value={driverFormData.password} onChange={e => setDriverFormData({ ...driverFormData, password: e.target.value })} />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowDriverModal(false)} className="flex-1 py-2 text-gray-600 hover:bg-gray-50 rounded-lg border">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Create Driver</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;

