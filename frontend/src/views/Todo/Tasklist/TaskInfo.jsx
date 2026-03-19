import React from 'react';
import { Button, Card } from 'react-bootstrap';
import SimpleBar from 'simplebar-react';

const TaskInfo = ({ close }) => {
    return (
        <div className="task-info">
            <SimpleBar className="nicescroll-bar">
                <Button bsPrefix="btn-close" className="info-close" onClick={close}>
                    <span aria-hidden="true">×</span>
                </Button>
                <div className="file-name">No task selected</div>
                <Card>
                    <Card.Body>
                        <p>Task details will appear here</p>
                    </Card.Body>
                </Card>
            </SimpleBar>
        </div>
    )
}

export default TaskInfo
