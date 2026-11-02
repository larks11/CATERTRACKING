import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ onNavigate }) {
  const { user, isAdmin, canRecordPayments, logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: '/', label: 'Dashboard', icon: 'bi-speedometer2', show: true },
    { to: '/customers', label: 'Customers', icon: 'bi-people', show: true },
    { to: '/packages', label: 'Packages', icon: 'bi-box-seam', show: true },
    { to: '/reservations', label: 'Reservations', icon: 'bi-journal-check', show: true },
    { to: '/schedule', label: 'Schedule', icon: 'bi-calendar-event', show: true },
    { to: '/payments', label: 'Payments', icon: 'bi-cash-coin', show: canRecordPayments },
    { to: '/tasks', label: 'Preparation', icon: 'bi-list-check', show: true },
    { to: '/reports', label: 'Reports', icon: 'bi-bar-chart-line', show: isAdmin },
    { to: '/users', label: 'Users', icon: 'bi-person-gear', show: isAdmin }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex align-items-center gap-2 mb-4 px-2">
        <i className="bi bi-egg-fried fs-4 text-warning"></i>
        <span className="fs-5 fw-semibold">CaterTrack</span>
      </div>

      <nav className="nav nav-pills flex-column gap-1 flex-grow-1">
        {links
          .filter((link) => link.show)
          .map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${isActive ? 'active' : 'text-white-50'}`
              }
            >
              <i className={`bi ${link.icon}`}></i>
              {link.label}
            </NavLink>
          ))}
      </nav>

      <div className="border-top border-secondary pt-3 mt-3">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            `d-block px-2 py-1 mb-2 rounded text-decoration-none ${isActive ? 'bg-secondary' : ''}`
          }
        >
          <div className="fw-semibold text-white text-truncate">{user?.name}</div>
          <small className="text-white-50 text-capitalize">{user?.role} - My profile</small>
        </NavLink>
        <button className="btn btn-outline-light btn-sm w-100" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right me-2"></i>
          Log out
        </button>
      </div>
    </div>
  );
}