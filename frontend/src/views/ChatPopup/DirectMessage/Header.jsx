import React from 'react';
import { Button } from 'react-bootstrap';
import { X } from 'react-feather';

const Header = ({ close }) => {
    return (
        <div className="chat-header">
            <h6>Direct Message</h6>
            <Button variant="flush-dark" className="btn-icon btn-rounded" onClick={close}>
                <span className="icon">
                    <span className="feather-icon"><X /></span>
                </span>
            </Button>
        </div>
    )
}

export default Header
