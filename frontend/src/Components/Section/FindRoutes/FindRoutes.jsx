"use client";
import { useState, useEffect } from "react";
import "./find-routes.css";
import api from "../../../utils/api";

export default function FindRoutes() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/commuter/routes');
      setRoutes(response.data.routes || []);
    } catch (error) {
      console.error("Error fetching routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoute = async (routeId) => {
    try {
      await api.post(`/commuter/routes/${routeId}/join`);
      alert("Successfully joined route!");
      fetchRoutes();
    } catch (error) {
      console.error("Error joining route:", error);
      alert(error.response?.data?.message || "Failed to join route");
    }
  };

  const handleLeaveRoute = async (routeId) => {
    if (!window.confirm("Are you sure you want to leave this route?")) return;
    try {
      await api.post(`/commuter/routes/${routeId}/leave`);
      alert("Successfully left route!");
      fetchRoutes();
    } catch (error) {
      console.error("Error leaving route:", error);
      const msg = error.response?.data?.message || "Failed to leave route";
      alert(msg);
    }
  };

  const filteredRoutes = routes.filter(route => {
    const name = (route.name || '').toLowerCase();
    const start = (route.startPoint || '').toLowerCase();
    const end = (route.endPoint || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || name.includes(query) || start.includes(query) || end.includes(query);
    
    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "active") return matchesSearch && route.isMember;
    if (filterStatus === "available") return matchesSearch && !route.isMember;
    return matchesSearch;
  });

  const activeCount = routes.filter(r => r.isMember).length;

  if (loading) {
    return (
      <div className="find-routes-section">
        <h2>My Active Routes</h2>
        <div className="loading">Loading routes...</div>
      </div>
    );
  }

  return (
    <div className="find-routes-section">
      <h2>My Active Routes</h2>
      <p className="routes-count">{activeCount} Active</p>

      {/* Search and Filter */}
      <div className="routes-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-box">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Routes</option>
            <option value="active">My Routes</option>
            <option value="available">Available</option>
          </select>
        </div>
      </div>

      {/* Routes List */}
      <div className="routes-list">
        {filteredRoutes.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">
              {searchQuery || filterStatus !== "all" 
                ? "No routes found matching your criteria." 
                : "No partner routes available yet."}
            </p>
            <p className="empty-subtitle">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your search or filter."
                : "Check back later for available routes!"}
            </p>
          </div>
        ) : (
          filteredRoutes.map((route) => (
            <div key={route._id} className="route-card">
              <div className="route-header">
                <div className="route-info">
                  <h3>{route.name}</h3>
                  <span className={`route-status ${route.isMember ? 'active' : 'available'}`}>
                    {route.isMember ? 'Active' : 'Available'}
                  </span>
                </div>
                <div className="route-price">
                  KWD {route.price || 0}
                </div>
              </div>

              <div className="route-details">
                <div className="route-path">
                  <div className="route-point">
                    <strong>From:</strong> {route.startPoint}
                  </div>
                  <div className="route-arrow">&#8594;</div>
                  <div className="route-point">
                    <strong>To:</strong> {route.endPoint}
                  </div>
                </div>

                <div className="route-meta">
                  <div className="meta-item">
                    <span className="meta-label">Distance:</span>
                    <span className="meta-value">{route.distance || 'Not available'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Duration:</span>
                    <span className="meta-value">{route.estimatedTime || 'Not available'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Partner:</span>
                    <span className="meta-value">{route.partnerName || 'Unknown'}</span>
                  </div>
                </div>

                <div className="route-schedule">
                  <div className="schedule-item">
                    <span className="schedule-label">Departure:</span>
                    <span className="schedule-time">{route.departureTime || 'Not set'}</span>
                  </div>
                  <div className="schedule-item">
                    <span className="schedule-label">Arrival:</span>
                    <span className="schedule-time">{route.arrivalTime || 'Not set'}</span>
                  </div>
                </div>

                {route.operatingDays && route.operatingDays.length > 0 && (
                  <div className="route-days">
                    <span className="days-label">Operating Days:</span>
                    <div className="days-list">
                      {route.operatingDays.map((day, idx) => (
                        <span key={idx} className="day-badge">{day}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="route-seats-info">
                  <span className="seats-label">Available Seats:</span>
                  <span className="seats-value">{route.availableSeats} / {route.totalSeats}</span>
                </div>
              </div>

              <div className="route-actions">
                {route.isMember ? (
                  <button
                    className="leave-btn"
                    onClick={() => handleLeaveRoute(route._id)}
                  >
                    Leave Route
                  </button>
                ) : (
                  <button
                    className="join-btn"
                    onClick={() => handleJoinRoute(route._id)}
                    disabled={route.availableSeats <= 0}
                  >
                    {route.availableSeats <= 0 ? 'Full' : 'Join Route'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
