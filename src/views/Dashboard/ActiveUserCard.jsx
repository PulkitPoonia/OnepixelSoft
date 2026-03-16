import React from 'react';
import { Card } from 'react-bootstrap';

const ActiveUserCard = () => {
    return (
        <Card className="card-border mb-0 h-100">
            <Card.Header>
                <h6>Active users</h6>
            </Card.Header>
            <Card.Body>
                <p>No data</p>
            </Card.Body>
        </Card>
    )
}

export default ActiveUserCard
