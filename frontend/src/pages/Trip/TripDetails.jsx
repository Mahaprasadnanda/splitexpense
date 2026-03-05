import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTripDetails, getTripExpenses, getBalances, deleteExpense, settleBalance, getAllUsers } from '../../services/api';
import { ArrowLeft, Plus, Receipt, IndianRupee, Trash2, User, Wallet, Edit2 } from 'lucide-react';
import ExpenseModal from '../../components/ExpenseModal';

export default function TripDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [trip, setTrip] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState({});
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState(null);

    const fetchTripData = async () => {
        try {
            setLoading(true);
            const [tripRes, expRes, balRes, usersRes] = await Promise.all([
                getTripDetails(id),
                getTripExpenses(id),
                getBalances(id),
                getAllUsers()
            ]);

            setTrip(tripRes.data);
            setExpenses(expRes.data.sort((a, b) => new Date(b.date) - new Date(a.date)));
            setBalances(balRes.data);

            const userMap = {};
            usersRes.data.forEach(u => userMap[u.userId] = u);

            // Also inject any dummy users from the trip members list
            tripRes.data.members?.forEach(memberId => {
                if (memberId.includes('@') && !userMap[memberId]) {
                    const tempEmail = memberId;
                    userMap[memberId] = {
                        userId: memberId,
                        name: tempEmail.split('@')[0],
                        email: tempEmail
                    };
                }
            });

            setUsers(userMap);

        } catch (error) {
            console.error("Failed to fetch trip data", error);
            if (error.response?.status === 403 || error.response?.status === 404) {
                navigate('/');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTripData();
    }, [id]);

    const handleDeleteExpense = async (expenseId) => {
        if (window.confirm('Are you sure you want to delete this expense?')) {
            try {
                await deleteExpense(id, expenseId);
                fetchTripData();
            } catch (err) {
                alert("Failed to delete expense. Only the creator can delete it.");
            }
        }
    };

    const handleSettleUp = async (toUserId, amount) => {
        if (window.confirm(`Settle ₹${amount.toFixed(2)} with ${users[toUserId]?.name}?`)) {
            try {
                await settleBalance(id, {
                    fromUserId: currentUser.uid,
                    toUserId: toUserId,
                    amount: amount
                });
                fetchTripData();
            } catch (err) {
                alert("Failed to settle balance");
            }
        }
    };

    if (loading) return (
        <div className="min-h-screen p-8 flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (!trip) return null;

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="bg-surface border-b border-border sticky top-0 z-10 px-4 py-4 md:px-8">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-2 hover:bg-secondary rounded-full transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">{trip.tripName}</h1>
                            <p className="text-sm text-text-muted">{trip.members?.length} Members • Total: ₹{trip.totalExpenses?.toFixed(2)}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setExpenseToEdit(null);
                            setIsExpenseModalOpen(true);
                        }}
                        className="btn btn-primary"
                    >
                        <Plus size={18} className="md:mr-2" />
                        <span className="hidden md:inline">Add Expense</span>
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Expenses */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Receipt size={24} className="text-primary" />
                        Expenses
                    </h2>

                    {expenses.length === 0 ? (
                        <div className="card text-center py-12">
                            <p className="text-text-muted">No expenses yet. Add one to get started!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {expenses.map(exp => {
                                const isCreator = exp.createdBy === currentUser.uid;
                                const paidByName = exp.paidBy === currentUser.uid ? 'You' : users[exp.paidBy]?.name || 'Unknown';
                                const mySplit = exp.splits.find(s => s.userId === currentUser.uid);

                                return (
                                    <div key={exp.expenseId} className="card hover:border-primary/30 transition-colors p-5">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-lg">{exp.title}</h3>
                                                    <span className="px-2 py-0.5 text-xs rounded-full bg-secondary text-text-muted">
                                                        {exp.splitType} Split
                                                    </span>
                                                </div>
                                                <p className="text-sm text-text-muted mb-2">
                                                    <span className="font-medium text-text">{paidByName}</span> paid <span className="font-medium text-text">₹{exp.amount.toFixed(2)}</span>
                                                    {' • '} {new Date(exp.date).toLocaleDateString()}
                                                </p>

                                                {mySplit && (
                                                    <p className="text-sm bg-primary/10 text-primary inline-flex px-2 py-1 rounded">
                                                        Your share: ₹{mySplit.amount.toFixed(2)}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex flex-col items-end gap-2">
                                                <div className="text-lg font-bold">₹{exp.amount.toFixed(2)}</div>
                                                {isCreator && (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setExpenseToEdit(exp);
                                                                setIsExpenseModalOpen(true);
                                                            }}
                                                            className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                                            title="Edit Expense"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteExpense(exp.expenseId)}
                                                            className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
                                                            title="Delete Expense"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Column: Balances */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Wallet size={24} className="text-primary" />
                        Balances
                    </h2>

                    <div className="card p-0 overflow-hidden text-sm md:text-base">
                        <div className="p-5 border-b border-border bg-secondary/30">
                            <h3 className="font-semibold mb-1">Your Net Balance</h3>
                            {balances[currentUser.uid] > 0 ? (
                                <div className="text-success font-bold text-xl">You are owed ₹{balances[currentUser.uid].toFixed(2)}</div>
                            ) : balances[currentUser.uid] < 0 ? (
                                <div className="text-danger font-bold text-xl">You owe ₹{Math.abs(balances[currentUser.uid]).toFixed(2)}</div>
                            ) : (
                                <div className="text-text-muted font-bold text-xl">Settled up</div>
                            )}
                        </div>

                        <div className="p-5 space-y-4">
                            <h3 className="font-semibold text-text-muted mb-3 text-sm uppercase tracking-wider">Group Balances</h3>
                            {trip.members.map(memberId => {
                                if (memberId === currentUser.uid) return null;
                                const bal = balances[memberId] || 0;

                                // If I owe them (they have + balance, I have - balance overall, but let's simplify pairwise)
                                // Actually to do exact pairwise we need max flow, but for now we just show who has + and -
                                // A true Splitwise does settling up between - and +. Let's just show everyone's net balance.
                                // Or if my balance is < 0 and theirs is > 0, I can settle up with them.

                                return (
                                    <div key={memberId} className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex flex-shrink-0 items-center justify-center text-primary font-bold text-sm">
                                                {(users[memberId]?.name || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium truncate max-w-[100px] md:max-w-[150px]">{users[memberId]?.name}</span>
                                        </div>

                                        <div className="flex flex-col items-end">
                                            {bal > 0 ? (
                                                <span className="text-success">Owed ₹{bal.toFixed(2)}</span>
                                            ) : bal < 0 ? (
                                                <span className="text-danger">Owes ₹{Math.abs(bal).toFixed(2)}</span>
                                            ) : (
                                                <span className="text-text-muted">Settled</span>
                                            )}

                                            {/* Settle button: If user owes money (balance < 0) and member is owed money (bal > 0) */}
                                            {(balances[currentUser.uid] < -0.01 && bal > 0.01) && (
                                                <button
                                                    onClick={() => handleSettleUp(memberId, Math.min(Math.abs(balances[currentUser.uid]), bal))}
                                                    className="text-xs text-primary hover:text-primary-hover mt-1 font-medium"
                                                >
                                                    pay them →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {isExpenseModalOpen && (
                <ExpenseModal
                    trip={trip}
                    users={users}
                    expenseToEdit={expenseToEdit}
                    onClose={() => {
                        setIsExpenseModalOpen(false);
                        setExpenseToEdit(null);
                    }}
                    onExpenseAdded={() => {
                        setIsExpenseModalOpen(false);
                        setExpenseToEdit(null);
                        fetchTripData();
                    }}
                />
            )}
        </div>
    );
}
