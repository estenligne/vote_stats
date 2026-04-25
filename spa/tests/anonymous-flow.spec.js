import { expect, test } from '@playwright/test';

test('Anonymous user signs in and navigates the pages', async ({ page }) => {
	await page.goto('/');

	page.on('console', msg => {
		console.log(`BROWSER LOG: ${msg.type()} - ${msg.text()}`);
	});

	const usernameInput = page.locator('#login-username');
	const passwordInput = page.locator('#login-password');

	await usernameInput.fill('ANO');
	await passwordInput.fill('A72EB447A2EA4D399B65D0F27C1DF18A');

	const loginButton = page.getByRole('button', { name: /^login$/i });
	await expect(loginButton).toBeVisible();
	loginButton.click();

	const submitResult = page.locator('[data-i18n-text="Submit results"]');
	await expect(submitResult).toBeVisible();
	await submitResult.click();

	const submitButton = page.getByRole('button', { name: 'Submit' });
	await expect(submitButton).toBeVisible();
});
