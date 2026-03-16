import {
    DATA_HOVER,
    TOGGLE_COLLAPSED_NAV,
    TOGGLE_TOP_NAV
} from '../constants/Theme';

export function toggleCollapsedNav(navCollapsed) {
    return {
        type: TOGGLE_COLLAPSED_NAV,
        navCollapsed
    };
}

export function toggleTopNav(topNavCollapsed) {
    return {
        type: TOGGLE_TOP_NAV,
        topNavCollapsed
    };
}

export const sidebarDataHover = (dataHover) => {
    return {
        type: DATA_HOVER,
        dataHover
    };
}