import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';
import Sidebar from './Sidebar';

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="d-flex min-vh-100">
      <aside
        className="d-none d-lg-block bg-dark text-white p-3"
        style={{ width: 250, position: 'sticky', top: 0, height: '100vh' }}
      >
        <Sidebar />
      </aside>

      <Offcanvas
        show={open}
        onHide={() => setOpen(false)}
        className="bg-dark text-white"
        style={{ width: 250 }}
      >
        <Offcanvas.Body className="p-3">
          <Sidebar onNavigate={() => setOpen(false)} />
        </Offcanvas.Body>
      </Offcanvas>

      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <header className="d-lg-none bg-white border-bottom px-3 py-2 d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <i className="bi bi-list"></i>
          </button>
          <span className="fw-semibold">CaterTrack</span>
        </header>

        <main className="p-3 p-md-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}