import React, { useEffect, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import * as Icons from 'react-feather';
import socketService from '../../utils/socketService';
import './RingingModal.css';

const RingingModal = ({ show, onDecline, userName, avatar }) => {
    const [callTime, setCallTime] = useState(0);

    // Timer for call duration
    useEffect(() => {
        let interval;
        if (show) {
            interval = setInterval(() => {
                setCallTime(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
            setCallTime(0);
        };
    }, [show]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleDecline = () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const currentUser = user.username;
        if (currentUser && userName) {
            // Emit socket event to notify callee that call was declined
            socketService.emit('call_declined', {
                from: currentUser,
                to: userName
            });
        }
        if (onDecline) onDecline();
    };

    return (
        <Modal show={show} onHide={onDecline} centered size="lg" dialogClassName="ringing-modal-dialog" className="ringing-modal">
            <div className="ringing-modal-content">
                {/* Close Button */}
                <button className="close-btn" onClick={handleDecline} aria-label="Cancel call">
                    ✕
                </button>

                {/* Avatar */}
                <div className="ringing-avatar">
                    {typeof avatar === "string" && avatar.trim() ? (
                        <img src={avatar} alt={userName} />
                    ) : (
                        <div className="avatar-placeholder">
                            {userName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                    )}
                </div>

                {/* Caller Name */}
                <h3 className="ringing-name">{userName}</h3>

                {/* Ringing Animation */}
                <div className="ringing-status">
                    <span className="ringing-dot"></span>
                    <span className="ringing-dot"></span>
                    <span className="ringing-dot"></span>
                    <p>Ringing...</p>
                </div>

                {/* Call Duration */}
                {callTime > 0 && (
                    <div className="call-duration">
                        {formatTime(callTime)}
                    </div>
                )}

                {/* Decline Button */}
                <div className="ringing-actions">
                    <Button 
                        className="decline-btn-large"
                        onClick={handleDecline}
                        title="End Call"
                    >
                        <span className="btn-icon">
                            <Icons.PhoneOff size={28} />
                        </span>
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default RingingModal;
