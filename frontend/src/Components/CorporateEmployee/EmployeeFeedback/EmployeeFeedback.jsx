import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import './EmployeeFeedback.css';

const EmployeeFeedback = () => {
  const [completedTrips, setCompletedTrips] = useState([]);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [feedbackData, setFeedbackData] = useState({
    rating: 5,
    driverRating: 5,
    punctualityRating: 5,
    cleanlinessRating: 5,
    safetyRating: 5,
    comments: '',
    suggestions: ''
  });

  useEffect(() => {
    fetchCompletedTrips();
    fetchFeedbackHistory();
  }, []);

  const fetchCompletedTrips = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Try corporate employee dashboard first
      let dashboardFailed = false;
      try {
        const response = await api.get('/corporate-employee-users/dashboard');
        
        if (response.data.success) {
          const trips = response.data.data?.travelHistory?.trips || response.data.data?.todayTrips || [];
          setCompletedTrips(trips.filter(trip => trip.status === 'COMPLETED'));
          return;
        }
      } catch (dashError) {
        // If employee not found (404) or any dashboard error, silently fall back
        dashboardFailed = true;
      }

      // Fallback: try travel history endpoint
      if (dashboardFailed) {
        try {
          const historyResponse = await api.get('/travel-history/my-history');
          if (historyResponse.data.success) {
            const trips = historyResponse.data.data?.trips || historyResponse.data.history || [];
            setCompletedTrips(trips.filter(trip => trip.status === 'COMPLETED'));
            return;
          }
        } catch (histErr) {
          // Silently handle - no error shown to user
        }
      }

      // If both fail, set empty array (no error shown to user)
      setCompletedTrips([]);
    } catch (error) {
      console.error('Error fetching completed trips:', error);
      // Only show error for unexpected failures, not for "Employee not found"
      if (error.response?.status !== 404) {
        setError(error.response?.data?.message || 'Failed to fetch trips');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbackHistory = async () => {
    try {
      setLoading(true);
      
      // Backend: GET /api/travel-history/my-history (travelHistoryRoutes.js)
      const response = await api.get('/travel-history/my-history');
      
      if (response.data.success) {
        setFeedbackHistory(response.data.data?.feedbacks || response.data.history || []);
      } else {
        setError(response.data.message || 'Failed to fetch feedback history');
      }
    } catch (error) {
      console.error('Error fetching feedback history:', error);
      setError(error.response?.data?.message || 'Failed to fetch feedback history');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      
      // Backend: POST /api/corporate-employee-users/rate-trip
      const response = await api.post('/corporate-employee-users/rate-trip', {
        tripId: selectedTrip._id,
        ...feedbackData
      });

      if (response.data.success) {
        setShowFeedbackModal(false);
        setSelectedTrip(null);
        setFeedbackData({
          rating: 5,
          driverRating: 5,
          punctualityRating: 5,
          cleanlinessRating: 5,
          safetyRating: 5,
          comments: '',
          suggestions: ''
        });
        // Refresh feedback history
        fetchFeedbackHistory();
      } else {
        setError(response.data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError(error.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const openFeedbackModal = (trip) => {
    setSelectedTrip(trip);
    setFeedbackData({
      rating: 5,
      driverRating: 5,
      punctualityRating: 5,
      cleanlinessRating: 5,
      safetyRating: 5,
      comments: '',
      suggestions: ''
    });
    setShowFeedbackModal(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating, onChange) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star ${star <= rating ? 'filled' : ''}`}
            onClick={() => onChange && onChange(star)}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  const currentTrips = activeTab === 'pending' ? completedTrips : feedbackHistory;

  if (loading) {
    return (
      <div className="employee-feedback">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading feedback data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-feedback">
      <div className="feedback-header">
        <h2>Trip Feedback</h2>
        <p>Rate your trips and help us improve our service</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Feedback ({completedTrips.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Feedback History ({feedbackHistory.length})
        </button>
      </div>

      <div className="trips-list">
        {currentTrips.length === 0 ? (
          <div className="no-trips">
            <p>No {activeTab === 'pending' ? 'trips pending feedback' : 'feedback history'} found.</p>
          </div>
        ) : (
          currentTrips.map((trip, index) => (
            <div key={index} className="trip-card">
              <div className="trip-info">
                <div className="trip-details">
                  <h3>{trip.routeName}</h3>
                  <p className="route">{trip.pickupLocation} → {trip.dropoffLocation}</p>
                  <div className="time-details">
                    <span className="date">{formatDate(trip.tripDate)}</span>
                    <span className="time">{formatTime(trip.pickupTime)}</span>
                  </div>
                </div>
                
                <div className="vehicle-info">
                  <p><strong>Vehicle:</strong> {trip.vehicleNumber}</p>
                  <p><strong>Driver:</strong> {trip.driverName}</p>
                  <p><strong>Seat:</strong> {trip.seatNumber}</p>
                </div>
              </div>

              <div className="feedback-actions">
                {activeTab === 'pending' && (
                  <button
                    className="feedback-btn"
                    onClick={() => openFeedbackModal(trip)}
                  >
                    Give Feedback
                  </button>
                )}
                
                {activeTab === 'history' && (
                  <div className="feedback-summary">
                    <div className="overall-rating">
                      <span className="rating-label">Overall Rating:</span>
                      {renderStars(trip.rating)}
                    </div>
                    <div className="rating-breakdown">
                      <div className="rating-item">
                        <span>Driver:</span>
                        {renderStars(trip.driverRating)}
                      </div>
                      <div className="rating-item">
                        <span>Punctuality:</span>
                        {renderStars(trip.punctualityRating)}
                      </div>
                      <div className="rating-item">
                        <span>Cleanliness:</span>
                        {renderStars(trip.cleanlinessRating)}
                      </div>
                      <div className="rating-item">
                        <span>Safety:</span>
                        {renderStars(trip.safetyRating)}
                      </div>
                    </div>
                    {trip.comments && (
                      <div className="feedback-comments">
                        <strong>Comments:</strong>
                        <p>{trip.comments}</p>
                      </div>
                    )}
                    {trip.suggestions && (
                      <div className="feedback-suggestions">
                        <strong>Suggestions:</strong>
                        <p>{trip.suggestions}</p>
                      </div>
                    )}
                    <div className="feedback-date">
                      <small>Submitted on: {formatDate(trip.createdAt)}</small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showFeedbackModal && selectedTrip && (
        <div className="feedback-modal-overlay">
          <div className="feedback-modal">
            <div className="modal-header">
              <h3>Trip Feedback</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowFeedbackModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="trip-summary">
              <p><strong>Route:</strong> {selectedTrip.routeName}</p>
              <p><strong>Date:</strong> {formatDate(selectedTrip.tripDate)}</p>
              <p><strong>Time:</strong> {formatTime(selectedTrip.pickupTime)}</p>
              <p><strong>Driver:</strong> {selectedTrip.driverName}</p>
            </div>
            
            <form onSubmit={handleFeedbackSubmit} className="feedback-form">
              <div className="rating-section">
                <h4>Overall Experience</h4>
                <div className="rating-group">
                  <label>How was your overall trip?</label>
                  {renderStars(feedbackData.rating, (rating) => 
                    setFeedbackData(prev => ({ ...prev, rating }))
                  )}
                </div>
              </div>

              <div className="rating-section">
                <h4>Detailed Ratings</h4>
                <div className="rating-group">
                  <label>Driver Behavior</label>
                  {renderStars(feedbackData.driverRating, (rating) => 
                    setFeedbackData(prev => ({ ...prev, driverRating: rating }))
                  )}
                </div>
                
                <div className="rating-group">
                  <label>Punctuality</label>
                  {renderStars(feedbackData.punctualityRating, (rating) => 
                    setFeedbackData(prev => ({ ...prev, punctualityRating: rating }))
                  )}
                </div>
                
                <div className="rating-group">
                  <label>Vehicle Cleanliness</label>
                  {renderStars(feedbackData.cleanlinessRating, (rating) => 
                    setFeedbackData(prev => ({ ...prev, cleanlinessRating: rating }))
                  )}
                </div>
                
                <div className="rating-group">
                  <label>Safety</label>
                  {renderStars(feedbackData.safetyRating, (rating) => 
                    setFeedbackData(prev => ({ ...prev, safetyRating: rating }))
                  )}
                </div>
              </div>

              <div className="comments-section">
                <div className="form-group">
                  <label>Comments (Optional)</label>
                  <textarea
                    value={feedbackData.comments}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, comments: e.target.value }))}
                    rows="3"
                    placeholder="Share your experience..."
                  />
                </div>

                <div className="form-group">
                  <label>Suggestions for Improvement (Optional)</label>
                  <textarea
                    value={feedbackData.suggestions}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, suggestions: e.target.value }))}
                    rows="3"
                    placeholder="How can we improve your experience?"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowFeedbackModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                >
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeFeedback;
