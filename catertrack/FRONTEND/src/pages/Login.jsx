import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';

const highlights = [
  {
    icon: 'bi-journal-check',
    title: 'Reservations in one place',
    text: 'Record events, avoid double booking, and track every status.'
  },
  {
    icon: 'bi-cash-coin',
    title: 'Clear payment balances',
    text: 'See who has paid, who has a balance, and what is still due.'
  },
  {
    icon: 'bi-list-check',
    title: 'Event preparation tracking',
    text: 'Assign tasks to staff and watch the progress of each event.'
  }
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [businessName, setBusinessName] = useState('CaterTrack');

  useEffect(() => {
    api
      .get('/health')
      .then((res) => {
        if (res.data.businessName) setBusinessName(res.data.businessName);
      })
      .catch(() => {});
  }, []);

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(identifier, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="d-flex min-vh-100">
      <section className="login-hero d-none d-lg-flex">
        <div className="d-flex align-items-center gap-3 mb-5">
          <div className="brand-mark" style={{ width: 48, height: 48, fontSize: '1.5rem' }}>
            <i className="bi bi-egg-fried"></i>
          </div>
          <div className="fs-4 fw-bold">CaterTrack</div>
        </div>

        <h1 className="display-6 fw-bold mb-3" style={{ maxWidth: 480 }}>
          Run every event with confidence.
        </h1>
        <p className="mb-5 text-white-50" style={{ maxWidth: 460 }}>
          {businessName} manages customers, reservations, payments, and preparation tasks in a
          single system.
        </p>

        {highlights.map((item) => (
          <div className="hero-point" key={item.title}>
            <div className="icon">
              <i className={`bi ${item.icon}`}></i>
            </div>
            <div>
              <div className="fw-semibold">{item.title}</div>
              <div className="small text-white-50">{item.text}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="login-panel">
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div className="d-lg-none text-center mb-4">
            <div
              className="brand-mark mx-auto mb-2"
              style={{ width: 56, height: 56, fontSize: '1.75rem' }}
            >
              <i className="bi bi-egg-fried"></i>
            </div>
            <div className="fs-4 fw-bold">CaterTrack</div>
            <div className="text-muted small">{businessName}</div>
          </div>

          <h2 className="h3 mb-1">Welcome back</h2>
          <p className="text-muted mb-4">Sign in to continue to your dashboard.</p>

          {error && <div className="alert alert-danger py-2">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="identifier" className="form-label fw-medium">
                Username or email
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-person"></i>
                </span>
                <input
                  id="identifier"
                  type="text"
                  className="form-control form-control-lg"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="form-label fw-medium">
                Password
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control form-control-lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-100" disabled={submitting}>
              {submitting ? <Spinner animation="border" size="sm" /> : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-muted small mt-4 mb-0">
            Need an account? Ask your administrator.
          </p>
        </div>
      </section>
    </div>
  );
}