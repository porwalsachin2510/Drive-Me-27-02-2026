import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useSocket } from "../../../hooks/useSocket";
import api from "../../../utils/api";
import "./EmployeeTripBooking.css";

function EmployeeTripBooking() {
  const user = useSelector((state) => state.auth.user);
  const socket = useSocket();
  const [trips, setTrips] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [monthlyPasses, setMonthlyPasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("available");
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingTrip, setTrackingTrip] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
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
      
      // Get todayTrips and upcomingTrips - show only SCHEDULED and IN_PROGRESS
      const todayTrips = dashboardData?.todayTrips || [];
      const upcomingTrips = dashboardData?.upcomingTrips || dashboardData?.bookings || [];
      
      // Merge and deduplicate by _id, filter out COMPLETED/CANCELLED
      const allTrips = [...todayTrips, ...upcomingTrips];
      const uniqueTrips = allTrips
        .filter((trip, index, self) => 
          index === self.findIndex(t => t._id === trip._id)
        )
        .filter(trip => ['SCHEDULED', 'IN_PROGRESS'].includes(trip.status));
      
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
      // Use the trips/my-bookings endpoint which only returns trips where this employee is a passenger
      const response = await api.get("/trips/my-bookings");
      const bookingsData = response.data?.data?.bookings || response.data?.data || [];
      setMyBookings(Array.isArray(bookingsData) ? bookingsData : []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      // Fallback to dashboard
      try {
        const response = await api.get("/corporate-employee-users/dashboard");
        const dashboardData = response.data?.data;
        const todayTrips = dashboardData?.todayTrips || [];
        const bookings = dashboardData?.bookings || [];
        const all = [...todayTrips, ...bookings];
        const unique = all.filter((b, i, self) => i === self.findIndex(t => t._id === b._id));
        setMyBookings(unique);
      } catch {
        setMyBookings([]);
      }
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
      useMonthlyPass: false  // Always false - corporate employees don't need monthly passes
    });
    setShowBookingModal(true);
  };

  // Get pickup options for a trip
  const getPickupOptions = (trip) => {
    const options = [];
    const stopPoints = trip.stopPoints || trip.routeStopPoints || trip.routeId?.stopPoints || [];
    
    // Add stop points
    stopPoints.forEach((stop) => {
      if (stop.location) {
        options.push({ location: stop.location, time: stop.time || '' });
      }
    });
    
    // Always add from/to as fallback options if no stop points or they don't include from/to
    const fromLoc = trip.fromLocation;
    const toLoc = trip.toLocation;
    
    if (fromLoc && !options.find(o => o.location === fromLoc)) {
      options.unshift({ location: fromLoc, time: trip.startTime || '', label: 'Start' });
    }
    if (toLoc && !options.find(o => o.location === toLoc)) {
      options.push({ location: toLoc, time: trip.endTime || '', label: 'End' });
    }
    
    return options;
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
      // Use the trip cancel endpoint which removes the employee from the passengers array
      await api.delete(`/trips/${tripId}/cancel`);
      fetchMyBookings();
      alert("Booking cancelled successfully!");
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

  // Socket listener for driver location updates
  useEffect(() => {
    if (!socket?.socket) return;

    const handleLocationUpdate = (data) => {
      if (trackingTrip && data.driverId) {
        setDriverLocation({
          lat: data.location?.lat || data.lat,
          lng: data.location?.lng || data.lng,
          timestamp: data.timestamp
        });
      }
    };

    socket.socket.on("driver-location-update", handleLocationUpdate);
    socket.socket.on("location-update", handleLocationUpdate);

    return () => {
      socket.socket.off("driver-location-update", handleLocationUpdate);
      socket.socket.off("location-update", handleLocationUpdate);
    };
  }, [socket, trackingTrip]);

  // Track Driver handler
  const handleTrackDriver = useCallback((trip) => {
    setTrackingTrip(trip);
    setDriverLocation(null);
    setShowTrackingModal(true);

    // Join booking room for this trip to receive location updates
    if (socket?.socket && trip._id) {
      socket.socket.emit("join_booking_room", trip._id);
    }
  }, [socket]);

  // Stop tracking
  const handleStopTracking = useCallback(() => {
    if (socket?.socket && trackingTrip?._id) {
      socket.socket.emit("leave_booking_room", trackingTrip._id);
    }
    setShowTrackingModal(false);
    setTrackingTrip(null);
    setDriverLocation(null);
  }, [socket, trackingTrip]);

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

                      <div className="trip-actions">
                        <button 
                          className="book-btn"
                          onClick={() => handleBookTrip(trip)}
                          disabled={trip.availableSeats === 0}
                        >
                          {trip.availableSeats === 0 ? "Full" : "Book Seat"}
                        </button>
                        {trip.status === "IN_PROGRESS" && (
                          <button 
                            className="track-btn"
                            onClick={() => handleTrackDriver(trip)}
                            style={{
                              background: "#3b82f6",
                              color: "white",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: "600"
                            }}
                          >
                            Track Driver
                          </button>
                        )}
                      </div>
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
                        {booking.status === "IN_PROGRESS" && (
                          <button 
                            className="track-btn"
                            onClick={() => handleTrackDriver(booking)}
                            style={{
                              background: "#3b82f6",
                              color: "white",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: "600"
                            }}
                          >
                            Track Driver
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
                  {getPickupOptions(selectedTrip).map((opt, index) => (
                    <option key={index} value={opt.location}>
                      {opt.location} {opt.time ? `(${opt.time})` : ''} {opt.label ? `- ${opt.label}` : ''}
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

      {/* Driver Tracking Modal */}
      {showTrackingModal && trackingTrip && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "800px", width: "95%" }}>
            <div className="modal-header">
              <h3>Track Driver - {trackingTrip.fromLocation} → {trackingTrip.toLocation}</h3>
              <button 
                className="close-btn"
                onClick={handleStopTracking}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "16px" }}>
              <div style={{ marginBottom: "16px" }}>
                <p><strong>Driver:</strong> {trackingTrip.driverName || 'Assigned Driver'}</p>
                <p><strong>Vehicle:</strong> {trackingTrip.vehicleName || trackingTrip.vehicleNumber || 'N/A'}</p>
                <p><strong>Status:</strong>{' '}
                  <span style={{ 
                    color: driverLocation ? "#10b981" : "#f59e0b",
                    fontWeight: "bold"
                  }}>
                    {driverLocation ? "Online - Sharing Location" : "Waiting for driver location..."}
                  </span>
                </p>
              </div>

              <div style={{ 
                height: "400px", 
                borderRadius: "12px", 
                overflow: "hidden", 
                border: "2px solid #e0e0e0",
                position: "relative",
                background: "#f8f9fa"
              }}>
                {driverLocation ? (
                  <>
                    <iframe
                      title="Live Driver Tracking Map"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${driverLocation.lng - 0.005},${driverLocation.lat - 0.005},${driverLocation.lng + 0.005},${driverLocation.lat + 0.005}&layer=mapnik&mlat=${driverLocation.lat}&mlon=${driverLocation.lng}&zoom=16`}
                      style={{ border: 0 }}
                      allowFullScreen
                    />
                    <div style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      backgroundColor: "rgba(40, 167, 69, 0.9)",
                      color: "white",
                      padding: "8px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      zIndex: 1000
                    }}>
                      LIVE TRACKING
                    </div>
                  </>
                ) : (
                  <div style={{
                    height: "100%",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    color: "white"
                  }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      {'🗺️'}
                    </div>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>
                      Waiting for Driver Location...
                    </h3>
                    <p style={{ margin: 0, fontSize: "14px", opacity: 0.9, textAlign: "center", maxWidth: "300px" }}>
                      Your driver will appear here once they start sharing their location
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeTripBooking;
