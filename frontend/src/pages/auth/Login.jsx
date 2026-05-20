import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import GoogleButton from "../../components/GoogleButton";
import PasswordToggleIcon from "../../components/PasswordToggleIcon";
import useAuthStore from '../../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Establish the correct endpoint base URL
      const API_BASE = import.meta.env.VITE_API_URL || 'https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod';

      // Hit your custom unified backend login controller
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const data = await res.json();

      // Handle application/controller level errors smoothly
      if (!res.ok) {
        throw new Error(data.message || 'Sign in failed. Please check your credentials.');
      }

      // Sync your global Zustand store with data returned from your backend
      useAuthStore.getState().setUser({
        id: data.data.user.id,
        name: data.data.user.name,
        email: data.data.user.email,
      });
      useAuthStore.getState().setRole(data.data.user.role);
      useAuthStore.getState().setToken(data.data.idToken);

      console.log('Successfully logged in! Role assigned:', data.data.user.role);
      
      // Redirect to the appropriate dashboard home
      navigate(useAuthStore.getState().getDashboardPath());

    } catch (err) {
      console.error('Login Interaction Error:', err);
      setError(err.message || 'An unexpected connection error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2>Welcome back</h2>
        <p className="auth-subtitle">Sign in to your fleet dashboard</p>

        <GoogleButton />

        <div className="auth-divider"><span>OR</span></div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email" name="email" type="email"
              placeholder="manager@fleet.com"
              value={form.email} onChange={handleChange} required
            />
          </div>

          <div className="field-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrap">
              <input
                id="password" name="password"
                type={showPass ? 'text' : 'password'}
                value={form.password} onChange={handleChange} required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password">
                <PasswordToggleIcon showPass={showPass} />
              </button>
            </div>
          </div>

          <div className="space-between" style={{ marginBottom: '18px' }}>
            <label className="checkbox-row" style={{ margin: 0 }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <a href="/forgot-password">Forgot password?</a>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in to dashboard'}
          </button>
        </form>

        <p className="auth-footer-link">
          No account yet? <a href="/signup">Create one</a>
        </p>
    <AuthLayout>
      <div className="auth-card">
        <h2>Welcome back</h2>
        <p className="auth-subtitle">Sign in to your fleet dashboard</p>

        <GoogleButton />

        <div className="auth-divider"><span>OR</span></div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email" name="email" type="email"
              placeholder="manager@fleet.com"
              value={form.email} onChange={handleChange} required
            />
          </div>

          <div className="field-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrap">
              <input
                id="password" name="password"
                type={showPass ? 'text' : 'password'}
                value={form.password} onChange={handleChange} required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password">
                <PasswordToggleIcon showPass={showPass} />
              </button>
            </div>
          </div>

          <div className="space-between" style={{ marginBottom: '18px' }}>
            <label className="checkbox-row" style={{ margin: 0 }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <a href="/forgot-password">Forgot password?</a>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in to dashboard'}
          </button>
        </form>

        <p className="auth-footer-link">
          No account yet? <a href="/signup">Create one</a>
        </p>
      </div>
    </AuthLayout>
  );
    </AuthLayout>
  );
}