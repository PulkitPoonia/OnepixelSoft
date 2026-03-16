import {
    DATA_HOVER,
    TOGGLE_COLLAPSED_NAV,
    TOGGLE_TOP_NAV,
    TOGGLE_THEME_MODE
} from '../constants/Theme';
import { THEME_CONFIG } from '../../configs/ThemeConfig';

const initTheme = {
    ...THEME_CONFIG,
    themeMode: 'light' // Default to light theme
};

const theme = (state = initTheme, action) => {
    switch (action.type) {
        case TOGGLE_COLLAPSED_NAV:
            return {
                ...state,
                navCollapsed: action.navCollapsed
            };
        case TOGGLE_TOP_NAV:
            return {
                ...state,
                topNavCollapsed: action.topNavCollapsed
            }
        case DATA_HOVER:
            return {
                ...state,
                dataHover: action.dataHover
            }
        case TOGGLE_THEME_MODE:
            const newThemeMode = action.themeMode;
            const themeVariables = THEME_CONFIG.themeVariables[newThemeMode];

            // Apply theme variables to document root
            Object.keys(themeVariables).forEach((key) => {
                document.documentElement.style.setProperty(key, themeVariables[key]);
            });

            return {
                ...state,
                themeMode: newThemeMode, // Update theme mode
            };
        default:
            return state;
    }
};

export default theme