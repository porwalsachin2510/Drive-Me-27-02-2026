import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import './SubscriptionSettings.css';

const SubscriptionSettings = () => {
  const [settings, setSettings] = useState({
    autoRenewal: true,
    renewalReminderDays: 7,
    paymentMethod: 'CREDIT_CARD',
    emailNotifications: true,
    smsNotifications: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/subscription-settings/settings');

      if (response.data.success) {
        setSettings(response.data.data.settings);
      } else {
        setError(response.data.message || 'Failed to fetch settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Network error. Please try again.');
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put('/subscription-settings/settings', settings);

      if (response.data.success) {
        setSuccess('Settings updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancelReason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    try {
      const response = await api.post('/subscription-settings/cancel', { reason: cancelReason });

      if (response.data.success) {
        setSuccess('Subscription cancelled successfully');
        setShowCancelModal(false);
        setCancelReason('');
        // Update settings to reflect cancellation
        setSettings(prev => ({ ...prev, autoRenewal: false }));
      } else {
        setError(response.data.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setError('Network error. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="subscription-settings-container">
      <div className="settings-header">
        <h2>Subscription Settings</h2>
        <p>Manage your monthly pass and renewal preferences</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="settings-section">
        <h3>Auto-Renewal</h3>
        <div className="setting-row">
          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="autoRenewal"
                checked={settings.autoRenewal}
                onChange={handleInputChange}
              />
              <span className="checkmark"></span>
              Enable automatic renewal
            </label>
            <p className="setting-description">
              Your monthly pass will automatically renew at the end of each billing cycle.
            </p>
          </div>

          <div className="setting-item">
            <label>Renewal Reminder</label>
            <select
              name="renewalReminderDays"
              value={settings.renewalReminderDays}
              onChange={handleInputChange}
              disabled={!settings.autoRenewal}
            >
              <option value={3}>3 days before</option>
              <option value={7}>7 days before</option>
              <option value={14}>14 days before</option>
              <option value={30}>30 days before</option>
            </select>
            <p className="setting-description">
              When to send renewal reminder notifications
            </p>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Payment Method</h3>
        <div className="setting-item">
          <label>Preferred payment method for renewals</label>
          <select
            name="paymentMethod"
            value={settings.paymentMethod}
            onChange={handleInputChange}
          >
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="DEBIT_CARD">Debit Card</option>
            <option value="WALLET">Wallet Balance</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h3>Notifications</h3>
        <div className="setting-row">
          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="emailNotifications"
                checked={settings.emailNotifications}
                onChange={handleInputChange}
              />
              <span className="checkmark"></span>
              Email notifications
            </label>
            <p className="setting-description">
              Receive trip updates, renewal reminders, and promotional offers via email
            </p>
          </div>

          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="smsNotifications"
                checked={settings.smsNotifications}
                onChange={handleInputChange}
              />
              <span className="checkmark"></span>
              SMS notifications
            </label>
            <p className="setting-description">
              Receive important trip alerts via SMS
            </p>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button
          className="save-btn"
          onClick={handleSaveSettings}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>

        <button
          className="cancel-btn"
          onClick={() => setShowCancelModal(true)}
        >
          Cancel Subscription
        </button>
      </div>

      {showCancelModal && (
        <div className="cancel-overlay">
          <div className="cancel-modal">
            <div className="cancel-header">
              <h3>Cancel Subscription</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowCancelModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="cancel-content">
              <p className="cancel-warning">
                <strong>Warning:</strong> Cancelling your subscription will:
              </p>
              <ul className="cancel-effects">
                <li>Stop automatic renewals</li>
                <li>Remove access to monthly passes</li>
                <li>You'll need to book individual trips</li>
                <li>Current benefits will end at billing cycle end</li>
              </ul>
              
              <div className="form-group">
                <label>Reason for cancellation</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows="4"
                  placeholder="Please tell us why you're cancelling..."
                  required
                />
              </div>

              <div className="cancel-actions">
                <button
                  className="keep-btn"
                  onClick={() => setShowCancelModal(false)}
                >
                  Keep Subscription
                </button>
                <button
                  className="confirm-cancel-btn"
                  onClick={handleCancelSubscription}
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionSettings;
