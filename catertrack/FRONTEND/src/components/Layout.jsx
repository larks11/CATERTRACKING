import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';
import Sidebar from './Sidebar';

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="d-flex min-vh-100">
      <aside className="app-sidebar d-none d-lg-block p-3">
        <Sidebar />
      </aside>

      <Offcanvas show={open} onHide={() => setOpen(false)} className="app-sidebar">
        <Offcanvas.Body className="p-3">
          <Sidebar onNavigate={() => setOpen(false)} />
        </Offcanvas.Body>
      </Offcanvas>

      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <header className="mobile-bar d-lg-none px-3 py-2 d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <i className="bi bi-list"></i>
          </button>
          <div className="brand-mark" style={{ width: 32, height: 32, fontSize: '1rem' }}>
            <i className="bi bi-egg-fried"></i>
          </div>
          <span className="fw-bold">CaterTrack</span>
        </header>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}