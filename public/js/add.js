import { openPage } from 'pages';
import { newBusyToast, removeToast, updateElement } from 'spart';
import { _fetch, sendForm, showProblemDetail } from 'fetch';

function submitForm(e) {
	if (e.preventDefault) e.preventDefault();
	const busy = newBusyToast();

	const id = e.target.dataset.id;
	console.log("Will submit form for election id", id);

	const fd = new FormData(e.target);
	const url = "/api/voting-results?id=" + id;

	sendForm(url, "POST", fd)
		.then(async (response) => {
			removeToast(busy);
			if (!response.ok) {
				showProblemDetail(response);
			}
			else {
				toast("Data submitted", 1);
				window.navigator.back();
			}
		});

	return false; // prevent the default form behavior
}

function getBackBtn() {
	return {
		tag: "i", class: "bi bi-arrow-left-circle",
		title: "Back", style: "margin-right: 14px",
		events: { click: () => window.history.back() }
	};
}

async function openAddPage(data) {
	const page = openPage("add");
	if (page.childElementCount)
		return;
	page.classList.add("flex-column");

	let page_content = null;

	const content = [
		{
			tag: "div", class: "page-header",
			content: [
				getBackBtn(),
				{ tag: "span", text: "Submit results" }
			]
		},
		{
			tag: "div", class: "page-content",
			callback: (elem) => page_content = elem
		}
	];
	updateElement(page, { content });

	const form_content = [
		{ tag: "label", for: "region", text: "Region" },
		{ tag: "input", id: "region", name: "region", class: "form-control", required: true, maxlength: "127" },

		{ tag: "label", for: "departement", text: "Departement" },
		{ tag: "input", id: "departement", name: "departement", class: "form-control", required: true, maxlength: "127" },

		{ tag: "label", for: "arrondissement", text: "Arrondissement" },
		{ tag: "input", id: "arrondissement", name: "arrondissement", class: "form-control", required: true, maxlength: "127" },

		{ tag: "label", for: "center-name", text: "Polling Center" },
		{ tag: "input", id: "center-name", name: "pollingCenter", class: "form-control", required: true, maxlength: "127" },

		{ tag: "label", for: "center-code", text: "Center Number" },
		{ tag: "input", id: "center-code", name: "centerNumber", class: "form-control", required: true, min: "1", type: "number" },

		{ tag: "label", for: "polling-room", text: "Inner polling room" },
		{ tag: "input", id: "polling-room", name: "pollingRoom", class: "form-control", required: true, maxlength: "15" },

		{ tag: "label", for: "photo-results", text: "Photo Results" },
		{
			tag: "input", id: "photo-results", name: "photoResults", class: "form-control", required: true,
			type: "file", accept: "image/*", capture: "rear"
		},

		{ tag: "span" },
		{ tag: "span", text: "Votes:" }
	];

	data.candidates.forEach((c) => {
		const id = "candidate_" + c.id;
		form_content.push({ tag: "label", for: id, html: c.name });
		form_content.push({
			tag: "input",
			id: id,
			name: id,
			class: "form-control",
			type: "number",
			min: "0"
		});
	});

	updateElement(page_content, { content: [{
		tag: "form",
		"data-id": data.id,
		events: { submit: submitForm },
		content: [
			{
				tag: "div", class: "form-content",
				content: form_content
			},
			{
				tag: "div", class: "text-center mt-3",
				content: [{
					tag: "button", type: "submit",
					class: "btn btn-primary", text: "Submit"
				}]
			}
		]
	}] });
}

export default openAddPage;

