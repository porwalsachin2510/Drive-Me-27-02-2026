"use client"

import { useEffect, useRef } from "react"
import "./Notifications.css"

function Notifications({ isOpen, onClose }) {
  const notificationsRef = useRef(null)

  const notifications = [
    {
      id: 1,
      type: "alert",
      title: "System maintenance scheduled for 2AM",
      time: "10m ago",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 6V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="13" r="0.5" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 2,
      type: "info",
      title: 'New provider registration: "Gulf Transport"',
      time: "1h ago",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M4 17C4 14.2386 6.68629 12 10 12C13.3137 12 16 14.2386 16 17"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ]

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="notifications-dropdown" ref={notificationsRef}>
      <div className="notifications-header">
        <h3>Notifications</h3>
        <button className="mark-read-btn">Mark all read</button>
      </div>

      <div className="notifications-list">
        {notifications.map((notification) => (
          <div key={notification.id} className={`notification-item notification-${notification.type}`}>
            <div className="notification-icon">{notification.icon}</div>
            <div className="notification-content">
              <p className="notification-title">{notification.title}</p>
              <span className="notification-time">{notification.time}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="notifications-footer">
        <button className="view-all-btn">View All Notifications</button>
      </div>
    </div>
  )
}

export default Notifications
