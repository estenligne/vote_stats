
class DataStore {
	#data = null;

	constructor() {
	}

	getData() {
		return Promise.resolve(this.#data);
	}

	putData(data) {
		this.#data = data;
	}
}

const store = new DataStore();
export default store;
