import React from 'react';

function ToastStack({ notifications, onDismiss }) {
  if (!notifications.length) return null;

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`toast-notification ${notification.type === 'error' ? 'error' : 'success'}`}
        >
          <span>{notification.message}</span>
          <button type="button" onClick={() => onDismiss(notification.id)} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastStack;
