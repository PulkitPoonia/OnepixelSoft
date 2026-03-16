import React from 'react';
import { Modal } from 'react-bootstrap';

const VideoCallModal = ({ show, handleClose }) => {
    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Video Call</Modal.Title>
            </Modal.Header>
            <Modal.Body>Coming soon</Modal.Body>
        </Modal>
    )
}

export default VideoCallModal
