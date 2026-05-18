import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import GoogleButton from '../components/GoogleButton';
import PasswordToggleIcon from '../components/PasswordToggleIcon';
import { signIn } from 'aws-amplify/auth';

export default function LoginPage() {
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
    try {
      const { isSignedIn } = await signIn({ username: form.email, password: form.password });
      if (isSignedIn) navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Sign in failed. Please check your credentials.');
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
      </div>
    </AuthLayout>
  );
}