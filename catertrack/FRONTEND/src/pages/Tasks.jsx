import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Form, Modal, ProgressBar, Spinner } from 'react-bootstrap';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import {
  eventTypeLabel,
  formatEventDate,
  formatTime,
  toDateInput,
  toLocalDateInput
} from '../utils/format';
import { TASK_STATUSES, statusVariant, taskVariant } from '../utils/status';

const emptyForm = {
  reservation: '',
  title: '',
  assignedTo: '',
  dueDate: '',
  status: 'Pending'
};

export default function Tasks() {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState([]);

  const [statusFilter, setStatusFilter] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const today = toLocalDateInput(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.data);
    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;

    api
      .get('/reservations', { params: { limit: 500 } })
      .then((res) =>
        setReservations(
          res.data.data.filter((r) => r.status !== 'Completed' && r.status !== 'Cancelled')
        )
      )
      .catch((err) => showToast(getErrorMessage(err), 'danger'));

    api
      .get('/users')
      .then((res) => {
        const list = res.data.data || res.data.users || [];
        setUsers(Array.isArray(list) ? list.filter((u) => u.isActive !== false) : []);
      })
      .catch(() => showToast('Could not load the staff list', 'warning'));
  }, [isAdmin, showToast]);

  const groups = useMemo(() => {
    const map = new Map();

    tasks.forEach((task) => {
      const reservation = task.reservation;
      if (!reservation) return;
      if (!map.has(reservation._id)) {
        map.set(reservation._id, { reservation, tasks: [] });
      }
      map.get(reservation._id).tasks.push(task);
    });

    const filtersActive = Boolean(statusFilter) || mineOnly;

    return [...map.values()]
      .map((group) => {
        const completed = group.tasks.filter((t) => t.status === 'Completed').length;
        const visible = group.tasks.filter(
          (t) =>
            (!statusFilter || t.status === statusFilter) &&
            (!mineOnly || t.assignedTo?._id === user._id)
        );
        return {
          ...group,
          completed,
          percent: Math.round((completed / group.tasks.length) * 100),
          visible
        };
      })
      .filter((group) => {
        const closed =
          group.reservation.status === 'Completed' || group.reservation.status === 'Cancelled';
        if (closed && !showAll) return false;
        if (filtersActive && group.visible.length === 0) return false;
        return true;
      })
      .sort((a, b) => new Date(a.reservation.eventDate) - new Date(b.reservation.eventDate));
  }, [tasks, statusFilter, mineOnly, showAll, user._id]);

  const openAdd = (reservationId = '') => {
    const reservation = reservations.find((r) => r._id === reservationId);
    setEditing(null);
    setForm({
      ...emptyForm,
      reservation: reservationId,
      dueDate: reservation ? toDateInput(reservation.eventDate) : ''
    });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (task) => {
    setEditing(task);
    setForm({
      reservation: task.reservation?._id || '',
      title: task.title,
      assignedTo: task.assignedTo?._id || '',
      dueDate: toDateInput(task.dueDate),
      status: task.status
    });
    setFormError('');
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'reservation' && !editing) {
      const reservation = reservations.find((r) => r._id === value);
      setForm((prev) => ({
        ...prev,
        reservation: value,
        dueDate: prev.dueDate || (reservation ? toDateInput(reservation.eventDate) : '')
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      if (editing) {
        await api.put(`/tasks/${editing._id}`, {
          title: form.title,
          assignedTo: form.assignedTo,
          dueDate: form.dueDate,
          status: form.status
        });
        showToast('Task updated');
      } else {
        await api.post('/tasks', form);
        showToast('Task added');
      }
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (task, nextStatus) => {
    setUpdatingId(task._id);
    try {
      await api.patch(`/tasks/${task._id}/status`, { status: nextStatus });
      await load();
    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await api.delete(`/tasks/${deleteTarget._id}`);
      showToast(res.data.message || 'Task deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h3 mb-0">Event Preparation</h1>
        {isAdmin && (
          <Button onClick={() => openAdd()}>
            <i className="bi bi-plus-lg me-1"></i>
            Add task
          </Button>
        )}
      </div>

      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <Form.Select
          size="sm"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Form.Select>

        <Form.Check
          type="switch"
          id="mineOnly"
          label="My tasks"
          checked={mineOnly}
          onChange={(e) => setMineOnly(e.target.checked)}
        />

        <Form.Check
          type="switch"
          id="showAll"
          label="Include completed and cancelled events"
          checked={showAll}
          onChange={(e) => setShowAll(e.target.checked)}
        />
      </div>

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="alert alert-light border">
          No preparation tasks to show.
          {isAdmin && ' Use "Add task" to start a checklist for an event.'}
        </div>
      )}

      {!loading &&
        groups.map((group) => {
          const r = group.reservation;
          return (
            <div className="card border-0 shadow-sm mb-3" key={r._id}>
              <div className="card-body">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                  <div>
                    <h2 className="h5 mb-1">
                      {r.customer?.fullName || 'Customer'}
                      <span className="text-muted fw-normal">
                        {' '}
                        - {eventTypeLabel(r.eventType)}
                      </span>
                    </h2>
                    <div className="small text-muted">
                      {formatEventDate(r.eventDate)}, {formatTime(r.startTime)} at {r.venue}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge text-bg-${statusVariant[r.status]}`}>{r.status}</span>
                    {isAdmin && r.status !== 'Completed' && r.status !== 'Cancelled' && (
                      <Button size="sm" variant="outline-primary" onClick={() => openAdd(r._id)}>
                        <i className="bi bi-plus-lg me-1"></i>
                        Task
                      </Button>
                    )}
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 mb-3">
                  <ProgressBar
                    now={group.percent}
                    variant={group.percent === 100 ? 'success' : 'primary'}
                    className="flex-grow-1"
                    style={{ height: 10 }}
                  />
                  <small className="text-muted text-nowrap">
                    {group.completed}/{group.tasks.length} done ({group.percent}%)
                  </small>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Task</th>
                        <th>Assigned to</th>
                        <th>Due</th>
                        <th>Status</th>
                        {isAdmin && <th className="text-end">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {group.visible.map((task) => {
                        const overdue =
                          task.status !== 'Completed' && toDateInput(task.dueDate) < today;
                        return (
                          <tr key={task._id}>
                            <td className={task.status === 'Completed' ? 'text-decoration-line-through text-muted' : ''}>
                              {task.title}
                            </td>
                            <td>{task.assignedTo?.name || <span className="text-muted">Unassigned</span>}</td>
                            <td className="text-nowrap">
                              {formatEventDate(task.dueDate)}
                              {overdue && <span className="badge text-bg-danger ms-2">Overdue</span>}
                            </td>
                            <td>
                              <Form.Select
                                size="sm"
                                value={task.status}
                                disabled={updatingId === task._id}
                                onChange={(e) => changeStatus(task, e.target.value)}
                                className={`border-${taskVariant[task.status]}`}
                                style={{ minWidth: 130 }}
                                aria-label="Change task status"
                              >
                                {TASK_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </Form.Select>
                            </td>
                            {isAdmin && (
                              <td className="text-end text-nowrap">
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  className="me-1"
                                  onClick={() => openEdit(task)}
                                  aria-label="Edit task"
                                >
                                  <i className="bi bi-pencil"></i>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  onClick={() => setDeleteTarget(task)}
                                  aria-label="Delete task"
                                >
                                  <i className="bi bi-trash"></i>
                                </Button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}

      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title className="h5">{editing ? 'Edit task' : 'Add task'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && <div className="alert alert-danger py-2">{formError}</div>}

            <Form.Group className="mb-3" controlId="reservation">
              <Form.Label>Reservation</Form.Label>
              <Form.Select
                name="reservation"
                value={form.reservation}
                onChange={handleChange}
                disabled={Boolean(editing)}
                required
              >
                <option value="">Select reservation</option>
                {editing && editing.reservation && (
                  <option value={editing.reservation._id}>
                    {editing.reservation.customer?.fullName} -{' '}
                    {formatEventDate(editing.reservation.eventDate)}
                  </option>
                )}
                {!editing &&
                  reservations.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.customer?.fullName} - {eventTypeLabel(r.eventType)} -{' '}
                      {formatEventDate(r.eventDate)}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="title">
              <Form.Label>Task</Form.Label>
              <Form.Control
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Example: Buy ingredients"
                required
              />
            </Form.Group>

            <div className="row">
              <Form.Group className="mb-3 col-md-6" controlId="assignedTo">
                <Form.Label>Assigned to</Form.Label>
                <Form.Select name="assignedTo" value={form.assignedTo} onChange={handleChange}>
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3 col-md-6" controlId="dueDate">
                <Form.Label>Due date</Form.Label>
                <Form.Control
                  type="date"
                  name="dueDate"
                  value={form.dueDate}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </div>

            <Form.Group controlId="status">
              <Form.Label>Status</Form.Label>
              <Form.Select name="status" value={form.status} onChange={handleChange}>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              onClick={() => setShowForm(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner animation="border" size="sm" /> : 'Save'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmModal
        show={Boolean(deleteTarget)}
        title="Delete task"
        message={`Delete the task "${deleteTarget?.title}"?`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}