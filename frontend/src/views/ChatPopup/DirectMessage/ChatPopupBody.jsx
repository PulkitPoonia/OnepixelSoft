import React from 'react';
import { Button, ListGroup } from 'react-bootstrap';
import SimpleBar from 'simplebar-react';
import { connect } from 'react-redux';

const ChatPopupBody = ({ msg = [] }) => {
    return (
        <SimpleBar className="nicescroll-bar h-100">
            <div className="chat-content">
                {msg && msg.length > 0 ? (
                    msg.map((message, index) => (
                        <div key={index} className={`chat-msg ${message.types || 'received'}`}>
                            <div className="msg-bubble-pro">
                                <div className="msg-text-pro">{message.text}</div>
                                {message.time && <div className="msg-time-pro">{message.time}</div>}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-muted">No messages yet. Start a conversation!</p>
                )}
            </div>
        </SimpleBar>
    )
}

const mapStateToProps = ({ chatPopupReducer }) => {
    return {
        msg: chatPopupReducer.msg || []
    };
};

export default connect(mapStateToProps)(ChatPopupBody);
