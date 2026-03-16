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
		},
	},
};
