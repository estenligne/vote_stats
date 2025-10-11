import store from 'store';
import { openPage } from 'pages';
import { currentLanguage, changeLanguage } from 'i18n';
import { updateElement } from 'spart';
import { _fetch, showProblemDetail } from 'fetch';

let page_content = null;

function setData(data) {
	if (data == null) {
		return fetchData();
	}
	page_content.innerHTML = "Hello Word!\n\n" + JSON.stringify(data);
}

async function fetchData() {
	const response = await _fetch("/api/home/info");

	if (!response.ok) {
		showProblemDetail(response);
		return []; // pretend an empty list
	}

	const data = await response.json();
	store.putData(data);
	setData(data);
}

async function openHomePage() {
	const page = openPage('home', { level: 1 });
	if (page.childElementCount) {
		return;
	}
	page.addEventListener("page-back", fetchData);
	page.classList.add("flex-column");

	const content = [
		{
			tag: "div", class: "page-header",
			content: [
				{ tag: "span", html: "Vote Stats" },
				{
					tag: "select", class: "app-language",
					props: { value: currentLanguage },
					events: { "change": (e) => changeLanguage(e.target.value)},
					content: [
						{ value: "en", html: "EN" },
						{ value: "fr", html: "FR" }
					]
				}
			]
		},
		{
			tag: "div", class: "page-content",
			callback: (elem) => page_content = elem
		}
	];
	updateElement(page, { content });

	await store.getData().then(setData);
}

export default openHomePage;

