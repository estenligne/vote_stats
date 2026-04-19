importScripts("/spart-sw/caching.js");

const appAssets = [
	"/app",
	"/favicon.ico",
	"/icons/logo-192x192.png",
	"/icons/logo-512x512.png",
	"/lib/bootstrap/bootstrap.min.css",
	"/lib/bootstrap/bootstrap.bundle.min.js",
	"/lib/bootstrap/bootstrap-icons.min.css",
	"/lib/bootstrap/fonts/bootstrap-icons.woff",
	"/lib/bootstrap/fonts/bootstrap-icons.woff2",
	"/build/app.css",
	"/build/app.js",
	"/i18n/fr.json",
	"/i18n/en.json"
];

setupCaching(null, appAssets, null);
