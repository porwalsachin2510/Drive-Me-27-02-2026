"use client";
import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import "./alerts.css";
import api from "../../../utils/api";

export default function Alerts() {
  const { user } = useSelector((state) => state.auth);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchNotifications = useCallback(async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
        setNotifications([]);
      } else {
        setLoadingMore(true);
      }
      
      const currentPage = reset ? 1 : page;
      const response = await api.get(`/notifications/user/${user._id}`, {
        params: {
          page: currentPage,
          limit: 20,
          type: filterType === "all" ? undefined : filterType
        }
      });
      
      // Backend returns { success, data: { notifications, pagination } }
      const responseData = response.data?.data || response.data;
      const newNotifications = responseData?.notifications || response.data?.notifications || [];
      const totalNotifications = responseData?.pagination?.total || response.data?.total || 0;
      
      if (reset) {
        setNotifications(newNotifications);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
      }
      
      setHasMore(notifications.length + newNotifications.length < totalNotifications);
      if (!reset) {
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterType, user?._id, page, notifications.length]);

  useEffect(() => {
    if (user?._id) {
      fetchNotifications();
    }
  }, [fetchNotifications, user?._id]);

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch(`/notifications/user/${user._id}/read-all`);
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev =>
        prev.filter(notif => notif._id !== notificationId)
      );
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "PAYMENT":
        return "💳";
      case "PROMOTION":
        return "🎉";
      case "SYSTEM":
        return "⚙️";
      case "TRIP_UPDATE":
        return "🚌";
      case "BOOKING":
        return "📋";
      case "WALLET":
        return "💰";
      case "EMERGENCY":
        return "🚨";
      default:
        return "📢";
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "PAYMENT":
        return "#00B074";
      case "PROMOTION":
        return "#FF6B6B";
      case "SYSTEM":
        return "#4ECDC4";
      case "TRIP_UPDATE":
        return "#45B7D1";
      case "BOOKING":
        return "#96CEB4";
      case "WALLET":
        return "#FECA57";
      case "EMERGENCY":
        return "#FF6348";
      default:
        return "#6C757D";
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="alerts-section">
        <h2>Notifications</h2>
        <div className="loading">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="alerts-section">
      <div className="alerts-header">
        <h2>Notifications</h2>
        <div className="alerts-controls">
          <div className="unread-badge">
            {unreadCount} Unread
          </div>
          {unreadCount > 0 && (
            <button
              className="mark-all-read-btn"
              onClick={markAllAsRead}
            >
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Options */}
      <div className="filter-options">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Notifications</option>
          <option value="PAYMENT">Payments</option>
          <option value="PROMOTION">Promotions</option>
          <option value="SYSTEM">System</option>
          <option value="TRIP_UPDATE">Trip Updates</option>
          <option value="BOOKING">Bookings</option>
          <option value="WALLET">Wallet</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <div className="no-notifications-icon">🔔</div>
            <h3>No notifications found</h3>
            <p>
              {filterType === "all"
                ? "You don't have any notifications yet."
                : "No notifications found for this type."}
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification._id}
              className={`notification-item ${!notification.isRead ? "unread" : ""}`}
            >
              <div className="notification-icon">
                <span
                  style={{ color: getNotificationColor(notification.type) }}
                >
                  {getNotificationIcon(notification.type)}
                </span>
              </div>

              <div className="notification-content">
                <div className="notification-header">
                  <h4>{notification.title}</h4>
                  <span className="notification-date">
                    {new Date(notification.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>

                <p className="notification-message">
                  {notification.message}
                </p>

                {notification.actionUrl && (
                  <a
                    href={notification.actionUrl}
                    className="notification-action"
                  >
                    {notification.actionText || "View Details"}
                  </a>
                )}
              </div>

              <div className="notification-actions">
                {!notification.isRead && (
                  <button
                    className="mark-read-btn"
                    onClick={() => markAsRead(notification._id)}
                    title="Mark as read"
                  >
                    ✓
                  </button>
                )}
                <button
                  className="delete-btn"
                  onClick={() => deleteNotification(notification._id)}
                  title="Delete notification"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {notifications.length > 0 && hasMore && (
        <div className="load-more-section">
          <button
            className="load-more-btn"
            onClick={() => fetchNotifications(false)}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
