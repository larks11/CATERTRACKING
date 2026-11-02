import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { eventTypeLabel, formatCurrency, formatEventDate, formatTime } from '../utils/format';
import { statusVariant } from '../utils/status';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const { user, canRecordPayments } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api
      .get('/dashboard/stats')
      .then((res) => {
        if (active) setStats(res.data.data);
      })
      .catch((err) => showToast(getErrorMessage(err), 'danger'))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [showToast]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div>
        <h1 className="h3 mb-3">Dashboard</h1>
        <div className="alert alert-warning">The dashboard data could not be loaded.</div>
      </div>
    );
  }

  const cards = [
    {
      label: 'Upcoming events',
      value: stats.cards.upcomingEvents,
      icon: 'bi-calendar-event',
      color: 'primary',
      to: '/schedule'
    },
    {
      label: 'Pending reservations',
      value: stats.cards.pendingReservations,
      icon: 'bi-hourglass-split',
      color: 'warning',
      to: '/reservations'
    },
    {
      label: 'Tasks in progress',
      value: stats.cards.inProgressTasks,
      icon: 'bi-list-check',
      color: 'info',
      to: '/tasks'
    }
  ];

  if (canRecordPayments) {
    cards.push({
      label: 'Unpaid balance',
      value: formatCurrency(stats.cards.unpaidBalance),
      icon: 'bi-cash-coin',
      color: 'danger',
      to: '/payments'
    });
  }

  const { labels, revenueData, reservationCountData } = stats.chartData;

  const datasets = [];
  if (canRecordPayments) {
    datasets.push({
      type: 'bar',
      label: 'Payments collected (PHP)',
      data: revenueData,
      backgroundColor: 'rgba(13, 110, 253, 0.6)',
      yAxisID: 'y',
      order: 2
    });
  }
  datasets.push({
    type: 'line',
    label: 'Reservations',
    data: reservationCountData,
    borderColor: '#fd7e14',
    backgroundColor: '#fd7e14',
    tension: 0.3,
    yAxisID: 'y1',
    order: 1
  });

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { display: canRecordPayments, beginAtZero: true, position: 'left' },
      y1: {
        beginAtZero: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { precision: 0 }
      }
    }
  };

  return (
    <div>
      <div className="mb-3">
        <h1 className="h3 mb-1">Dashboard</h1>
        <p className="text-muted mb-0">Welcome, {user?.name}.</p>
      </div>

      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div className="col-12 col-sm-6 col-xl-3" key={card.label}>
            <Link to={card.to} className="text-decoration-none text-reset">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex align-items-center gap-3">
                  <div
                    className={`rounded-circle bg-${card.color}-subtle text-${card.color} d-flex align-items-center justify-content-center`}
                    style={{ width: 48, height: 48 }}
                  >
                    <i className={`bi ${card.icon} fs-4`}></i>
                  </div>
                  <div>
                    <div className="text-muted small">{card.label}</div>
                    <div className="fs-4 fw-semibold">{card.value}</div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 mb-3">This year, by month</h2>
              <div style={{ height: 320 }}>
                <Chart type="bar" data={{ labels, datasets }} options={options} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h6 mb-0">Next events</h2>
                <Link to="/schedule" className="small">
                  View schedule
                </Link>
              </div>

              {stats.upcomingEventsList.length === 0 && (
                <p className="text-muted mb-0">No upcoming events.</p>
              )}

              <div className="list-group list-group-flush">
                {stats.upcomingEventsList.map((event) => (
                  <div className="list-group-item px-0" key={event._id}>
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <div className="fw-semibold">
                          {event.customer?.fullName || 'Customer'}
                        </div>
                        <div className="small text-muted">
                          {eventTypeLabel(event.eventType)} at {event.venue}
                        </div>
                        <div className="small">
                          {formatEventDate(event.eventDate)}, {formatTime(event.startTime)}
                        </div>
                      </div>
                      <span className={`badge text-bg-${statusVariant[event.status]}`}>
                        {event.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}