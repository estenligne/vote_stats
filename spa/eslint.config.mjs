import js from '@eslint/js';

export default [
	{
		files: ['**/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				window: 'readonly',
				document: 'readonly',
				navigator: 'readonly',
				console: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				URLSearchParams: 'readonly',
				FormData: 'readonly',
			},
		},
		rules: {
			...js.configs.recommended.rules,
			indent: ['error', 'tab'],
		},
	},
];
