import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/Auth.css';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const requestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.requestRegistrationOtp(username, email, password);
      setOtpRequested(true);
      setSuccess(response.data?.message || 'Verification code sent');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authService.verifyRegistrationOtp(email, otp);
      navigate('/login', {
        state: {
          successMessage: response.data?.message || 'Email verified successfully. Please log in.',
          email,
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await authService.resendRegistrationOtp(email);
      setSuccess(response.data?.message || 'Verification code resent');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-wide">
        <h1>File Sharing Platform</h1>
        <h2>{otpRequested ? 'Verify your email' : 'Create Account'}</h2>
        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {!otpRequested ? (
          <form onSubmit={requestOtp}>
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="button button-primary" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send verification code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <div className="auth-helper-copy">
              <p>We sent a 6-digit OTP to <strong>{email}</strong>.</p>
            </div>
            <div className="input-group">
              <label htmlFor="otp">Verification code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </div>
            <button type="submit" className="button button-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify and create account'}
            </button>
            <button type="button" className="button button-secondary auth-secondary-action" onClick={resendOtp} disabled={loading}>
              {loading ? 'Please wait...' : 'Resend code'}
            </button>
            <button
              type="button"
              className="button button-secondary auth-secondary-action"
              onClick={() => {
                setOtpRequested(false);
                setOtp('');
                setSuccess('');
                setError('');
              }}
              disabled={loading}
            >
              Edit details
            </button>
          </form>
        )}
        <p>
          Already have an account? <Link to="/login">Login here</Link>
        </p>
        <Link to="/explore" className="guest-link">
          Continue as guest
        </Link>
      </div>
    </div>
  );
}

export default Register;
