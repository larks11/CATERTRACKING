import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ onNavigate }) {
  const { user, isAdmin, canRecordPayments, logout } = useAuth();
  const navigate = useNavigate();

  const groups = [
    {
      label: 'Overview',
      links: [{ to: '/', label: 'Dashboard', icon: 'bi-speedometer2', show: true }]
    },
    {
      label: 'Operations',
      links: [
        { to: '/reservations', label: 'Reservations', icon: 'bi-journal-check', show: true },
        { to: '/schedule', label: 'Schedule', icon: 'bi-calendar-event', show: true },
        { to: '/tasks', label: 'Preparation', icon: 'bi-list-check', show: true },
        { to: '/customers', label: 'Customers', icon: 'bi-people', show: true },
        { to: '/packages', label: 'Packages', icon: 'bi-box-seam', show: true }
      ]
    },
    {
      label: 'Finance',
      links: [{ to: '/payments', label: 'Payments', icon: 'bi-cash-coin', show: canRecordPayments }]
    },
    {
      label: 'Administration',
      links: [
        { to: '/reports', label: 'Reports', icon: 'bi-bar-chart-line', show: isAdmin },
        { to: '/users', label: 'Users', icon: 'bi-person-gear', show: isAdmin }
      ]
    }
  ];

  const initials = (user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex align-items-center gap-2 px-2 mb-3">
        <div className="brand-mark">
          <i className="bi bi-egg-fried"></i>
        </div>
        <div>
          <div className="fs-5 fw-bold lh-1">CaterTrack</div>
          <small className="text-white-50">Catering management</small>
        </div>
      </div>

      <nav className="flex-grow-1 overflow-auto">
        {groups.map((group) => {
          const visible = group.links.filter((link) => link.show);
          if (visible.length === 0) return null;

          return (
            <div key={group.label}>
              <div className="side-label">{group.label}</div>
              {visible.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
                >
                  <i className={`bi ${link.icon}`}></i>
                  {link.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="border-top border-secondary border-opacity-50 pt-3 mt-3">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) => `side-user mb-2 ${isActive ? 'active' : ''}`}
        >
          <div className="avatar">{initials}</div>
          <div className="overflow-hidden">
            <div className="fw-semibold text-truncate">{user?.name}</div>
            <small className="text-white-50 text-capitalize">{user?.role} · My profile</small>
          </div>
        </NavLink>

        <button className="btn btn-outline-light btn-sm w-100" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right me-2"></i>
          Log out
        </button>
      </div>
    </div>
  );
}