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
      
      // Use the corporate employee dashboard API which returns upcoming trips and todayTrips
      const response = await api.get("/corporate-employee-users/dashboard");
      const dashboardData = response.data?.data;
      
      // Combine todayTrips and upcomingTrips for the available trips view
      const todayTrips = dashboardData?.todayTrips || [];
      const upcomingTrips = dashboardData?.upcomingTrips || dashboardData?.bookings || [];
      
      // Merge and deduplicate by _id
      const allTrips = [...todayTrips, ...upcomingTrips];
      const uniqueTrips = allTrips.filter((trip, index, self) => 
        index === self.findIndex(t => t._id === trip._id)
      );
      
      // Also try to get route stop points for pickup selection
      try {
        const routeResponse = await api.get("/corporate-employee-users/route");
        const routeData = routeResponse.data?.data;
        if (routeData?.route?.stopPoints) {
          // Attach stop points to all trips that don't have them
          const enrichedTrips = uniqueTrips.map(trip => ({
            ...trip,
            stopPoints: trip.routeId?.stopPoints || routeData.route.stopPoints || [],
            routeStopPoints: routeData.route.stopPoints || []
          }));
          setTrips(enrichedTrips);
        } else {
          setTrips(uniqueTrips);
        }
      } catch {
        setTrips(uniqueTrips);
      }
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
      const response = await api.get("/corporate-employee-users/dashboard");
      const dashboardData = response.data?.data;
      // Combine todayTrips and bookings for comprehensive view
      const todayTrips = dashboardData?.todayTrips || [];
      const bookingsData = dashboardData?.bookings || dashboardData?.upcomingTrips || [];
      const allBookings = [...todayTrips, ...bookingsData];
      // Deduplicate
      const uniqueBookings = allBookings.filter((b, i, self) => 
        i === self.findIndex(t => t._id === b._id)
      );
      setMyBookings(uniqueBookings);
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
      // Corporate employees don't have B2C monthly passes
      // Their transport is managed by the corporate through contracts
      // Show contract-based info instead
      const response = await api.get("/corporate-employee-users/route");
      const routeData = response.data?.data;
      if (routeData?.route) {
        // Create a pass-like object from the route assignment
        setMonthlyPasses([{
          _id: routeData.route._id || 'corporate-pass',
          status: 'ACTIVE',
          passType: 'CORPORATE',
          fromLocation: routeData.route.fromLocation,
          toLocation: routeData.route.toLocation,
          pickupLocation: routeData.pickupStop,
          dropoffLocation: routeData.dropoffStop,
          shiftType: routeData.shiftType,
          vehicle: routeData.vehicle,
          driver: routeData.driver,
          subscriptionType: 'COMPANY_PAID'
        }]);
      } else {
        setMonthlyPasses([]);
      }
    } catch (error) {
      console.error("Error fetching pass info:", error);
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
      // Try corporate trip cancel first (DELETE /api/trips/:tripId/cancel)
      try {
        await api.delete(`/trips/${tripId}/cancel`);
        fetchMyBookings();
        alert("Booking cancelled successfully!");
        return;
      } catch (err) {
        // If trip cancel fails with 404, try B2C booking cancel
        if (err.response?.status === 404) {
          await api.put(`/bookings/${tripId}/cancel`);
          fetchMyBookings();
          alert("Booking cancelled successfully!");
          return;
        }
        throw err;
      }
    } catch (error) {
      console.error("Error canceling booking:", error);
      alert(error.response?.data?.message || "Failed to cancel booking");
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
                        <p><strong>Date:</strong> {formatDate(trip.tripDate || trip.date)}</p>
                        <p><strong>Time:</strong> {trip.startTime} {trip.endTime ? `- ${trip.endTime}` : ''}</p>
                        <p><strong>Type:</strong> {trip.tripType || 'One Way'} {trip.direction ? `(${trip.direction})` : ''}</p>
                        <p><strong>Vehicle:</strong> {trip.vehicleName || trip.vehicleNumber || trip.vehicleId?.vehicleName || 'Not assigned'}</p>
                        <p><strong>Driver:</strong> {trip.driverName || trip.driverId?.fullName || 'Not assigned'}</p>
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
                          {(trip.stopPoints || trip.routeStopPoints || trip.routeId?.stopPoints || []).slice(0, 3).map((stop, index) => (
                            <div key={index} className="stop-item">
                              <span className="stop-location">{stop.location}</span>
                              <span className="stop-time">{stop.time}</span>
                            </div>
                          ))}
                          {(trip.stopPoints || trip.routeStopPoints || trip.routeId?.stopPoints || []).length > 3 && (
                            <span className="more-stops">
                              +{(trip.stopPoints || trip.routeStopPoints || trip.routeId?.stopPoints).length - 3} more stops
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
                        <p><strong>Date:</strong> {formatDate(booking.tripDate || booking.date)}</p>
                        <p><strong>Time:</strong> {booking.startTime} {booking.endTime ? `- ${booking.endTime}` : ''}</p>
                        <p><strong>Type:</strong> {booking.tripType || 'One Way'}</p>
                        <p><strong>Vehicle:</strong> {booking.vehicleName || booking.vehicleNumber || 'Not assigned'}</p>
                        <p><strong>Driver:</strong> {booking.driverName || 'Not assigned'}</p>
                        <p><strong>Pickup:</strong> {booking.pickupLocation || booking.fromLocation}</p>
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
                        <h3>{pass.fromLocation || pass.routeId?.fromLocation} → {pass.toLocation || pass.routeId?.toLocation}</h3>
                        <span 
                          className="pass-status"
                          style={{ backgroundColor: getPassStatusColor(pass.status) }}
                        >
                          {pass.status}
                        </span>
                      </div>
                      
                      <div className="pass-details">
                        {pass.passType === 'CORPORATE' ? (
                          <>
                            <p><strong>Type:</strong> Corporate Transport Pass</p>
                            <p><strong>Subscription:</strong> {pass.subscriptionType || 'Company Paid'}</p>
                            <p><strong>Pickup:</strong> {pass.pickupLocation || 'Not set'}</p>
                            <p><strong>Dropoff:</strong> {pass.dropoffLocation || 'Not set'}</p>
                            <p><strong>Shift:</strong> {pass.shiftType || 'Full Day'}</p>
                            {pass.vehicle && (
                              <p><strong>Vehicle:</strong> {pass.vehicle.vehicleName || `${pass.vehicle.make || ''} ${pass.vehicle.model || ''}`}</p>
                            )}
                            {pass.driver && (
                              <p><strong>Driver:</strong> {pass.driver.fullName || 'Not assigned'}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p><strong>Valid From:</strong> {pass.validFrom ? new Date(pass.validFrom).toLocaleDateString() : 'N/A'}</p>
                            <p><strong>Valid To:</strong> {pass.validTo ? new Date(pass.validTo).toLocaleDateString() : 'N/A'}</p>
                            <p><strong>Total Trips:</strong> {pass.totalTrips || 'Unlimited'}</p>
                            <p><strong>Used Trips:</strong> {pass.usedTrips || 0}</p>
                            <p><strong>Remaining:</strong> {pass.remainingTrips || 'N/A'}</p>
                            <p><strong>Pickup Point:</strong> {pass.preferredPickupPoint || 'Not set'}</p>
                            <p><strong>Amount:</strong> {pass.currency || ''} {pass.totalAmount || 'Company Paid'}</p>
                            <p><strong>Payment:</strong> {pass.paymentStatus || 'Company Paid'}</p>
                          </>
                        )}
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
                  {/* Use stopPoints from enriched trip data, or fallback to routeId.stopPoints */}
                  {(selectedTrip.stopPoints || selectedTrip.routeStopPoints || selectedTrip.routeId?.stopPoints || []).map((stop, index) => (
                    <option key={index} value={stop.location}>
                      {stop.location} {stop.time ? `(${stop.time})` : ''}
                    </option>
                  ))}
                  {/* If no stop points, show from/to as pickup options */}
                  {!(selectedTrip.stopPoints?.length || selectedTrip.routeStopPoints?.length || selectedTrip.routeId?.stopPoints?.length) && (
                    <>
                      {selectedTrip.fromLocation && (
                        <option value={selectedTrip.fromLocation}>{selectedTrip.fromLocation} (Start)</option>
                      )}
                      {selectedTrip.toLocation && (
                        <option value={selectedTrip.toLocation}>{selectedTrip.toLocation} (End)</option>
                      )}
                    </>
                  )}
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
