import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { createExpense, updateExpense } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ExpenseModal({ trip, users, expenseToEdit, onClose, onExpenseAdded }) {
    const { currentUser } = useAuth();
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paidBy, setPaidBy] = useState(currentUser.uid);
    const [splitType, setSplitType] = useState('Equal'); // 'Equal' or 'Custom'

    // By default, everyone is selected for equal split
    const [selectedMembers, setSelectedMembers] = useState([...trip.members]);
    // Custom split amounts: userId -> amount
    const [customAmounts, setCustomAmounts] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (expenseToEdit) {
            setTitle(expenseToEdit.title);
            setAmount(expenseToEdit.amount);
            setDate(expenseToEdit.date);
            setPaidBy(expenseToEdit.paidBy);
            setSplitType(expenseToEdit.splitType);

            const selectedIds = expenseToEdit.splits.map(s => s.userId);
            setSelectedMembers(selectedIds);

            if (expenseToEdit.splitType === 'Custom') {
                const amountsMap = {};
                expenseToEdit.splits.forEach(s => {
                    amountsMap[s.userId] = s.amount;
                });
                setCustomAmounts(amountsMap);
            }
        }
    }, [expenseToEdit]);

    // Auto-calculate exact custom amounts when splitType is 'Equal'
    useEffect(() => {
        if (splitType === 'Equal' && Number(amount) > 0 && selectedMembers.length > 0) {
            const perPerson = Number(amount) / selectedMembers.length;
            const amounts = {};
            selectedMembers.forEach(id => {
                amounts[id] = perPerson;
            });
            setCustomAmounts(amounts);
        }
    }, [splitType, amount, selectedMembers]);

    const toggleMember = (userId) => {
        if (selectedMembers.includes(userId)) {
            setSelectedMembers(selectedMembers.filter(id => id !== userId));
            if (splitType === 'Custom') {
                const newAmounts = { ...customAmounts };
                delete newAmounts[userId];
                setCustomAmounts(newAmounts);
            }
        } else {
            setSelectedMembers([...selectedMembers, userId]);
            if (splitType === 'Custom') {
                setCustomAmounts({ ...customAmounts, [userId]: 0 });
            }
        }
    };

    const handleCustomAmountChange = (userId, val) => {
        setCustomAmounts({
            ...customAmounts,
            [userId]: Number(val)
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const expenseAmount = Number(amount);
        if (!expenseAmount || expenseAmount <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        if (selectedMembers.length === 0) {
            setError('Select at least one member to split the expense with.');
            return;
        }

        let splits = [];

        if (splitType === 'Equal') {
            const perPerson = expenseAmount / selectedMembers.length;
            splits = selectedMembers.map(id => ({ userId: id, amount: perPerson }));
        } else {
            let totalCustom = 0;
            splits = selectedMembers.map(id => {
                const amt = Number(customAmounts[id]) || 0;
                totalCustom += amt;
                return { userId: id, amount: amt };
            });

            if (Math.abs(totalCustom - expenseAmount) > 0.01) {
                setError(`Custom amounts sum to ₹${totalCustom.toFixed(2)}, but total expense is ₹${expenseAmount.toFixed(2)}.`);
                return;
            }
        }

        try {
            setLoading(true);
            const dataToSave = {
                title,
                amount: expenseAmount,
                date,
                paidBy,
                splitType,
                splits
            };

            if (expenseToEdit) {
                await updateExpense(trip.tripId, expenseToEdit.expenseId, dataToSave);
            } else {
                await createExpense(trip.tripId, dataToSave);
            }
            onExpenseAdded();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save expense.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="card w-full max-w-xl bg-surface relative shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-text-muted hover:text-text hover:bg-secondary rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-bold mb-6">{expenseToEdit ? 'Edit Expense' : 'Add an Expense'}</h2>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger border border-danger/20 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="label">Title</label>
                            <input
                                type="text"
                                required
                                className="input-field"
                                placeholder="e.g. Dinner at Cafe"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="label">Amount (₹)</label>
                            <input
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                className="input-field"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="label">Date</label>
                            <input
                                type="date"
                                required
                                className="input-field"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="label">Paid By</label>
                            <select
                                className="input-field"
                                value={paidBy}
                                onChange={(e) => setPaidBy(e.target.value)}
                            >
                                {trip.members.map(userId => {
                                    const isDummy = userId.includes('@') && !users[userId];
                                    const name = isDummy ? `${userId.split('@')[0]} (Invited)` : (users[userId]?.name || 'Unknown');
                                    const appendYou = userId === currentUser.uid ? ' (You)' : '';
                                    return (
                                        <option key={userId} value={userId}>
                                            {name}{appendYou}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-between mb-4">
                            <label className="label mb-0">Split Option</label>
                            <div className="flex bg-secondary p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setSplitType('Equal')}
                                    className={`px-4 py-1 text-sm rounded-md font-medium transition-colors ${splitType === 'Equal' ? 'bg-surface shadow-sm text-primary' : 'text-text-muted hover:text-text'
                                        }`}
                                >
                                    Equal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSplitType('Custom')}
                                    className={`px-4 py-1 text-sm rounded-md font-medium transition-colors ${splitType === 'Custom' ? 'bg-surface shadow-sm text-primary' : 'text-text-muted hover:text-text'
                                        }`}
                                >
                                    Custom
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {trip.members.map((userId) => {
                                const isSelected = selectedMembers.includes(userId);
                                const user = users[userId];

                                return (
                                    <div key={userId} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border border-border bg-surface">
                                        <div
                                            className="flex items-center gap-3 cursor-pointer select-none flex-1 mb-2 md:mb-0"
                                            onClick={() => toggleMember(userId)}
                                        >
                                            <div className={`w-5 h-5 rounded flex shrink-0 items-center justify-center border ${isSelected ? 'bg-primary border-primary text-white' : 'border-text-muted/50'
                                                }`}>
                                                {isSelected && <Check size={14} />}
                                            </div>
                                            <span className="font-medium text-sm">
                                                {user?.name || (userId.includes('@') ? `${userId.split('@')[0]} (Invited)` : 'Unknown')} {userId === currentUser.uid ? '(You)' : ''}
                                            </span>
                                        </div>

                                        {splitType === 'Custom' && isSelected && (
                                            <div className="flex items-center md:w-32">
                                                <span className="text-text-muted mr-2 text-sm">₹</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="input-field py-1 px-2 text-right"
                                                    placeholder="0.00"
                                                    value={customAmounts[userId] || ''}
                                                    onChange={(e) => handleCustomAmountChange(userId, e.target.value)}
                                                />
                                            </div>
                                        )}

                                        {splitType === 'Equal' && isSelected && (
                                            <span className="text-text-muted text-sm md:w-32 text-left md:text-right font-medium">
                                                ₹{((Number(amount) || 0) / selectedMembers.length).toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {splitType === 'Custom' && (
                            <div className="mt-3 text-right text-sm">
                                <span className="text-text-muted mr-2">Total separated:</span>
                                <span className={`font-bold ${Math.abs(selectedMembers.reduce((a, b) => a + (Number(customAmounts[b]) || 0), 0) - Number(amount)) > 0.01 ? 'text-danger' : 'text-success'}`}>
                                    ₹{selectedMembers.reduce((a, b) => a + (Number(customAmounts[b]) || 0), 0).toFixed(2)}
                                </span>
                                <span className="text-text-muted mx-1">/</span>
                                <span className="font-bold">₹{(Number(amount) || 0).toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary px-6"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary px-6"
                        >
                            {loading ? 'Saving...' : (expenseToEdit ? 'Update Expense' : 'Save Expense')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
