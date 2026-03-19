import React from 'react';
import { Modal } from 'react-bootstrap';

const AudioCallModal = ({ show, handleClose }) => {
    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Audio Call</Modal.Title>
            </Modal.Header>
            <Modal.Body>Coming soon</Modal.Body>
        </Modal>
    )
}

export default AudioCallModal
