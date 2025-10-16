import store from 'store';
import openPage from 'pages';
import openAddPage from 'add';
import { currentLanguage, changeLanguage } from 'i18n';
import { newBusyToast, removeToast, updateElement } from 'spart';
import { _fetch, showProblemDetail } from 'fetch';

let page_content = null;
let refreshBtn = {};

function setData(data) {
	if (data == null) {
		return fetchData();
	}

	let sum = 0;
	data.candidates.forEach((x) => sum += x.votes);

	const results = data.candidates.map((x) => ({
		tag: "tr",
		content: [
			{ html: x.name },
			{ text: x.party },
			{ html: x.votes },
			{ html: sum ? (x.votes * 100 / sum).toFixed(2) : null }
		]
	}));

	results.unshift({
		tag: "tr",
		content: [
			{ tag: "th", text: "Candidate" },
			{ tag: "th", text: "Party" },
			{ tag: "th", text: "Votes" },
			{ tag: "th", html: "%" }
		]
	});

	results.push({
		tag: "tr",
		style: "font-weight: bold",
		content: [
			{ text: "Total" },
			{ html: null },
			{ html: sum },
			{ html: sum ? 100 : null }
		]
	});

	const content = [
		{
			tag: "div", html: data.title
		},
		{
			tag: "table", class: "vote-results", content: results
		},
		{
			tag: "p", class: "submit-results",
			content: [{
				tag: "button",
				class: "btn btn-success",
				text: "Submit results",
				events: { click: () => openAddPage(data) }
			}]
		}
	];
	updateElement(page_content, { content });
}

async function fetchData() {
	const busy = newBusyToast();
	refreshBtn.classList.add("disabled");

	const params = new URLSearchParams(window.location.search);
	const id = Number(params.get('id')) || 1;

	const response = await _fetch("/api/home-info?id=" + id);
	const data = await response.json();

	removeToast(busy);
	refreshBtn.classList.remove("disabled");

	if (!response.ok) {
		showProblemDetail(response);
		return []; // pretend an empty list
	}

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

	const right_items = [
		{
			tag: "i",
			class: "refresh-button bi bi-arrow-clockwise",
			title: "Refresh data",
			events: { click: fetchData },
			callback: (elem) => refreshBtn = elem
		},
		/*{
			tag: "i",
			class: "bi bi-three-dots-vertical",
			events: { click: showMenu }
		}*/
		{
			tag: "select", class: "app-language",
			props: { value: currentLanguage },
			events: { "change": (e) => changeLanguage(e.target.value) },
			content: [
				{ value: "en", html: "EN" },
				{ value: "fr", html: "FR" }
			]
		}
	];

	const content = [
		{
			tag: "div", class: "page-header",
			content: [
				{ tag: "span", html: "Vote Stats" },
				{ tag: "div", style: "float: right", content: right_items }
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

