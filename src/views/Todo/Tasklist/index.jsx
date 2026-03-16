import React, { useEffect, useState } from 'react';
import { useWindowWidth } from '@react-hook/window-size';
import classNames from 'classnames';
import TodoHeader from './TodoHeader';
import Body from './Body';

const TaskList = () => {
    const [showAppInfo, setShowAppInfo] = useState(true);
    const vpWidth = useWindowWidth();

    useEffect(() => {
        if (vpWidth < 1199) {
            setShowAppInfo(false);
        }
    }, [vpWidth])

    return (
        <div className="hk-pg-body py-0">
            <div className={classNames("todoapp-wrap", { "todoapp-info-active": showAppInfo })} >
                <div className="todoapp-content">
                    <div className="todoapp-detail-wrap">
                        <TodoHeader />
                        <Body showInfo={() => setShowAppInfo(true)} />
                    </div>
                </div>
            </div>
        </div>

    )
}

export default TaskList
