import 'spart/css/spart.css';
import './css/login.css';
import './css/home.css';
import './css/add.css';

import './SVGs.js';
import { initializeApp } from './page/login.js';

initializeApp({ isProgressiveWebApp: true }).then(() => {
	document.getElementById("app-loading-indicator").hidden = true;

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register("/sw.js")
			.then(() => console.debug("Ready!"))
			.catch(err => console.error("SW registration failed:", err));
	}
});
