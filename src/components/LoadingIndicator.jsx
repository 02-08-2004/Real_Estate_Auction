// src/components/LoadingIndicator.jsx
import React from 'react';

const LoadingIndicator = ({ message = "Synchronizing Data...", fullScreen = false }) => {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    minHeight: fullScreen ? '100vh' : 'auto',
    width: '100%',
    color: '#fff',
    fontFamily: 'var(--font-body)',
  };

  const spinnerStyle = {
    width: '64px',
    height: '64px',
    position: 'relative',
    marginBottom: '24px',
  };

  const ringStyle = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    border: '3px solid transparent',
    borderTopColor: 'var(--red)',
    borderRadius: '50%',
    animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite',
  };

  const innerRingStyle = {
    position: 'absolute',
    width: '70%',
    height: '70%',
    top: '15%',
    left: '15%',
    border: '2px solid transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: '50%',
    animation: 'spin-reverse 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite',
  };

  const textStyle = {
    fontSize: '14px',
    fontWeight: '500',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.9)',
    textShadow: '0 0 20px rgba(255, 255, 255, 0.2)',
    animation: 'pulse 2s ease-in-out infinite',
  };

  const subTextStyle = {
    fontSize: '11px',
    marginTop: '8px',
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '400',
    letterSpacing: '0.5px',
  };

  return (
    <div style={containerStyle} className="fade-in">
      <div style={spinnerStyle}>
        <div style={ringStyle}></div>
        <div style={innerRingStyle}></div>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '8px',
          height: '8px',
          background: 'var(--red)',
          borderRadius: '50%',
          boxShadow: '0 0 15px var(--red)'
        }}></div>
      </div>
      <div style={textStyle}>{message}</div>
      <div style={subTextStyle}>ESTATEAUCTION PREMIUM NETWORK</div>
    </div>
  );
};

export default LoadingIndicator;
