import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err) {
            setError('Failed to log in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                        <LogIn size={32} />
                    </div>
                    <h2 className="text-3xl font-bold">Welcome Back</h2>
                    <p className="text-text-muted mt-2">Sign in to continue splitting expenses</p>
                </div>

                {error && (
                    <div className="mb-4 p-4 rounded-lg bg-danger/10 text-danger border border-danger/20 flex items-start">
                        <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="label">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                            <input
                                type="email"
                                required
                                className="input-field pl-10"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                            <input
                                type="password"
                                required
                                className="input-field pl-10"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        className="btn btn-primary w-full py-3"
                        type="submit"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-text-muted">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-primary font-medium hover:text-primary-hover">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    );
}
