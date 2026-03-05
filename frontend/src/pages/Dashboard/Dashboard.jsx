import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { getUserTrips } from '../../services/api';
import { LogOut, Plus, Map, Users, IndianRupee } from 'lucide-react';
import CreateTripModal from '../../components/CreateTripModal';

export default function Dashboard() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchTrips = async () => {
        try {
            setLoading(true);
            const res = await getUserTrips();
            setTrips(res.data);
        } catch (error) {
            console.error("Failed to fetch trips", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrips();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            {/* Header */}
            <header className="max-w-5xl mx-auto flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-hover">
                        Split Expense
                    </h1>
                    <p className="text-text-muted mt-1">Welcome back, {currentUser?.email}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="btn btn-secondary flex items-center text-danger hover:text-white hover:bg-danger/90 border-transparent gap-2"
                >
                    <LogOut size={18} />
                    <span className="hidden sm:inline">Logout</span>
                </button>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold">Your Trips</h2>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus size={20} />
                        <span>Create Trip</span>
                    </button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="card h-40 bg-surface/50 border-dashed"></div>
                        ))}
                    </div>
                ) : trips.length === 0 ? (
                    <div className="text-center py-16 card border-dashed border-2">
                        <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 text-primary mb-4">
                            <Map size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No trips yet</h3>
                        <p className="text-text-muted mb-6">Create your first trip to start splitting expenses</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn btn-primary"
                        >
                            <Plus size={20} className="mr-2" /> Create Trp
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trips.map((trip) => (
                            <div
                                key={trip.tripId}
                                onClick={() => navigate(`/trip/${trip.tripId}`)}
                                className="card cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{trip.tripName}</h3>
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Map size={20} />
                                    </div>
                                </div>

                                <div className="space-y-3 mt-6">
                                    <div className="flex items-center text-text-muted text-sm">
                                        <Users size={16} className="mr-2" />
                                        <span>{trip.members?.length || 0} members</span>
                                    </div>
                                    <div className="flex items-center font-medium text-success">
                                        <IndianRupee size={16} className="mr-2" />
                                        <span>{trip.totalExpenses?.toFixed(2) || '0.00'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal */}
            {isModalOpen && (
                <CreateTripModal
                    onClose={() => setIsModalOpen(false)}
                    onTripCreated={(newTrip) => {
                        setIsModalOpen(false);
                        fetchTrips();
                    }}
                />
            )}
        </div>
    );
}
