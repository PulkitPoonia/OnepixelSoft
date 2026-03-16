import { compose, createStore, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";
import reducers from "../reducer";

const configureStore = (preloadedState) => {

    const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
    const store = createStore(reducers, preloadedState, composeEnhancers(applyMiddleware(thunk)));

    return store;
}

const store = configureStore();

export default store;