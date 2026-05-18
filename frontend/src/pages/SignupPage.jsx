import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import GoogleButton from '../components/GoogleButton';
import PasswordToggleIcon from '../components/PasswordToggleIcon';
import { signUp } from 'aws-amplify/auth';

function getStrength(password) {
  return [
    password.length >= 8,
    /[a-zA-Z]/.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checks = getStrength(form.password);
  const strength = checks.filter(Boolean).length;

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!agreed) return setError('Please agree to the Terms and Privacy Policy.');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (strength < 4) return setError('Please choose a stronger password.');

    setLoading(true);
    try {
      await signUp({
        username: form.email,
        password: form.password,
        options: { userAttributes: { name: form.name, email: form.email } },
      });
      navigate('/verify', { state: { email: form.email } });
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2>Create Your Account</h2>
        <p className="auth-subtitle">Join the next generation of logistics management.</p>

          <GoogleButton />

        <div className="auth-divider"><span>OR</span></div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name" name="name" type="text"
              value={form.name} onChange={handleChange} required
            />
          </div>

          <div className="field-group">
            <label htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email"
              value={form.email} onChange={handleChange} required
            />
          </div>

          <div className="field-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrap">
              <input
                id="password" name="password"
                type={showPass ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={form.password} onChange={handleChange} required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password">
                <PasswordToggleIcon showPass={showPass} />
              </button>
            </div>

            {form.password && (
              <>
                <div className="strength-bar">
                  {[0,1,2,3].map((i) => (
                    <div key={i} className={`strength-seg${i < strength ? ' active' : ''}`} />
                  ))}
                </div>
                <div className="strength-hints">
                  {[
                    ['At least 8 characters', checks[0]],
                    ['Contains a letter', checks[1]],
                    ['Contains a number', checks[2]],
                    ['Contains a special character', checks[3]],
                  ].map(([label, met]) => (
                    <span key={label} className={`strength-hint${met ? ' met' : ''}`}>{label}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="field-group">
            <label htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm" name="confirm"
              type="password"
              placeholder="Re-enter password"
              value={form.confirm} onChange={handleChange} required
            />
          </div>

          <label className="checkbox-row">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              By creating an account you agree to our <a href="/terms">Terms and Privacy Policy</a>
          </label>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="auth-footer-link">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </AuthLayout>
  );
}