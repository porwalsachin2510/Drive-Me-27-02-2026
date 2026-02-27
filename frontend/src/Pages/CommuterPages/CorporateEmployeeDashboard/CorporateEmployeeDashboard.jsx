import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Navbar from "../../../Components/Navbar/Navbar";
import Footer from "../../../Components/Footer/Footer";
import api from "../../../utils/api";
import "./corporateemployeedashboard.css";
import io from "socket.io-client";
import {
  fetchEmployeeTrips,
  fetchAssignedRoute,
  fetchNoShowHistory,
  fetchNotifications,
  setDriverLocation,
  addNotification,
  updateTripStatus,
  selectEmployeeTrips,
  selectTripsLoading,
  selectTripsError,
  selectAssignedRoute,
  selectNotifications,
  selectNoShowHistory,
  selectDriverLocation
} from "../../../Redux/slices/corporateEmployeeSlice";

export default function CorporateEmployeeDashboard() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const userId = useSelector((state) => state.auth.userId);

  // Redux selectors
  const todayTrips = useSelector(selectEmployeeTrips);
  const tripsLoading = useSelector(selectTripsLoading);
  const tripsError = useSelector(selectTripsError);
  const assignedBus = useSelector(selectAssignedRoute);
  const notifications = useSelector(selectNotifications);
  const noShowHistory = useSelector(selectNoShowHistory);
  const driverLocation = useSelector(selectDriverLocation);

  const [activeTab, setActiveTab] = useState("corporate");
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("trip-info");
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);

  

  const fetchEmployeeDashboardData = async () => {
    try {
      setError(null);

      // Get today's date for API calls
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];

      // Dispatch Redux actions to fetch all data
      await Promise.all([
        dispatch(fetchEmployeeTrips({ employeeId: userId, date: dateStr })),
        dispatch(fetchAssignedRoute(userId)),
        dispatch(fetchNoShowHistory()),
        dispatch(fetchNotifications(userId))
      ]);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please try again.");
      setLoading(false);
    }
  };

  const subscribeToRealTimeUpdates = () => {
    try {
      const backendURL =
        process.env.REACT_APP_API_URL || "http://localhost:3000";
      const newSocket = io(backendURL, {
        auth: { token },
      });

      newSocket.on("connect", () => {
        console.log("Connected to socket server");
        newSocket.emit("join-notification-room", userId);
      });

      newSocket.on("location-update", (locationData) => {
        console.log("Received driver location update:", locationData);
        dispatch(setDriverLocation(locationData));
      });

      newSocket.on("trip-update", (tripData) => {
        console.log("Trip update received:", tripData);
        dispatch(updateTripStatus({ tripId: tripData.tripId, status: tripData.status }));
      });

      newSocket.on("notification", (notificationData) => {
        console.log("Received notification:", notificationData);
        dispatch(addNotification(notificationData));
      });

      newSocket.on("error", (error) => {
        console.error("Socket error:", error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } catch (error) {
      console.error("Error setting up socket connection:", error);
    }
    };
    
    useEffect(() => {
      if (token && userId) {
        fetchEmployeeDashboardData();
        subscribeToRealTimeUpdates();
      }
      return () => {
        if (socket) socket.disconnect();
      };
    }, [token, userId]);

  const handleBookTrip = async (tripId) => {
    try {
      // For corporate trips, employees are pre-assigned by the corporate admin
      // This is a confirmation/check-in action
      alert("Trip is already assigned to you. Please check in 15 minutes before departure.");
      fetchEmployeeDashboardData();
    } catch (error) {
      console.error("Error handling trip:", error);
    }
  };

  const handleCancelBooking = async (tripId) => {
    if (window.confirm("Are you sure you want to cancel this trip assignment?")) {
      try {
        // Cancel booking through trip endpoint
        const response = await api.delete(`/trips/${tripId}/cancel`);
        if (response.data.success) {
          alert("Trip assignment cancelled successfully!");
          fetchEmployeeDashboardData();
        } else {
          alert(response.data.message || "Failed to cancel trip");
        }
      } catch (error) {
        console.error("Error cancelling trip:", error);
        alert(
          `Error cancelling trip: ${error.response?.data?.message || error.message}`,
        );
      }
    }
  };

  return (
    <div className="corporate-employee-dashboard">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="employee-dashboard-container">
        <div className="employee-dashboard-header">
          <h1>My Daily Commute</h1>
          <p>Stay updated with your assigned bus and bookings</p>
        </div>

        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={fetchEmployeeDashboardData}>Retry</button>
          </div>
        )}

        {loading || tripsLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading your dashboard...</p>
          </div>
        ) : (
          <div className="employee-dashboard-content">
            <div className="dashboard-tabs">
              <button
                className={`tab-btn ${activeSection === "trip-info" ? "active" : ""}`}
                onClick={() => setActiveSection("trip-info")}
              >
                Trip Info
              </button>
              <button
                className={`tab-btn ${activeSection === "bookings" ? "active" : ""}`}
                onClick={() => setActiveSection("bookings")}
              >
                My Bookings
              </button>
              <button
                className={`tab-btn ${activeSection === "history" ? "active" : ""}`}
                onClick={() => setActiveSection("history")}
              >
                History
              </button>
              <button
                className={`tab-btn ${activeSection === "notifications" ? "active" : ""}`}
                onClick={() => setActiveSection("notifications")}
              >
                Notifications
              </button>
            </div>

            {/* Assigned Bus Card */}
            {activeSection === "trip-info" && (
              <div className="section-content">
                <div className="assigned-bus-card">
                  <h2>Your Assigned Bus Route</h2>
                  {assignedBus ? (
                    <div className="bus-details">
                      <div className="route-info">
                        <div className="route-item">
                          <label>From:</label>
                          <span>
                            {assignedBus?.fromLocation || "Loading..."}
                          </span>
                        </div>
                        <div className="route-item">
                          <label>To:</label>
                          <span>{assignedBus?.toLocation || "Loading..."}</span>
                        </div>
                        <div className="route-item">
                          <label>Distance:</label>
                          <span>{assignedBus?.totalDistance || "N/A"} km</span>
                        </div>
                        <div className="route-item">
                          <label>Estimated Duration:</label>
                          <span>
                            {assignedBus?.estimatedDuration || "N/A"} mins
                          </span>
                        </div>
                      </div>

                      <div className="driver-info">
                        <h3>Driver Information</h3>
                        <div className="driver-details">
                          <p>
                            <strong>Name:</strong>{" "}
                            {assignedBus?.driverName || "To be assigned"}
                          </p>
                          <p>
                            <strong>Phone:</strong>{" "}
                            {assignedBus?.driverPhone || "N/A"}
                          </p>
                          <p>
                            <strong>License:</strong>{" "}
                            {assignedBus?.driverLicense || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="vehicle-info">
                        <h3>Vehicle Information</h3>
                        <div className="vehicle-details">
                          <p>
                            <strong>Type:</strong>{" "}
                            {assignedBus?.vehicleType || "N/A"}
                          </p>
                          <p>
                            <strong>License Plate:</strong>{" "}
                            {assignedBus?.licensePlate || "N/A"}
                          </p>
                          <p>
                            <strong>Capacity:</strong>{" "}
                            {assignedBus?.totalSeats || "N/A"} seats
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="no-bus-assigned">
                      <p>
                        No bus route assigned yet. Please contact your manager.
                      </p>
                    </div>
                  )}
                </div>

                <div className="today-trips-card">
                  <h2>Your Assigned Trips Today</h2>
                  {todayTrips.length > 0 ? (
                    <div className="trips-list">
                      {todayTrips.map((trip) => (
                        <div key={trip._id} className="trip-item">
                          <div className="trip-timing">
                            <span className="trip-time">{trip.startTime}</span>
                            <span className="trip-route">
                              {trip.fromLocation} → {trip.toLocation}
                            </span>
                            {trip.currentLocation && (
                              <span className="trip-location">
                                Driver Location: {trip.currentLocation.lat?.toFixed(2)}, {trip.currentLocation.lng?.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div className="trip-details">
                            <span>Status: <strong>{trip.status}</strong></span>
                            <span>Pickup: {trip.pickupPoint || trip.fromLocation}</span>
                            {trip.driverInfo && (
                              <span>Driver: {trip.driverInfo.name}</span>
                            )}
                          </div>
                          <button
                            className="book-btn"
                            onClick={() => handleBookTrip(trip._id)}
                          >
                            Check In
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-trips">
                      <p>No trips assigned for today</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* My Bookings */}
            {activeSection === "bookings" && (
              <div className="section-content">
                <div className="bookings-card">
                  <h2>My Upcoming Bookings</h2>
                  {upcomingTrips.length > 0 ? (
                    <div className="bookings-list">
                      {upcomingTrips.map((booking) => (
                        <div key={booking._id} className="booking-item">
                          <div className="booking-date">
                            {new Date(booking.tripDate).toLocaleDateString()}
                          </div>
                          <div className="booking-info">
                            <span className="booking-time">
                              {booking.startTime}
                            </span>
                            <span className="booking-route">
                              {booking.fromLocation} → {booking.toLocation}
                            </span>
                          </div>
                          <div className="booking-seat">
                            <span>Seat: {booking.myBooking?.seatNumber}</span>
                          </div>
                          <div className="booking-status">
                            <span
                              className={`status-badge ${booking.status?.toLowerCase()}`}
                            >
                              {booking.status}
                            </span>
                          </div>
                          <button
                            className="cancel-btn"
                            onClick={() => handleCancelBooking(booking._id)}
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-bookings">
                      <p>You don't have any upcoming bookings</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No-Show History */}
            {activeSection === "history" && (
              <div className="section-content">
                <div className="history-card">
                  <h2>No-Show History</h2>
                  {noShowHistory.length > 0 ? (
                    <div className="history-list">
                      {noShowHistory.map((noShow) => (
                        <div key={noShow._id} className="history-item">
                          <div className="history-date">
                            {new Date(noShow.date).toLocaleDateString()}
                          </div>
                          <div className="history-info">
                            <span>{noShow.message}</span>
                          </div>
                          <div className="history-reason">
                            <span>
                              Reason: {noShow.reason || "Not specified"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-history">
                      <p>Great! No no-show records</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeSection === "notifications" && (
              <div className="section-content">
                <div className="notifications-card">
                  <h2>Recent Notifications</h2>
                  {notifications.length > 0 ? (
                    <div className="notifications-list">
                      {notifications.map((notif) => (
                        <div key={notif._id} className="notification-item">
                          <div className="notification-type">
                            <span
                              className={`type-badge ${notif.type?.toLowerCase()}`}
                            >
                              {notif.type}
                            </span>
                          </div>
                          <div className="notification-content">
                            <h4>{notif.title}</h4>
                            <p>{notif.message}</p>
                          </div>
                          <div className="notification-time">
                            {new Date(notif.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-notifications">
                      <p>No notifications yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
