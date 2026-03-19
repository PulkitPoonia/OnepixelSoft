// DEFAULT_LAYOUT_STYLE inlined to avoid resolver issues when running Node ESM
const DEFAULT_LAYOUT_STYLE = 'default';

export const THEME_CONFIG = {
	navCollapsed: false,
	dataHover: true,
	topNavCollapsed: false,
	layoutStyle: DEFAULT_LAYOUT_STYLE,
	themeVariables: {
		light: {
			'--chat-bg-color': '#ffffff',
			'--chat-text-color': '#000',
			'--sent-bubble-bg': '#d1f7c4',
			'--sent-bubble-text': '#000',
			'--received-bubble-bg': '#f1f1f1',
			'--received-bubble-text': '#000',
		},
		dark: {
			'--chat-bg-color-dark': '#121212',
			'--chat-text-color-dark': '#e9edef',
			'--sent-bubble-bg-dark': '#075e54',
			'--sent-bubble-text-dark': '#fff',
			'--received-bubble-bg-dark': '#2a2f32',
			'--received-bubble-text-dark': '#e9edef',
			// Dashboard-specific dark theme variables
			'--dashboard-bg-dark': '#0f172a',
			'--dashboard-title-dark': '#f1f5f9',
			'--dashboard-subtitle-dark': '#94a3b8',
			'--dashboard-date-dark': '#64748b',
			'--dashboard-card-bg-dark': '#1e293b',
			'--dashboard-card-border-dark': 'rgba(255, 255, 255, 0.08)',
			'--dashboard-card-label-dark': '#cbd5e1',
			'--dashboard-card-sub-dark': '#64748b',
		},
	},
};
