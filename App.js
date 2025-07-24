import React, { useState, useEffect, createContext, useContext } from 'react';
// No Firebase imports needed anymore!

// --- API Configuration ---
const API_BASE_URL = 'http://localhost:5000/api'; // Make sure this matches your Node.js backend port

// Context for User data and authentication state
const AuthContext = createContext(null);

// Custom Hook for Auth Context
const useAuth = () => useContext(AuthContext);

// --- Helper Functions ---
const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        // Token expired or invalid, force logout
        localStorage.removeItem('token');
        // This will trigger a re-render and push to login screen
        window.location.reload(); // Simple reload to force re-auth
        throw new Error('Session expired or unauthorized. Please log in again.');
    }

    return response;
};

// --- Components ---

// Loading Spinner Component
const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>
);

// Message Box Component (replaces alert/confirm)
const MessageBox = ({ message, type = 'info', onClose, onConfirm }) => {
    if (!message) return null;

    const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
    const title = type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Information';

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
                <div className={`flex items-center justify-between pb-3 ${bgColor} text-white rounded-t-lg -mx-6 -mt-6 px-6 py-3`}>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl leading-none">&times;</button>
                </div>
                <div className="py-4">
                    <p className="text-gray-700">{message}</p>
                </div>
                <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 -mx-6 px-6">
                    {onConfirm && (
                        <button
                            onClick={onConfirm}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                        >
                            Confirm
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200"
                    >
                        {onConfirm ? 'Cancel' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Auth Component ---
const Auth = () => {
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const endpoint = isLogin ? `${API_BASE_URL}/auth/login` : `${API_BASE_URL}/auth/register`;
            const body = isLogin ? { email, password } : { email, password, name, contactNumber };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Authentication failed');
            }

            localStorage.setItem('token', data.token);
            login(data.user); // Update auth context
        } catch (error) {
            setMessage(`Error: ${error.message}`);
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
                    {isLogin ? 'Login' : 'Register'}
                </h2>
                <form onSubmit={handleAuth}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {!isLogin && (
                        <>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    className="form-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={!isLogin}
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="contactNumber">
                                    Contact Number
                                </label>
                                <input
                                    type="tel"
                                    id="contactNumber"
                                    className="form-input"
                                    value={contactNumber}
                                    onChange={(e) => setContactNumber(e.target.value)}
                                    required={!isLogin}
                                />
                            </div>
                        </>
                    )}
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200"
                        disabled={loading}
                    >
                        {loading ? <LoadingSpinner /> : (isLogin ? 'Login' : 'Register')}
                    </button>
                </form>
                <p className="text-center text-gray-600 text-sm mt-4">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-blue-600 hover:text-blue-800 font-bold focus:outline-none"
                    >
                        {isLogin ? 'Register' : 'Login'}
                    </button>
                </p>
                <MessageBox message={message} type={messageType} onClose={() => setMessage('')} />
            </div>
        </div>
    );
};

// --- Service Request Form Component ---
const ServiceRequestForm = ({ onSubmit }) => {
    const { user } = useAuth();
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [vin, setVin] = useState('');
    const [licensePlate, setLicensePlate] = useState('');
    const [requestedServices, setRequestedServices] = useState([]);
    const [serviceDate, setServiceDate] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const [loading, setLoading] = useState(false);

    // Predefined services
    const availableServices = [
        'Oil Change', 'Tire Rotation', 'Brake Inspection', 'Engine Diagnostic',
        'Battery Check', 'Fluid Top-Up', 'Wheel Alignment', 'AC Service',
        'Transmission Flush', 'Full Service Inspection'
    ];

    const handleServiceChange = (service) => {
        setRequestedServices(prev =>
            prev.includes(service)
                ? prev.filter(s => s !== service)
                : [...prev, service]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        if (!user || !user.id) {
            setMessage("User not authenticated. Please log in.");
            setMessageType('error');
            setLoading(false);
            return;
        }

        const serviceRequestData = {
            userId: user.id,
            make,
            model,
            year: parseInt(year),
            vin,
            licensePlate,
            requestedServices,
            serviceDate, // Send as string, backend will convert
        };

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/service-requests`, {
                method: 'POST',
                body: JSON.stringify(serviceRequestData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to submit service request');
            }

            setMessage('Service request submitted successfully!');
            setMessageType('success');
            // Clear form after submission
            setMake('');
            setModel('');
            setYear('');
            setVin('');
            setLicensePlate('');
            setRequestedServices([]);
            setServiceDate('');
            onSubmit(); // Callback to refresh data or navigate
        } catch (error) {
            setMessage(`Error submitting service request: ${error.message}`);
            setMessageType('error');
            console.error("Error submitting service request:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md mb-6">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Book a New Service</h3>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="make">Make</label>
                        <input type="text" id="make" className="form-input" value={make} onChange={(e) => setMake(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="model">Model</label>
                        <input type="text" id="model" className="form-input" value={model} onChange={(e) => setModel(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="year">Year</label>
                        <input type="number" id="year" className="form-input" value={year} onChange={(e) => setYear(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="vin">VIN</label>
                        <input type="text" id="vin" className="form-input" value={vin} onChange={(e) => setVin(e.target.value)} placeholder="e.g., 17-digit VIN" />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="licensePlate">License Plate</label>
                        <input type="text" id="licensePlate" className="form-input" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="serviceDate">Preferred Service Date</label>
                        <input type="date" id="serviceDate" className="form-input" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} required />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Requested Services</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {availableServices.map(service => (
                            <label key={service} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition duration-150">
                                <input
                                    type="checkbox"
                                    value={service}
                                    checked={requestedServices.includes(service)}
                                    onChange={() => handleServiceChange(service)}
                                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                                />
                                <span className="text-gray-700 text-sm">{service}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200"
                    disabled={loading}
                >
                    {loading ? <LoadingSpinner /> : 'Submit Request'}
                </button>
            </form>
            <MessageBox message={message} type={messageType} onClose={() => setMessage('')} />
        </div>
    );
};

// --- Service Card Component ---
const ServiceCard = ({ request, isAdmin = false, onUpdateStatus, onAssignMechanic, onSetCost, onGenerateInvoice, allMechanics = [] }) => {
    const [showInvoiceForm, setShowInvoiceForm] = useState(false);
    const [partsCost, setPartsCost] = useState(request.invoiceDetails?.parts || 0);
    const [laborCost, setLaborCost] = useState(request.invoiceDetails?.labor || 0);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');

    const handleGenerateInvoice = () => {
        const totalCost = parseFloat(partsCost) + parseFloat(laborCost);
        onGenerateInvoice(request.id, { parts: parseFloat(partsCost), labor: parseFloat(laborCost), total: totalCost });
        setMessage('Invoice details updated.');
        setMessageType('success');
        setShowInvoiceForm(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'In Progress': return 'bg-blue-100 text-blue-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-4 border-l-4 border-blue-500">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="text-xl font-bold text-gray-900">{request.make} {request.model} ({request.year})</h4>
                    <p className="text-gray-600 text-sm">License Plate: <span className="font-semibold">{request.licensePlate}</span></p>
                    {request.customer && (
                        <p className="text-gray-600 text-sm">Customer: <span className="font-semibold">{request.customer.name} ({request.customer.contactNumber})</span></p>
                    )}
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(request.status)}`}>
                    {request.status}
                </span>
            </div>

            <div className="mb-3">
                <p className="text-gray-700 font-semibold mb-1">Requested Services:</p>
                <ul className="list-disc list-inside text-gray-600 text-sm">
                    {request.requestedServices.map((service, index) => (
                        <li key={index}>{service}</li>
                    ))}
                </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700 mb-4">
                <p><strong>Preferred Date:</strong> {request.serviceDate?.toLocaleDateString() || 'N/A'}</p>
                <p><strong>Submitted On:</strong> {request.createdAt?.toLocaleDateString() || 'N/A'}</p>
                <p><strong>Assigned Mechanic:</strong> {request.assignedMechanic ? `${request.assignedMechanic.name} (${request.assignedMechanic.contactNumber})` : 'Not Assigned'}</p>
                <p><strong>Estimated Cost:</strong> {request.estimatedCost ? `$${request.estimatedCost.toFixed(2)}` : 'Not Estimated'}</p>
            </div>

            {request.invoiceDetails && (
                <div className="bg-gray-50 p-4 rounded-md mt-4">
                    <h5 className="font-bold text-gray-800 mb-2">Invoice Details:</h5>
                    <p>Parts Cost: ${request.invoiceDetails.parts?.toFixed(2) || '0.00'}</p>
                    <p>Labor Cost: ${request.invoiceDetails.labor?.toFixed(2) || '0.00'}</p>
                    <p className="font-bold text-lg">Total Cost: ${request.invoiceDetails.total?.toFixed(2) || '0.00'}</p>
                </div>
            )}

            {isAdmin && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <label htmlFor={`status-${request.id}`} className="text-sm font-medium text-gray-700">Update Status:</label>
                        <select
                            id={`status-${request.id}`}
                            className="form-select flex-grow max-w-xs"
                            value={request.status}
                            onChange={(e) => onUpdateStatus(request.id, e.target.value)}
                        >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <label htmlFor={`mechanic-${request.id}`} className="text-sm font-medium text-gray-700">Assign Mechanic:</label>
                        <select
                            id={`mechanic-${request.id}`}
                            className="form-select flex-grow max-w-xs"
                            value={request.assignedMechanicId || ''}
                            onChange={(e) => onAssignMechanic(request.id, e.target.value)}
                        >
                            <option value="">Select Mechanic</option>
                            {allMechanics.map(mechanic => (
                                <option key={mechanic.id} value={mechanic.id}>{mechanic.name} ({mechanic.role})</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <label htmlFor={`estCost-${request.id}`} className="text-sm font-medium text-gray-700">Estimated Cost ($):</label>
                        <input
                            type="number"
                            id={`estCost-${request.id}`}
                            className="form-input flex-grow max-w-xs"
                            value={request.estimatedCost || ''}
                            onChange={(e) => onSetCost(request.id, parseFloat(e.target.value))}
                            placeholder="e.g., 150.00"
                        />
                    </div>

                    <button
                        onClick={() => setShowInvoiceForm(!showInvoiceForm)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition duration-200 text-sm"
                    >
                        {showInvoiceForm ? 'Hide Invoice Form' : 'Generate/Edit Invoice'}
                    </button>

                    {showInvoiceForm && (
                        <div className="mt-3 p-4 bg-gray-50 rounded-md border border-gray-200">
                            <h5 className="font-semibold mb-2">Invoice Details:</h5>
                            <div className="mb-2">
                                <label htmlFor={`partsCost-${request.id}`} className="block text-sm font-medium text-gray-700">Parts Cost ($):</label>
                                <input
                                    type="number"
                                    id={`partsCost-${request.id}`}
                                    className="form-input"
                                    value={partsCost}
                                    onChange={(e) => setPartsCost(parseFloat(e.target.value))}
                                    step="0.01"
                                />
                            </div>
                            <div className="mb-3">
                                <label htmlFor={`laborCost-${request.id}`} className="block text-sm font-medium text-gray-700">Labor Cost ($):</label>
                                <input
                                    type="number"
                                    id={`laborCost-${request.id}`}
                                    className="form-input"
                                    value={laborCost}
                                    onChange={(e) => setLaborCost(parseFloat(e.target.value))}
                                    step="0.01"
                                />
                            </div>
                            <button
                                onClick={handleGenerateInvoice}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 text-sm"
                            >
                                Save Invoice
                            </button>
                        </div>
                    )}
                </div>
            )}
            <MessageBox message={message} type={messageType} onClose={() => setMessage('')} />
        </div>
    );
};

// --- Customer Dashboard Component ---
const CustomerDashboard = () => {
    const { user, logout } = useAuth();
    const [serviceRequests, setServiceRequests] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');

    const fetchServiceRequests = async () => {
        setLoading(true);
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/service-requests/my`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch service requests');
            }
            setServiceRequests(data);
        } catch (error) {
            setMessage(`Error fetching service requests: ${error.message}`);
            setMessageType('error');
            console.error("Error fetching customer service requests:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && user.id) {
            fetchServiceRequests();
        }
    }, [user]);

    const handleNewRequestSubmit = () => {
        setShowForm(false); // Hide form after submission
        setMessage('Service request submitted successfully!');
        setMessageType('success');
        fetchServiceRequests(); // Re-fetch requests
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
            <div className="w-full max-w-4xl">
                <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-md">
                    <h2 className="text-3xl font-bold text-gray-800">Welcome, {user?.name || user?.email || 'Customer'}!</h2>
                    <div className="flex items-center space-x-4">
                        <span className="text-gray-600 text-sm">User ID: {user?.id}</span>
                        <button
                            onClick={logout}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-200"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md mb-6 transition duration-200"
                >
                    {showForm ? 'Hide Service Form' : 'Book New Service'}
                </button>

                {showForm && (
                    <ServiceRequestForm onSubmit={handleNewRequestSubmit} />
                )}

                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Your Service History</h3>
                {loading ? (
                    <LoadingSpinner />
                ) : serviceRequests.length === 0 ? (
                    <p className="text-gray-600">No service requests found. Book one now!</p>
                ) : (
                    <div className="space-y-4">
                        {serviceRequests.map(request => (
                            <ServiceCard key={request.id} request={request} />
                        ))}
                    </div>
                )}
            </div>
            <MessageBox message={message} type={messageType} onClose={() => setMessage('')} />
        </div>
    );
};

// --- Admin Dashboard Component ---
const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [allServiceRequests, setAllServiceRequests] = useState([]);
    const [allMechanics, setAllMechanics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // Fetch all service requests
            const requestsResponse = await fetchWithAuth(`${API_BASE_URL}/service-requests/all`);
            const requestsData = await requestsResponse.json();
            if (!requestsResponse.ok) {
                throw new Error(requestsData.message || 'Failed to fetch all service requests');
            }
            setAllServiceRequests(requestsData);

            // Fetch all mechanics
            const mechanicsResponse = await fetchWithAuth(`${API_BASE_URL}/users/mechanics`);
            const mechanicsData = await mechanicsResponse.json();
            if (!mechanicsResponse.ok) {
                throw new Error(mechanicsData.message || 'Failed to fetch mechanics');
            }
            setAllMechanics(mechanicsData);

        } catch (error) {
            setMessage(`Error fetching data: ${error.message}`);
            setMessageType('error');
            console.error("Error fetching admin dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && (user.role === 'admin' || user.role === 'mechanic')) {
            fetchAllData();
        }
    }, [user]);

    // Function to update service request fields
    const updateServiceRequest = async (requestId, updates) => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/service-requests/${requestId}`, {
                method: 'PUT',
                body: JSON.stringify(updates),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update service request');
            }
            setMessage('Service request updated successfully!');
            setMessageType('success');
            fetchAllData(); // Re-fetch all data to ensure UI is up-to-date
        } catch (error) {
            setMessage(`Error updating service request: ${error.message}`);
            setMessageType('error');
            console.error("Error updating service request:", error);
        }
    };

    const handleUpdateStatus = (requestId, newStatus) => {
        updateServiceRequest(requestId, { status: newStatus });
    };

    const handleAssignMechanic = (requestId, mechanicId) => {
        updateServiceRequest(requestId, { assignedMechanicId: mechanicId });
    };

    const handleSetEstimatedCost = (requestId, cost) => {
        updateServiceRequest(requestId, { estimatedCost: cost });
    };

    const handleGenerateInvoice = (requestId, invoiceDetails) => {
        updateServiceRequest(requestId, {
            invoiceDetails: invoiceDetails,
            actualCost: invoiceDetails.total,
            status: 'Completed' // Mark as completed when invoice is generated
        });
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
            <div className="w-full max-w-6xl">
                <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-md">
                    <h2 className="text-3xl font-bold text-gray-800">{user?.role === 'admin' ? 'Admin Dashboard' : 'Mechanic Dashboard'}</h2>
                    <div className="flex items-center space-x-4">
                        <span className="text-gray-600 text-sm">User ID: {user?.id}</span>
                        <button
                            onClick={logout}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-200"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                <h3 className="text-2xl font-semibold text-gray-800 mb-4">All Service Requests</h3>
                {loading ? (
                    <LoadingSpinner />
                ) : allServiceRequests.length === 0 ? (
                    <p className="text-gray-600">No service requests found.</p>
                ) : (
                    <div className="space-y-4">
                        {allServiceRequests.map(request => (
                            <ServiceCard
                                key={request.id}
                                request={request}
                                isAdmin={true}
                                onUpdateStatus={handleUpdateStatus}
                                onAssignMechanic={handleAssignMechanic}
                                onSetCost={handleSetEstimatedCost}
                                onGenerateInvoice={handleGenerateInvoice}
                                allMechanics={allMechanics}
                            />
                        ))}
                    </div>
                )}
            </div>
            <MessageBox message={message} type={messageType} onClose={() => setMessage('')} />
        </div>
    );
};


// --- AuthProvider Component ---
const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Function to decode JWT and set user
    const decodeToken = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("Error decoding token:", e);
            return null;
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded = decodeToken(token);
            if (decoded && decoded.exp * 1000 > Date.now()) { // Check if token is not expired
                // Fetch full user profile from backend to get name/contact etc.
                const fetchUserProfile = async () => {
                    try {
                        const response = await fetchWithAuth(`${API_BASE_URL}/user/profile`);
                        const data = await response.json();
                        if (response.ok) {
                            setUser(data);
                        } else {
                            localStorage.removeItem('token'); // Clear invalid token
                            setUser(null);
                        }
                    } catch (error) {
                        console.error("Failed to fetch user profile on init:", error);
                        localStorage.removeItem('token');
                        setUser(null);
                    } finally {
                        setLoading(false);
                    }
                };
                fetchUserProfile();
            } else {
                localStorage.removeItem('token'); // Token expired
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    const login = (userData) => {
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};


// --- Main App Component ---
const App = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

const AppContent = () => {
    const { user, loading } = useAuth();

    // Render logic based on authentication state and user role
    const renderContent = () => {
        if (loading) {
            return <LoadingSpinner />;
        }

        if (!user) {
            return <Auth />;
        }

        // Determine which dashboard to show based on user role
        switch (user.role) {
            case 'admin':
                return <AdminDashboard />;
            case 'customer':
                return <CustomerDashboard />;
            case 'mechanic':
                return <AdminDashboard />; // Mechanics currently use admin dashboard
            default:
                return (
                    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
                        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Unauthorized Access</h2>
                            <p className="text-gray-600 mb-6">Your account role is not recognized. Please contact support.</p>
                            <button
                                onClick={useAuth().logout}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-200"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="font-sans antialiased text-gray-900">
            {renderContent()}
        </div>
    );
};

export default App;

