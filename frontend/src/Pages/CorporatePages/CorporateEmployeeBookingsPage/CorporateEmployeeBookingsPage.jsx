"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getCorporateOwnerBookings } from "../../../Redux/slices/bookingSlice";
import "./corporateemployeebookingspage.css";

const CorporateEmployeeBookingsPage = () => {
  const dispatch = useDispatch();
  const { corporateOwnerBookings, loading } = useSelector(
    (state) => state.booking,
  );
  const auth = useSelector((state) => state.auth);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    if (auth.user?.role === "CORPORATE") {
      dispatch(
        getCorporateOwnerBookings({
          status: filterStatus !== "all" ? filterStatus : undefined,
          date: filterDate || undefined,
        }),
      );
    }
  }, [dispatch, auth.user, filterStatus, filterDate]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      CONFIRMED: { color: "#28a745", label: "Confirmed" },
      COMPLETED: { color: "#17a2b8", label: "Completed" },
      CANCELLED: { color: "#dc3545", label: "Cancelled" },
    };
    return statusConfig[status] || { color: "#6c757d", label: status };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const groupedBookings = corporateOwnerBookings.reduce((acc, booking) => {
    const date = new Date(booking.travelDate).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(booking);
    return acc;
  }, {});

  const totalEmployees = corporateOwnerBookings.reduce(
    (sum, b) => sum + (b.numberOfSeats || 1),
    0,
  );

  return (
    <div className="corporate-bookings-page">

      <div className="bookings-container">
        <div className="bookings-header">
          <div className="header-content">
            <h1>Employee Bookings</h1>
            <p>View all bookings made by your employees</p>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <span className="stat-value">
                {corporateOwnerBookings.length}
              </span>
              <span className="stat-label">Total Bookings</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{totalEmployees}</span>
              <span className="stat-label">Total Employees</span>
            </div>
          </div>
        </div>

        <div className="filters-section">
          <div className="filter-group">
            <label>Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Bookings</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Filter by Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="filter-input"
            />
          </div>

          {filterDate && (
            <button
              className="clear-filter-btn"
              onClick={() => setFilterDate("")}
            >
              Clear Date
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading bookings...</p>
          </div>
        ) : corporateOwnerBookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No employee bookings found</p>
            <p className="empty-subtitle">
              Employee bookings will appear here when they book rides
            </p>
          </div>
        ) : (
          <div className="bookings-timeline">
            {Object.entries(groupedBookings).map(([date, bookings]) => (
              <div key={date} className="date-group">
                <div className="date-header">
                  <span className="date-label">{formatDate(date)}</span>
                  <span className="booking-count">
                    {bookings.length} booking{bookings.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="bookings-list">
                  {bookings.map((booking) => {
                    const statusConfig = getStatusBadge(booking.bookingStatus);
                    return (
                      <div key={booking._id} className="employee-booking-card">
                        <div className="booking-employee">
                          <div className="employee-avatar">
                            {booking.passengerId?.fullName?.charAt(0) || "E"}
                          </div>
                          <div className="employee-info">
                            <h4>
                              {booking.passengerId?.fullName || "Employee"}
                            </h4>
                            <p>
                              {booking.passengerId?.email ||
                                booking.passengerId?.whatsappNumber}
                            </p>
                          </div>
                          <span
                            className="status-badge"
                            style={{ backgroundColor: statusConfig.color }}
                          >
                            {statusConfig.label}
                          </span>
                        </div>

                        <div className="booking-route">
                          <div className="route-point">
                            <span className="point-icon pickup">●</span>
                            <span className="point-text">
                              {booking.pickupLocation}
                            </span>
                          </div>
                          <div className="route-line"></div>
                          <div className="route-point">
                            <span className="point-icon dropoff">●</span>
                            <span className="point-text">
                              {booking.dropoffLocation}
                            </span>
                          </div>
                        </div>

                        <div className="booking-meta">
                          <div className="meta-item">
                            <span className="meta-icon">👤</span>
                            <span>{booking.numberOfSeats} seat(s)</span>
                          </div>
                          <div className="meta-item">
                            <span className="meta-icon">🕐</span>
                            <span>{formatTime(booking.travelDate)}</span>
                          </div>
                          {booking.vehicleModel && (
                            <div className="meta-item">
                              <span className="meta-icon">🚌</span>
                              <span>{booking.vehicleModel}</span>
                            </div>
                          )}
                        </div>

                        {booking.passengerNotes && (
                          <div className="booking-notes">
                            <span className="notes-label">Notes:</span>
                            <p>{booking.passengerNotes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default CorporateEmployeeBookingsPage;
