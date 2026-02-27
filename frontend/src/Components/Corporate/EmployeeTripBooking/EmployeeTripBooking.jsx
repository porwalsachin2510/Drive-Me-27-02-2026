import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../../../utils/api";
import "./EmployeeTripBooking.css";

function EmployeeTripBooking() {
  const user = useSelector((state) => state.auth.user);
  const [trips, setTrips] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [monthlyPasses, setMonthlyPasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("available");
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [routeId, setRouteId] = useState(localStorage.getItem('routeId') || '');
  const [bookingData, setBookingData] = useState({
    pickupPoint: "",
    pickupTime: "",
    seatNumber: 1,
    useMonthlyPass: false
  });

  // Fetch the employee's assigned route to get routeId on mount
  useEffect(() => {
    const fetchEmployeeRoute = async () => {
      try {
        const response = await api.get("/corporate-employee-users/route");
        if (response.data?.data?.route?._id) {
          const id = response.data.data.route._id;
          setRouteId(id);
          localStorage.setItem('routeId', id);
        }
      } catch (err) {
        console.error("Error fetching employee route:", err);
      }
    };

    if (!routeId) {
      fetchEmployeeRoute();
    }
  }, []);

  useEffect(() => {
    if (activeTab === "available") {
      fetchAvailableTrips();
    } else if (activeTab === "my-bookings") {
      fetchMyBookings();
    } else if (activeTab === "monthly-pass") {
      fetchMonthlyPasses();
    }
  }, [activeTab, routeId]);

  const fetchAvailableTrips = async () => {
    try {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      
      // Only call if routeId is available - backend requires it
      if (!routeId) {
        setTrips([]);
        return;
      }
      
      const response = await api.get("/b2c-trips/trips/available", {
        params: {
          routeId,
          date: today
        }
      });
      setTrips(response.data.data?.trips || response.data.trips || []);
    } catch (error) {
      console.error("Error fetching trips:", error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/b2c-trips/bookings");
      const data = response.data.data?.bookings || response.data.bookings || response.data.data || [];
      setMyBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setMyBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyPasses = async () => {
    try {
      setLoading(true);
      // Backend route is /monthly-pass/user/:userId
      const userId = user?._id || user?.id;
      if (!userId) {
        setMonthlyPasses([]);
        return;
      }
      const response = await api.get(`/monthly-pass/user/${userId}`);
      const data = response.data.data?.passes || response.data.passes || response.data.data || [];
      setMonthlyPasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching monthly passes:", error);
      setMonthlyPasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookTrip = (trip) => {
    setSelectedTrip(trip);
    setBookingData({
      pickupPoint: "",
      pickupTime: "",
      seatNumber: 1,
      useMonthlyPass: false
    });
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post(`/trips/${selectedTrip._id}/book`, bookingData);
      setShowBookingModal(false);
      fetchMyBookings();
      alert("Seat booked successfully!");
    } catch (error) {
      console.error("Error booking seat:", error);
      alert(error.response?.data?.message || "Failed to book seat");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (tripId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    try {
      await api.delete(`/trips/${tripId}/cancel`);
      fetchMyBookings();
      alert("Booking cancelled successfully!");
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Failed to cancel booking");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "SCHEDULED": return "#10b981";
      case "IN_PROGRESS": return "#3b82f6";
      case "COMPLETED": return "#6b7280";
      case "CANCELLED": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getPassStatusColor = (status) => {
    switch (status) {
      case "ACTIVE": return "#10b981";
      case "EXPIRED": return "#ef4444";
      case "SUSPENDED": return "#f59e0b";
      case "CANCELLED": return "#6b7280";
      default: return "#6b7280";
    }
  };

  return (
    <div className="employee-trip-booking">
      <div className="booking-header">
        <h2>Trip Booking</h2>
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === "available" ? "active" : ""}`}
            onClick={() => setActiveTab("available")}
          >
            Available Trips
          </button>
          <button
            className={`tab-btn ${activeTab === "my-bookings" ? "active" : ""}`}
            onClick={() => setActiveTab("my-bookings")}
          >
            My Bookings
          </button>
          <button
            className={`tab-btn ${activeTab === "monthly-pass" ? "active" : ""}`}
            onClick={() => setActiveTab("monthly-pass")}
          >
            Monthly Pass
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="tab-content">
          {activeTab === "available" && (
            <div className="available-trips">
              {trips.length === 0 ? (
                <div className="no-data">
                  <p>No available trips found.</p>
                </div>
              ) : (
                <div className="trips-grid">
                  {trips.map((trip) => (
                    <div key={trip._id} className="trip-card">
                      <div className="trip-route">
                        <h3>{trip.fromLocation} → {trip.toLocation}</h3>
                        <span 
                          className="trip-status"
                          style={{ backgroundColor: getStatusColor(trip.status) }}
                        >
                          {trip.status}
                        </span>
                      </div>
                      
                      <div className="trip-info">
                        <p><strong>Date:</strong> {formatDate(trip.tripDate)}</p>
                        <p><strong>Time:</strong> {trip.startTime} - {trip.endTime}</p>
                        <p><strong>Duration:</strong> {trip.estimatedDuration}</p>
                        <p><strong>Vehicle:</strong> {trip.vehicleId?.make} {trip.vehicleId?.model}</p>
                        <p><strong>Driver:</strong> {trip.driverId?.fullName}</p>
                      </div>

                      <div className="trip-seats">
                        <div className="seats-info">
                          <span className="available-seats">{trip.availableSeats}</span>
                          <span className="total-seats">/ {trip.totalSeats} seats</span>
                        </div>
                        <div className="seats-progress">
                          <div 
                            className="seats-progress-bar"
                            style={{ 
                              width: `${((trip.totalSeats - trip.availableSeats) / trip.totalSeats) * 100}%` 
                            }}
                          />
                        </div>
                      </div>

                      <div className="trip-route-stops">
                        <h4>Stop Points</h4>
                        <div className="stops-list">
                          {trip.routeId?.stopPoints?.slice(0, 3).map((stop, index) => (
                            <div key={index} className="stop-item">
                              <span className="stop-location">{stop.location}</span>
                              <span className="stop-time">{stop.time}</span>
                            </div>
                          ))}
                          {trip.routeId?.stopPoints?.length > 3 && (
                            <span className="more-stops">
                              +{trip.routeId.stopPoints.length - 3} more stops
                            </span>
                          )}
                        </div>
                      </div>

                      <button 
                        className="book-btn"
                        onClick={() => handleBookTrip(trip)}
                        disabled={trip.availableSeats === 0}
                      >
                        {trip.availableSeats === 0 ? "Full" : "Book Seat"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "my-bookings" && (
            <div className="my-bookings">
              {myBookings.length === 0 ? (
                <div className="no-data">
                  <p>You haven't booked any trips yet.</p>
                </div>
              ) : (
                <div className="bookings-grid">
                  {myBookings.map((booking) => (
                    <div key={booking._id} className="booking-card">
                      <div className="booking-route">
                        <h3>{booking.fromLocation} → {booking.toLocation}</h3>
                        <span 
                          className="booking-status"
                          style={{ backgroundColor: getStatusColor(booking.status) }}
                        >
                          {booking.status}
                        </span>
                      </div>
                      
                      <div className="booking-details">
                        <p><strong>Date:</strong> {formatDate(booking.tripDate)}</p>
                        <p><strong>Time:</strong> {booking.startTime} - {booking.endTime}</p>
                        <p><strong>Seat:</strong> {booking.myBooking?.seatNumber}</p>
                        <p><strong>Pickup:</strong> {booking.myBooking?.pickupPoint}</p>
                        <p><strong>Pickup Time:</strong> {booking.myBooking?.pickupTime}</p>
                        {booking.myBooking?.monthlyPass && (
                          <p><strong>Payment:</strong> Monthly Pass</p>
                        )}
                      </div>

                      <div className="booking-actions">
                        {booking.status === "SCHEDULED" && (
                          <button 
                            className="cancel-btn"
                            onClick={() => handleCancelBooking(booking._id)}
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "monthly-pass" && (
            <div className="monthly-passes">
              {monthlyPasses.length === 0 ? (
                <div className="no-data">
                  <p>No monthly passes found. Contact your corporate admin for a pass.</p>
                </div>
              ) : (
                <div className="passes-grid">
                  {monthlyPasses.map((pass) => (
                    <div key={pass._id} className="pass-card">
                      <div className="pass-header">
                        <h3>{pass.routeId?.fromLocation} → {pass.routeId?.toLocation}</h3>
                        <span 
                          className="pass-status"
                          style={{ backgroundColor: getPassStatusColor(pass.status) }}
                        >
                          {pass.status}
                        </span>
                      </div>
                      
                      <div className="pass-details">
                        <p><strong>Valid From:</strong> {new Date(pass.validFrom).toLocaleDateString()}</p>
                        <p><strong>Valid To:</strong> {new Date(pass.validTo).toLocaleDateString()}</p>
                        <p><strong>Total Trips:</strong> {pass.totalTrips}</p>
                        <p><strong>Used Trips:</strong> {pass.usedTrips}</p>
                        <p><strong>Remaining:</strong> {pass.remainingTrips}</p>
                        <p><strong>Pickup Point:</strong> {pass.preferredPickupPoint}</p>
                        <p><strong>Pickup Time:</strong> {pass.preferredPickupTime}</p>
                        <p><strong>Amount:</strong> {pass.currency} {pass.totalAmount}</p>
                        <p><strong>Payment:</strong> {pass.paymentStatus}</p>
                      </div>

                      <div className="pass-usage">
                        <div className="usage-info">
                          <span className="usage-text">Usage Progress</span>
                          <span className="usage-percentage">
                            {Math.round((pass.usedTrips / pass.totalTrips) * 100)}%
                          </span>
                        </div>
                        <div className="usage-progress">
                          <div 
                            className="usage-progress-bar"
                            style={{ 
                              width: `${(pass.usedTrips / pass.totalTrips) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showBookingModal && selectedTrip && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Book Seat - {selectedTrip.fromLocation} → {selectedTrip.toLocation}</h3>
              <button 
                className="close-btn"
                onClick={() => setShowBookingModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="modal-form">
              <div className="trip-summary">
                <p><strong>Date:</strong> {formatDate(selectedTrip.tripDate)}</p>
                <p><strong>Time:</strong> {selectedTrip.startTime} - {selectedTrip.endTime}</p>
                <p><strong>Available Seats:</strong> {selectedTrip.availableSeats}</p>
              </div>

              <div className="form-group">
                <label>Pickup Point</label>
                <select
                  value={bookingData.pickupPoint}
                  onChange={(e) => setBookingData(prev => ({ ...prev, pickupPoint: e.target.value }))}
                  required
                >
                  <option value="">Select pickup point</option>
                  {selectedTrip.routeId?.stopPoints?.map((stop, index) => (
                    <option key={index} value={stop.location}>
                      {stop.location} ({stop.time})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Seat Number</label>
                <input
                  type="number"
                  min="1"
                  max={selectedTrip.totalSeats}
                  value={bookingData.seatNumber}
                  onChange={(e) => setBookingData(prev => ({ ...prev, seatNumber: parseInt(e.target.value) }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={bookingData.useMonthlyPass}
                    onChange={(e) => setBookingData(prev => ({ ...prev, useMonthlyPass: e.target.checked }))}
                  />
                  Use Monthly Pass (if available)
                </label>
              </div>

              <div className="modal-actions">
                <button 
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowBookingModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading ? "Booking..." : "Book Seat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeTripBooking;
