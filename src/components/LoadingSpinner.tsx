import React from 'react';
import './LoadingSpinner.css';

type LoadingSpinnerProps = {
  message?: string;
  size?: number;
  fullHeight?: boolean;
  inline?: boolean;
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Cargando…',
  size = 56,
  fullHeight = false,
  inline = false,
}) => {
  const borderWidth = Math.max(4, Math.round(size / 8));

  return (
    <div
      className={`loading-spinner${fullHeight ? ' loading-spinner--full' : ''}${inline ? ' loading-spinner--inline' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div
        className="loading-spinner__ring"
        style={{
          width: size,
          height: size,
          borderWidth,
        }}
      />
      {message && <p className="loading-spinner__message">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
