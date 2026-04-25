/**
 * @import { HTMLElementInfo } from 'spart/js/core.js'
 * @import { SPAConfig } from 'spart/js/core.js'
 */
import openPage from 'spart/js/pages.js';
import openHomePage from 'page/home';
import toast from 'spart/js/toast.js';
import { setup, createElement, updateElement } from 'spart/js/core.js';
import {
	isAuthenticated,
	sendParams,
	showProblemDetail,
} from 'spart/js/fetch.js';

/**
 * @param {KeyboardEvent} e
 */
function onKeyPressed(e) {
	if (e.key === 'Enter')
		handleLogin();
}

const login_username = 'login-username';
const login_password = 'login-password';
const new_account_txt = 'Create an anonymous account';

export function openLoginPage() {
	const page = openPage('login', { level: 1 });

	if (page.childElementCount) return;

	/** @type {HTMLElementInfo[]} */
	const content = [
		{
			tag: 'div',
			id: 'login-form',
			content: [
				{ tag: 'h2', text: 'Login' },
				{
					tag: 'div',
					class: 'form-group',
					content: [
						{
							tag: 'label',
							attri: { for: login_username },
							content: [{ tag: 'span', text: 'Username' }, { text: ':' }],
						},
						{
							tag: 'input',
							id: login_username,
							placeholder: 'Username',
							props: { autofocus: 'true' },
						},
					],
				},
				{
					tag: 'div',
					class: 'form-group',
					content: [
						{
							tag: 'label',
							attri: { for: login_password },
							content: [{ tag: 'span', text: 'Password' }, { text: ':' }],
						},
						{
							tag: 'input',
							id: login_password,
							placeholder: 'Password',
							attri: { type: 'password' },
						},
					],
				},
				{
					tag: 'div',
					class: 'form-buttons',
					content: [
						{
							tag: 'button',
							id: 'login-btn',
							text: 'Login',
							events: { click: handleLogin },
						},
						{
							tag: 'button',
							id: 'create-anonymous-btn',
							text: new_account_txt,
							events: { click: createNewAnonymousAccount },
						},
					],
				},
			],
		},
	];

	const loginContainer = createElement({
		tag: 'div',
		id: 'login-container',
		events: { keypress: onKeyPressed },
		content: content,
	});
	page.appendChild(loginContainer);
}

/**
 * @param {MouseEvent} e
 */
function createNewAnonymousAccount(e) {
	const username = /** @type {HTMLInputElement} */ (document.getElementById(login_username));
	const password = /** @type {HTMLInputElement} */ (document.getElementById(login_password));

	const elem = /** @type {HTMLButtonElement} */ (e.target);
	const cancel = "Cancel";

	if (elem.dataset.i18nText == cancel) {
		username.value = '';
		password.value = '';
		username.readOnly = false;
		password.readOnly = false;
		password.type = 'password'; // hide password
		updateElement(elem, { text: new_account_txt });
	} else {
		username.value = 'ANO';
		password.value = window.crypto.randomUUID().replace(/-/g, '');
		username.readOnly = true;
		password.readOnly = true;
		password.type = 'text'; // show password
		updateElement(elem, { text: cancel });
	}
}

async function handleLogin() {
	const usernameElem = /** @type {HTMLInputElement} */ (document.getElementById(login_username));
	const passwordElem = /** @type {HTMLInputElement} */ (document.getElementById(login_password));

	const username = usernameElem.value.trim();
	const password = passwordElem.value.trim();

	if (!username || !password) {
		toast("Username and password are required");
		return;
	}

	const params = new URLSearchParams([
		['username', username],
		['password', password]
	]);

	const response = await sendParams("/api/account/login", "POST", params);
	if (response.ok) {
		await onAuthenticated();
	} else showProblemDetail(response);
}

function onAuthenticated() {
	const homePage = openHomePage();
	return homePage;
}

/**
 * Initialize the chat application
 * @param {SPAConfig} config
 */
export async function initializeApp(config) {
	await setup(config);

	if (isAuthenticated()) {
		await onAuthenticated();
	} else openLoginPage();
}
