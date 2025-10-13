import { openPage } from 'pages';
import { toast, newBusyToast, removeToast, updateElement } from 'spart';
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

function updateAbsentees(form) {
	const numberOfVoters = Number(form.querySelector("#numberOfVoters").value);
	const invalidVotes = Number(form.querySelector("#invalidVotes").value);
	const totalVotes = Number(form.querySelector("#totalVotes").innerText);
	const absentees = form.querySelector("#absentees");

	if (numberOfVoters && totalVotes)
		absentees.textContent = numberOfVoters - (invalidVotes + totalVotes);
	else absentees.textContent = "";
}

function onVotesChanged(e) {
	const form = e.target.closest('form');
	const inputs = form.querySelectorAll('input.candidate');

	let total = 0;
	inputs.forEach(input => total += Number(input.value));

	const totalVotes = form.querySelector("#totalVotes");
	totalVotes.textContent = total ? total : "";
	updateAbsentees(form);
}

function onNumberOfVoters(e) {
	const form = e.target.closest('form');
	updateAbsentees(form);
}

function onInvalidVotes(e) {
	const form = e.target.closest('form');
	updateAbsentees(form);
}

async function openAddPage(data) {
	const page = openPage("add");
	if (page.childElementCount)
		return;
	page.classList.add("flex-column");

	let page_content = null;

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

	data.regions = [
		"", "Adamaoua", "Centre", "Est", "Extrême-Nord", "Littoral",
		"Nord", "Nord-Ouest", "Ouest", "Sud", "Sud-Ouest", "Abroad"
	].map((x) => ({ value: x, text: x }));

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

	const form_content = [
		{ tag: "label", for: "form-region", text: "Region" },
		{ tag: "select", id: "form-region", name: "region", class: "form-control", required: true, content: data.regions },

		{ tag: "label", for: "department", text: "Department" },
		{ tag: "input", id: "department", name: "department", class: "form-control", required: true, maxlength: "127" },

		{ tag: "label", for: "district", text: "District" },
		{ tag: "input", id: "district", name: "district", class: "form-control", required: true, maxlength: "127" },

		{ tag: "label", for: "pollingCenter", text: "Polling Center" },
		{ tag: "input", id: "pollingCenter", name: "pollingCenter", class: "form-control", required: true, maxlength: "127" },

		{ tag: "label", for: "centerNumber", text: "Center Number" },
		{ tag: "input", id: "centerNumber", name: "centerNumber", class: "form-control", required: true, min: "1", type: "number" },

		{ tag: "label", for: "pollingStation", text: "Polling Station" },
		{ tag: "input", id: "pollingStation", name: "pollingStation", class: "form-control", required: true, maxlength: "15" },

		{ tag: "span" },
		{ tag: "i", text: "Upload a .pdf, .zip or .tar.gz file" },

		{ tag: "label", for: "resultsDocument", text: "Results Document" },
		{
			tag: "input", id: "resultsDocument", name: "resultsDocument", class: "form-control", required: true,
			type: "file", accept: "application/pdf,application/zip,application/x-tar,application/gzip"
		},

		{ tag: "label", for: "numberOfVoters", text: "Number of Voters" },
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
		"data-id": data.id,
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
					tag: "button", type: "submit",
					class: "btn btn-primary", text: "Submit"
				}]
			}
		]
	}];
	updateElement(page_content, { content });
}

export default openAddPage;

