
import { combineReducers } from 'redux';
import ChatReducer from './Chat';
import ChatPopupReducer from './ChatPopup';
// ...existing code...
import Theme from './Theme';
import ToDoReducer from './ToDo';
import FileManagerReducer from './FileManager';

const reducers = combineReducers({
    theme: Theme,
    chatReducer: ChatReducer,
    // ...existing code...
    chatPopupReducer: ChatPopupReducer,
    toDoReducer: ToDoReducer,
    fileManagerReducer: FileManagerReducer,
});

export default reducers;