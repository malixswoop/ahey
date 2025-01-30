/* global axios, Vue, cabin */

let swReg = null;
const urlB64ToUint8Array = (base64String) => {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
};
function getMeta(metaName) {
	const metas = document.getElementsByTagName("meta");
	for (let i = 0; i < metas.length; i++) {
		if (metas[i].getAttribute("name") === metaName) {
			return metas[i].getAttribute("content");
		}
	}
	return null;
}

function redirect(path, replace = false) {
	if (replace) window.location.replace(path);
	else window.location.href = path;
}

const initServiceWorker = async () => {
	if ("serviceWorker" in navigator) {
		swReg = await navigator.serviceWorker.register("/sw.js");
		navigator.serviceWorker.addEventListener("message", (event) => {
			if (!event.data.action) return;
			switch (event.data.action) {
				default:
					break;
			}
		});
	}
};

const defaultState = function () {
	const searchParams = new URLSearchParams(window.location.search);
	const page = getMeta("ahey-page");
	const username = getMeta("ahey-username");
	const channel = getMeta("ahey-channel");
	const query = searchParams.get("q");

	return {
		online: navigator.onLine,
		visible: document.visibilityState === "visible",
		isLoading: true,
		isSaving: false,
		page,
		toast: [{ type: "", message: "" }],
		newAccount: { username: "", email: "", password: "" },
		authCreds: { username: "", password: "" },
		username,
		channel,
		me: { username: "", email: "", password: "", savedChannels: [] },
		pushes: [],
		channelSubscribersCount: 0,
		deviceInfo: {},
		channels: [],
		pushBody: "",
		channelName: "",
		myAccount: {},
		query,
		showLoadMore: false,
		urlState: searchParams.get("state"),
	};
};

const App = Vue.createApp({
	data() {
		return defaultState();
	},
	computed: {
		pushEnabled() {
			return this.deviceInfo !== null;
		},
	},
	methods: {
		setNetworkStatus() {
			this.online = navigator.onLine;
		},
		setVisibility() {
			this.visible = document.visibilityState === "visible";
		},
		resetState() {
			const newState = defaultState();
			Object.keys(newState).map((key) => (this[key] = newState[key]));
		},
		setToast(message, type = "error") {
			this.toast = { type, message, time: new Date().getTime() };
			setTimeout(() => {
				if (new Date().getTime() - this.toast.time >= 3000) {
					this.toast.message = "";
				}
			}, 3500);
		},
		signUp() {
			if (!this.newAccount.username || !this.newAccount.email || !this.newAccount.password) {
				return this.setToast("All fields are mandatory");
			}
			axios.post("/api/signup", this.newAccount).then(this.authenticate);
		},
		signIn() {
			if (!this.authCreds.username || !this.authCreds.password) {
				return this.setToast("Please enter valid details");
			}
			axios.post("/api/login", this.authCreds).then(this.authenticate);
		},
		forgotPassword() {
			if (!this.authCreds.username) {
				return this.setToast("Please enter your username");
			}
			axios.post("/api/reset", { username: this.authCreds.username }).then((response) => {
				this.setToast(response.data.message, "success");
			});
		},
		authenticate(response) {
			window.localStorage.username = this.username = response.data.username;
			this.newAccount = { username: "", email: "", password: "" };
			this.authCreds = { username: "", password: "" };
			redirect(this.urlState ?? "/", true);
			this.setToast(response.data.message, "success");
		},
		getMe(queryParams = "") {
			axios.get(`/api/me${queryParams}`).then((response) => {
				window.localStorage.username = this.username = response.data.username;
				this.me = { ...this.me, ...response.data };
				this.myAccount = { ...this.me };
			});
		},
		resendVerification() {
			axios.post("/api/resend").then((response) => {
				this.setToast(response.data.message, "success");
			});
		},
		updateAccount() {
			const { email, password } = this.myAccount;
			axios.put("/api/account", { email, password }).then((response) => {
				this.setToast(response.data.message, "success");
			});
		},
		async subscribeToPush() {
			if (swReg) {
				try {
					const vapidKey = (await axios.get("/api/meta")).data.vapidKey;
					if (vapidKey) {
						const pushSubscription = await swReg.pushManager.subscribe({
							userVisibleOnly: true,
							applicationServerKey: urlB64ToUint8Array(vapidKey),
						});
						const credentials = JSON.parse(JSON.stringify(pushSubscription));
						await axios.post("/api/device", { credentials });
						this.getDevice();
					}
					return true;
				} catch (err) {
					console.log(err);
					if (this.page === "home") {
						this.setToast("Unable to enable notification, please try again.", "error");
					}
					return false;
				}
			}
		},
		getDevice() {
			this.isLoading = true;
			axios
				.get("/api/device")
				.then((response) => {
					this.deviceInfo = response.data.device;
					this.channels = response.data.device?.subscribedChannels;

					// Update the push credentials in server if its more than a day old
					if (
						response.data.device?.lastUpdatedOn &&
						(new Date(response.data.device?.lastUpdatedOn) - new Date()) / 1000 > 86400
					) {
						this.subscribeToPush();
					}
				})
				.finally(() => (this.isLoading = false));
		},
		push(channel, body) {
			this.isSaving = true;
			axios
				.post(`/api/push/${channel}`, { body })
				.then((response) => {
					this.setToast(response.data.message, "success");
					this.pushBody = "";
					this.pushes = [];
					this.channelSubscribersCount = 0;
					this.pull(channel);
				})
				.finally(() => (this.isSaving = false));
		},
		pull(channel) {
			this.isLoading = true;
			const params = {};
			if (this.pushes.length > 0) params["skip"] = this.pushes.length;
			axios
				.get(`/api/pull/${channel}`, { params })
				.then((response) => {
					if (response.data.pushes.length > 0) {
						response.data.pushes.forEach((m) => this.pushes.push(m));
					}
					this.channelSubscribersCount = response.data.subscribers;
					this.showLoadMore = response.data.pushes.length == 50;
				})
				.finally(() => (this.isLoading = false));
		},
		saveChannel(channel) {
			axios.post("/api/channels/save", { channel }).then((response) => {
				this.setToast(response.data.message, "success");
				this.getMe();
			});
		},
		unsaveChannel(channel) {
			axios.post("/api/channels/unsave", { channel }).then((response) => {
				this.setToast(response.data.message, "success");
				this.getMe();
			});
		},
		subscribeChannel(channel) {
			axios.post("/api/channels/subscribe", { channel }).then((response) => {
				this.setToast(response.data.message, "success");
				this.getDevice();
			});
		},
		unsubscribeChannel(channel) {
			axios.post("/api/channels/unsubscribe", { channel }).then((response) => {
				this.setToast(response.data.message, "success");
				this.getDevice();
			});
		},
		generateAPIKey() {
			this.isSaving = true;
			axios
				.post("/api/key")
				.then((response) => {
					this.setToast(response.data.message, "success");
					this.getMe("?apiKeys=true");
				})
				.finally(() => (this.isSaving = false));
		},
		deleteAPIKey(key) {
			if (confirm("Are you sure, you want to delete this API key? There is no undo.")) {
				axios.delete("/api/key/" + key).then((response) => {
					this.setToast(response.data.message, "success");
					this.getMe("?apiKeys=true");
				});
			}
		},
		displayDate(datestring) {
			const seconds = Math.floor((new Date() - new Date(datestring)) / 1000);
			let interval = seconds / 31536000;
			const agoString = (val, timeIdentifier) => `${val} ${timeIdentifier}${val > 1 ? "s" : ""} ago`;
			if (interval > 1) return agoString(Math.floor(interval), "year");
			interval = seconds / 2592000;
			if (interval > 1) return agoString(Math.floor(interval), "month");
			interval = seconds / 86400;
			if (interval > 1) return agoString(Math.floor(interval), "day");
			interval = seconds / 3600;
			if (interval > 1) return agoString(Math.floor(interval), "hour");
			interval = seconds / 60;
			if (interval > 1) return agoString(Math.floor(interval), "minute");
			return "now";
		},
		linkify: function (str) {
			if (!str) return "";
			return linkifyHtml(str, {
				attributes: { rel: "noopener noreferrer" },
				target: { url: "_blank" },
				formatHref: {
					mention: (href) => `@${href.substring(1)}`,
					hashtag: (href) => href.substring(1),
				},
			});
		},
		logOut(autoSignOut) {
			const localClear = () => {
				window.localStorage.clear();
				this.resetState();
				redirect("/");
			};
			if (autoSignOut || confirm("Are you sure, you want to log out?")) axios.post("/api/logout").finally(localClear);
		},
		logError(message, source, lineno, colno) {
			const error = { message, source, lineno, colno, username: this.username, page: this.page };
			axios.post("/api/error", { error }).then(() => {});
			return true;
		},
		init() {
			this.getDevice();
			if (this.username) {
				this.getMe();
			}
		},
	},
}).mount("#app");

window.addEventListener("online", App.setNetworkStatus);
window.addEventListener("offline", App.setNetworkStatus);
document.addEventListener("visibilitychange", App.setVisibility);
window.onerror = App.logError;

(() => {
	const csrfToken = getMeta("csrf-token");
	if (csrfToken) {
		axios.defaults.headers.common["x-csrf-token"] = csrfToken;
	}

	axios.interceptors.request.use((config) => {
		window.cancelRequestController = new AbortController();
		return { ...config, signal: window.cancelRequestController.signal };
	});

	axios.interceptors.response.use(
		(response) => response,
		(error) => {
			console.log(error);
			if (error.request.responseURL.endsWith("api/me") && error.response.status === 401) {
				return App.logOut(true);
			}
			App.setToast(error.response.data.message || "Something went wrong. Please try again");
			throw error;
		}
	);
	initServiceWorker();
	App.init();
})();
