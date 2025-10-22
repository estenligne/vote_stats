import store from 'store';
import openPage from 'pages';
import openAddPage from 'add';
import { currentLanguage, changeLanguage } from 'i18n';
import { newBusyToast, removeToast, updateElement } from 'spart';
import { _fetch, showProblemDetail } from 'fetch';

let page_content = null;
let refreshBtn = {};

const filter = {
	regionId: 0,
	divisionId: 0,
	districtId: 0,
};

function getSelectItems(filters, label, data, parentId, key) {
	const ids = data.locations[parentId]?.children;
	if (!ids)
		return null;

	const events = {
		change: (e) => {
			filter[key] = e.target.value;

			if (key == "regionId")
			{
				filter.divisionId = 0;
				filter.districtId = 0;
			}

			if (key == "divisionId")
			{
				filter.districtId = 0;
			}

			fetchData();
		}
	};
	const content = [{ value: 0, text: "All" }];

	for (let i = 0; i < ids.length; i++) {
		const id = ids[i];
		const name = data.locations[id].name;
		const selected = id == filter[key] ? true : null;
		content.push({ value: id, text: name, selected });
	};

	filters.push({ tag: "label", text: label });
	filters.push({ tag: "select", class: "form-control", content, events });
}

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

	const filters = [];
	getSelectItems(filters, "Region", data, data.countryId, "regionId");
	getSelectItems(filters, "Division", data, filter.regionId, "divisionId");
	getSelectItems(filters, "District", data, filter.divisionId, "districtId");
	const filterSection = { tag: "div", class: "form-content", content: filters };

	const content = [
		{
			tag: "p", html: data.title
		},
		filterSection,
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

	if (!params.get('id'))
		params.set('id', '1');

	params.set('regionId', filter.regionId);
	params.set('divisionId', filter.divisionId);
	params.set('districtId', filter.districtId);

	const response = await _fetch("/api/home-info?" + params.toString());
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

