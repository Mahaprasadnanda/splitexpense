import { useState, useEffect } from 'react';
import { X, Search, Check, Plus } from 'lucide-react';
import { createTrip, getAllUsers } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CreateTripModal({ onClose, onTripCreated }) {
    const { currentUser } = useAuth();
    const [tripName, setTripName] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await getAllUsers();
                // Exclude current user from selection list
                setUsers(res.data.filter(u => u.userId !== currentUser.uid));
            } catch (err) {
                console.error("Failed to fetch users", err);
            }
        };
        fetchUsers();
    }, [currentUser]);

    const toggleMember = (userId) => {
        if (selectedMembers.includes(userId)) {
            setSelectedMembers(selectedMembers.filter(id => id !== userId));
        } else {
            setSelectedMembers([...selectedMembers, userId]);
        }
    };

    const filteredUsers = users.filter((u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // If search is an email format and not in filtered users, show exact email match option
    const isEmailSearch = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchQuery.trim());
    const exactMatchFound = filteredUsers.some(u => u.email.toLowerCase() === searchQuery.trim().toLowerCase());

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!tripName.trim()) return;

        try {
            setLoading(true);
            await createTrip({
                tripName: tripName.trim(),
                members: selectedMembers
            });
            onTripCreated();
        } catch (err) {
            console.error("Failed to create trip", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="card w-full max-w-lg bg-surface relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-text-muted hover:text-text hover:bg-secondary rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-bold mb-6">Create New Trip</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="label">Trip Name</label>
                        <input
                            type="text"
                            required
                            className="input-field"
                            placeholder="e.g. Goa Trip 2026"
                            value={tripName}
                            onChange={(e) => setTripName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="label">Add Members (Optional)</label>
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                            <input
                                type="text"
                                className="input-field pl-9 text-sm py-2"
                                placeholder="Search by name or email"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {filteredUsers.length === 0 && !isEmailSearch ? (
                                <div className="text-center text-sm text-text-muted py-4">
                                    No users found matching that name or email.
                                </div>
                            ) : null}

                            {isEmailSearch && !exactMatchFound && (
                                <div
                                    className="flex items-center justify-between p-3 rounded-lg border border-primary border-dashed bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors mb-2"
                                    onClick={() => {
                                        // Add temporary "dummy" user object to the selection
                                        const newEmail = searchQuery.trim().toLowerCase();

                                        // Just use email as the dummy ID to make backend syncing easy
                                        const dummyId = newEmail;
                                        if (!selectedMembers.includes(dummyId)) {
                                            setSelectedMembers([...selectedMembers, dummyId]);
                                        }
                                        setSearchQuery('');
                                    }}
                                >
                                    <div>
                                        <div className="font-medium text-sm text-primary">Invite {searchQuery.trim()}</div>
                                        <div className="text-xs text-text-muted">Click to add this email to the trip</div>
                                    </div>
                                    <div className="w-5 h-5 rounded flex items-center justify-center border border-primary text-primary">
                                        <Plus size={14} />
                                    </div>
                                </div>
                            )}

                            {/* Render explicit dummy members that were added manually via email */}
                            {selectedMembers.filter(id => id.includes('@')).map(dummyId => {
                                const email = dummyId;
                                return (
                                    <div
                                        key={dummyId}
                                        onClick={() => toggleMember(dummyId)}
                                        className="flex items-center justify-between p-3 rounded-lg border border-primary bg-primary/5 cursor-pointer transition-all duration-200"
                                    >
                                        <div>
                                            <div className="font-medium text-sm">{email.split('@')[0]} (Invited)</div>
                                            <div className="text-xs text-text-muted">{email}</div>
                                        </div>
                                        <div className="w-5 h-5 rounded flex items-center justify-center border bg-primary border-primary text-white">
                                            <Check size={14} />
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredUsers.map((user) => {
                                const isSelected = selectedMembers.includes(user.userId);
                                return (
                                    <div
                                        key={user.userId}
                                        onClick={() => toggleMember(user.userId)}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${isSelected
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/30 hover:bg-secondary/50'
                                            }`}
                                    >
                                        <div>
                                            <div className="font-medium text-sm">{user.name}</div>
                                            <div className="text-xs text-text-muted">{user.email}</div>
                                        </div>
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-primary border-primary text-white' : 'border-text-muted/50'
                                            }`}>
                                            {isSelected && <Check size={14} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="text-xs text-text-muted mt-2">
                            {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected. You'll be added automatically.
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary px-6"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !tripName.trim()}
                            className="btn btn-primary px-6"
                        >
                            {loading ? 'Creating...' : 'Create Trip'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
