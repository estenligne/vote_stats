import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: ['local/.env', '.env'] });

const port = process.env.PORT;
const baseURL = 'http://localhost:' + port;

export default defineConfig({
	testDir: './tests',
	timeout: 30_000,
	expect: {
		timeout: 5_000,
	},
	use: {
		baseURL: baseURL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},
	reporter: [['list']],
});
