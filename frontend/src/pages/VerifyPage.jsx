import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import './VerifyPage.css';
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';

const CODE_LENGTH = 6;
const EXPIRY_SECONDS = 9 * 60 + 47;

export default function VerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || 'user@example.com';

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(EXPIRY_SECONDS);
  const inputRefs = useRef([]);

  // countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  function handleDigitChange(i, value) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    setError('');
    if (digit && i < CODE_LENGTH - 1) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  async function handleVerify() {
    const code = digits.join('');
    if (code.length < CODE_LENGTH) return setError('Please enter all 6 digits.');
    setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await resendSignUpCode({ username: email });
      setResent(true);
      setTimeLeft(EXPIRY_SECONDS);
      setDigits(Array(CODE_LENGTH).fill(''));
      setTimeout(() => setResent(false), 3000);
    } catch (err) {
      setError(err.message || 'Could not resend code.');
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card verify-card">
        <div className="verify-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>

        <h2>Verify your email</h2>
        <p className="auth-subtitle">
          We sent a 6-digit code to<br />
          <strong style={{ color: '#1a1a1a' }}>{email}</strong>
        </p>

        {error && <div className="auth-error">{error}</div>}
        {resent && <div className="auth-success">Code resent successfully!</div>}

        <div className="code-inputs" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              className="code-input"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
            />
          ))}
        </div>

        <p className="code-expiry">
          {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : 'Code expired — please resend'}
        </p>

        <button className="btn-primary" onClick={handleVerify} disabled={loading}>
          {loading ? 'Verifying...' : 'Verify account'}
        </button>

        <p className="auth-footer-link" style={{ marginTop: '14px' }}>
          Did not receive a code?{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); handleResend(); }}>Resend code</a>
        </p>

        <p className="auth-footer-link" style={{ marginTop: '6px' }}>
          <a href="/signup">Back to sign up</a>
        </p>
      </div>
    </AuthLayout>
  );
}