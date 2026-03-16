import React from 'react';
import SimpleBar from 'simplebar-react';

const ChatBody = () => {
    return (
        <SimpleBar className="nicescroll-bar">
            <div className="chat-content">
                <p>No chat messages</p>
            </div>
        </SimpleBar>
    )
}

export default ChatBody
