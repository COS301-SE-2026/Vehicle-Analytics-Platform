import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import useAuthStore from '../../store/authStore';

const API_BASE = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api`;

export default function DemoLogin() {
  const { role } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const attempted = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const code = searchParams.get('code');
    if (!code || !['viewer', 'manager'].includes(role)) {
      setError('This demo link is invalid.');
      return;
    }

    fetch(`${API_BASE}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, role }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || data.message || 'Demo sign in failed.');
        return data.data;
      })
      .then((data) => {
        useAuthStore.getState().setUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
        });
        useAuthStore.getState().setRole(data.user.role);
        useAuthStore.getState().setToken(data.idToken);
        window.history.replaceState({}, '', `/demo/${role}`);
        navigate(useAuthStore.getState().getDashboardPath(), { replace: true });
      })
      .catch((err) => setError(err.message || 'Demo sign in failed.'))
  }, [navigate, role, searchParams]);

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2>{error ? 'Demo access unavailable' : 'Opening demo dashboard...'}</h2>
        <p className="auth-subtitle">
          {error || 'Please wait while we sign you in.'}
        </p>
        {error && <a className="btn-primary" href="/login">Sign in normally</a>}
      </div>
    </AuthLayout>
  );
}
