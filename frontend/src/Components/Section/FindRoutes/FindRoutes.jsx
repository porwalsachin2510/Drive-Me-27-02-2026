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
      alert("Failed to join route");
    }
  };

  const filteredRoutes = routes.filter(route => {
    const matchesSearch = route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         route.startPoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         route.endPoint.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || route.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
      <p className="routes-count">{routes.filter(r => r.status === 'active').length} Active</p>

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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Routes List */}
      <div className="routes-list">
        {filteredRoutes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🚌</div>
            <p className="empty-title">
              {searchQuery || filterStatus !== "all" 
                ? "No routes found matching your criteria." 
                : "You haven't joined any partner routes yet."}
            </p>
            <p className="empty-subtitle">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your search or filter."
                : "Search for a route on the home page to join!"}
            </p>
          </div>
        ) : (
          filteredRoutes.map((route) => (
            <div key={route._id} className="route-card">
              <div className="route-header">
                <div className="route-info">
                  <h3>{route.name}</h3>
                  <span className={`route-status ${route.status}`}>
                    {route.status}
                  </span>
                </div>
                <div className="route-price">
                  KWD {route.price}
                </div>
              </div>

              <div className="route-details">
                <div className="route-path">
                  <div className="route-point">
                    <strong>From:</strong> {route.startPoint}
                  </div>
                  <div className="route-arrow">→</div>
                  <div className="route-point">
                    <strong>To:</strong> {route.endPoint}
                  </div>
                </div>

                <div className="route-meta">
                  <div className="meta-item">
                    <span className="meta-label">Distance:</span>
                    <span className="meta-value">{route.distance}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Duration:</span>
                    <span className="meta-value">{route.estimatedTime}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Partner:</span>
                    <span className="meta-value">{route.partnerName}</span>
                  </div>
                </div>

                <div className="route-schedule">
                  <div className="schedule-item">
                    <span className="schedule-label">Departure:</span>
                    <span className="schedule-time">{route.departureTime}</span>
                  </div>
                  <div className="schedule-item">
                    <span className="schedule-label">Arrival:</span>
                    <span className="schedule-time">{route.arrivalTime}</span>
                  </div>
                </div>
              </div>

              <div className="route-actions">
                {route.status === 'active' ? (
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
                  >
                    Join Route
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  async function handleLeaveRoute(routeId) {
    try {
      await api.post(`/commuter/routes/${routeId}/leave`);
      alert("Successfully left route!");
      fetchRoutes();
    } catch (error) {
      console.error("Error leaving route:", error);
      alert("Failed to leave route");
    }
  }
}
