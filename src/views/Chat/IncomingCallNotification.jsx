import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import * as Icons from 'react-feather';
import { connect } from 'react-redux';
import socketService from '../../utils/socketService';
import { CLEAR_INCOMING_CALL } from '../../redux/constants/Chat';
import './IncomingCallNotification.css';

const IncomingCallNotification = ({ show, callerUserId, userName, avatar, onAccept, onDecline, dispatch }) => {
    const [ripple, setRipple] = useState(true);

    useEffect(() => {
        if (show) {
            // Pulse animation for incoming call effect
            const interval = setInterval(() => {
                setRipple(prev => !prev);
            }, 1500);
            return () => clearInterval(interval);
        }
    }, [show]);

    const handleAccept = () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const currentUserId = user._id;
        if (currentUserId && callerUserId) {
            // Emit socket event to notify caller that call was accepted
            socketService.emit('call_accepted', {
                from: currentUserId,
                to: callerUserId
            });
            console.log('[IncomingCallNotification] Call accepted, emitted to caller');
        }
        if (onAccept) onAccept();
    };

    const handleDecline = () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const currentUserId = user._id;
        if (currentUserId && callerUserId) {
            // Emit socket event to notify caller that call was declined
            socketService.emit('call_declined', {
                from: currentUserId,
                to: callerUserId
            });
        }
        // Clear incoming call from Redux
        if (dispatch) {
            dispatch({
                type: CLEAR_INCOMING_CALL
            });
        }
        if (onDecline) onDecline();
    };

    if (!show) return null;

    return (
        <div className="incoming-call-notification-overlay">
            <div className={`incoming-call-notification ${ripple ? 'pulse' : ''}`}>
                {/* Close Button */}
                <button 
                    className="close-btn"
                    onClick={handleDecline}
                    aria-label="Close notification"
                >
                    ✕
                </button>

                {/* Caller Avatar */}
                <div className="caller-avatar">
                    {typeof avatar === "string" && avatar.trim() ? (
                        <img src={avatar} alt={userName} />
                    ) : (
                        <div className="avatar-placeholder">
                            {userName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                    )}
                    <div className="pulse-ring"></div>
                    <div className="pulse-ring" style={{animationDelay: '0.5s'}}></div>
                </div>

                {/* Caller Information */}
                <div className="caller-info">
                    <h4>{userName}</h4>
                    <p className="calling-text">
                        <span className="dot">●</span>
                        <span className="dot">●</span>
                        <span className="dot">●</span>
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="call-actions">
                    {/* Accept Call - navigates to audio modal */}
                    <Button 
                        className="action-btn accept-btn"
                        onClick={handleAccept}
                        title="Accept Call"
                    >
                        <span className="btn-icon">
                            <Icons.Phone size={24} />
                        </span>
                        <span className="btn-label">Accept</span>
                    </Button>

                    {/* Decline Call */}
                    <Button 
                        className="action-btn decline-btn"
                        onClick={handleDecline}
                        title="Decline Call"
                    >
                        <span className="btn-icon">
                            <Icons.PhoneOff size={24} />
                        </span>
                        <span className="btn-label">Decline</span>
                    </Button>
                </div>

                {/* Background Image/Avatar */}
                <div className="bg-avatar">
                    {typeof avatar === "string" && avatar.trim() && (
                        <img src={avatar} alt={userName} />
                    )}
                </div>
            </div>
        </div>
    );
};

const mapDispatchToProps = (dispatch) => ({
    dispatch
});

export default connect(null, mapDispatchToProps)(IncomingCallNotification);
