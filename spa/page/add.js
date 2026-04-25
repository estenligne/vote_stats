/**
 * @import { HTMLElementInfo } from 'spart/js/core.js'
 */
import { openPage } from 'spart/js/pages.js';
import { updateElement } from 'spart/js/core.js';
import { toast, newBusyToast, removeToast } from 'spart/js/toast.js';
import { sendForm, showProblemDetail } from 'spart/js/fetch.js';

/**
 * @param {MouseEvent} e
 */
function submitForm(e) {
	if (e.preventDefault) e.preventDefault();
	const busy = newBusyToast();

	const target = /** @type {HTMLFormElement} */ (e.target);

	const id = target.dataset.id;
	console.log("Will submit form for election id", id);

	const fd = new FormData(target);
	const url = "/api/voting-results?id=" + id;

	sendForm(url, "POST", fd)
		.then(async (response) => {
			removeToast(busy);
			if (!response.ok) {
				showProblemDetail(response);
			}
			else {
				toast("Data submitted", 2);
				window.history.back();
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

/**
 * @param {HTMLFormElement} form
 */
function updateAbsentees(form) {
	const numberOfVoters = Number(form.querySelector("#numberOfVoters").value);
	const invalidVotes = Number(form.querySelector("#invalidVotes").value);
	const totalVotes = Number(form.querySelector("#totalVotes").innerText);
	const absentees = form.querySelector("#absentees");

	if (numberOfVoters && totalVotes) {
		const n = numberOfVoters - (invalidVotes + totalVotes);
		absentees.textContent = n.toString();
	}
	else absentees.textContent = "";
}

/**
 * @param {MouseEvent} e
 */
function onVotesChanged(e) {
	const target = /** @type {HTMLFormElement} */ (e.target);

	const form = target.closest('form');
	const inputs = form.querySelectorAll('input.candidate');

	let total = 0;
	inputs.forEach(input => total += Number(input.value));

	const totalVotes = form.querySelector("#totalVotes");
	totalVotes.textContent = total ? total : "";
	updateAbsentees(form);
}

/**
 * @param {MouseEvent} e
 */
function onNumberOfVoters(e) {
	const target = /** @type {HTMLFormElement} */ (e.target);
	const form = target.closest('form');
	updateAbsentees(form);
}

/**
 * @param {MouseEvent} e
 */
function onInvalidVotes(e) {
	const target = /** @type {HTMLFormElement} */ (e.target);
	const form = target.closest('form');
	updateAbsentees(form);
}

async function openAddPage(data) {
	const page = openPage("add");
	if (page.childElementCount)
		return;
	page.classList.add("flex-column");

	let page_content = null;

	/** @type {HTMLElementInfo[]} */
	let content = [
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

	/** @type {HTMLElementInfo[]} */
	const regions = [{ value: "", text: "", hidden: true }];
	const regionIds = data.locations[data.countryId].children;

	for (let i = 0; i < regionIds?.length; i++) {
		const id = regionIds[i];
		const item = {
			value: id,
			text: data.locations[id].name
		};
		regions.push(item);
	};

	const candidates = [];
	data.candidates.forEach((c) => {
		const id = "candidate_" + c.id;
		candidates.push({ tag: "label", for: id, html: c.name });
		candidates.push({
			tag: "input", id: id, name: id,
			class: "form-control candidate",
			type: "number", min: "0",
			events: { change: onVotesChanged }
		});
	});

	/** @type {HTMLElementInfo[]} */
	const form_content = [
		{ tag: "label", for: "form-region", text: "Region" },
		{ tag: "select", id: "form-region", name: "region", class: "form-control", required: true, content: regions },

		{ tag: "label", for: "division", text: "Division" },
		{ tag: "input", id: "division", name: "division", class: "form-control", required: true, maxlength: "127" },

		{ tag: "label", for: "district", text: "District" },
		{ tag: "input", id: "district", name: "district", class: "form-control", required: true, maxlength: "127" },

		{ tag: "label", for: "pollingCenter", text: "Polling Center" },
		{ tag: "input", id: "pollingCenter", name: "pollingCenter", class: "form-control", required: true, maxlength: "127" },

		{ tag: "label", for: "centerNumber", text: "Center Number" },
		{ tag: "input", id: "centerNumber", name: "centerNumber", class: "form-control", required: true, min: "1", type: "number" },

		{ tag: "label", for: "pollingStation", text: "Polling Station" },
		{ tag: "input", id: "pollingStation", name: "pollingStation", class: "form-control", required: true, maxlength: "15" },

		{ tag: "i", text: "Upload a .pdf, .zip or .tar.gz file", style: "grid-column: 1 / span 2" },

		{ tag: "label", for: "resultsDocument", text: "Results Document" },
		{
			tag: "input", id: "resultsDocument", name: "resultsDocument", class: "form-control", required: true,
			type: "file", accept: "application/pdf,application/zip,application/x-tar,application/gzip"
		},

		{ tag: "label", for: "numberOfVoters", text: "Number of Registrants" },
		{ tag: "input", id: "numberOfVoters", name: "numberOfVoters", class: "form-control", required: true, min: "0", type: "number", events: { change: onNumberOfVoters } },

		{ tag: "label", for: "invalidVotes", text: "Invalid Votes" },
		{ tag: "input", id: "invalidVotes", name: "invalidVotes", class: "form-control", min: "0", type: "number", events: { change: onInvalidVotes } },

		...candidates,

		{ tag: "b", text: "Total Votes" },
		{ tag: "b", id: "totalVotes" },

		{ tag: "span", text: "Absents Voters" },
		{ tag: "span", id: "absentees" }
	];

	content = [{
		tag: "form",
		attri: { "data-id": data.id },
		events: { submit: submitForm },
		content: [
			{
				tag: "div", class: "form-content",
				content: form_content
			},
			{
				tag: "div",
				style: "text-align: center; margin-top: 1em",
				content: [{
					tag: "button",
					attri: { type: "submit" },
					class: "btn btn-primary", text: "Submit"
				}]
			}
		]
	}];
	updateElement(page_content, { content });
}

export default openAddPage;
