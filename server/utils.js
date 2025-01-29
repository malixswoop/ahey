const rateLimiter = require("express-rate-limit");
const webPush = require("web-push");
const crypto = require("crypto");
const { URL } = require("url");

const config = require("./config");
const { Users, Devices } = require("./schema").getInstance();

/**
 * Returns the username if valid else throws an error using httpError function
 * @param  {string} username - Username to be validated
 * @return {string} Valid username
 */
const getValidUsername = (username) => {
	if (!username) return httpError(400, "Invalid username");
	if (config.INVALID_HANDLES.includes(username.toLowerCase())) return httpError(400, "Invalid username");
	const usernameRegex = /^([a-zA-Z0-9-]){1,18}$/;
	if (!usernameRegex.test(username)) return httpError(400, "Invalid username. Max. 18 alphanumeric chars & -.");
	return username.toLowerCase();
};

/**
 * Returns the channel if valid else throws an error using httpError function
 * @param  {string} channel - Channel name to be validated
 * @return {string} Valid channel name
 */
const getValidChannelName = (channel) => {
	if (!channel) return httpError(400, "Invalid channel");
	const channelRegex = /^([a-zA-Z0-9@-]){1,36}$/;
	if (!channelRegex.test(channel)) return httpError(400, "Invalid channel. Max. 36 alphanumeric chars & -.");
	return channel.toLowerCase();
};

/**
 * Returns true if the channel is a user channel
 * @param  {string} channel - Channel name to be validated
 * @return {boolean}
 */
const isUserChannel = (channel) => {
	if (!channel) return httpError(400, "Invalid channel");
	return channel.startsWith("@");
};

/**
 * Returns the email if valid else throws an error using httpError function
 * @param  {string} email - Email to be validated
 * @return {string} Valid email
 */
const getValidEmail = (email) => {
	if (!email) return httpError(400, "Empty email");
	if (!isValidEmail(email)) return httpError(400, "Invalid email");
	return email;
};

/**
 * Returns the url if valid else throws an error using httpError function
 * @param  {string} url - URL to be validated
 * @return {string} Valid URL
 */
const getValidURL = (url) => {
	if (!url) return httpError(400, "Empty URL");
	if (!isValidUrl(url) || url.length > 2000) return httpError(400, "Invalid URL");
	return url;
};

/**
 * Return true if the given email is a valid one, else returns false.
 * @param  {string} email - Emaill address to be validated
 * @return {boolean}
 */
const isValidEmail = (email) => {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Return true if the given url is a valid one, else returns false.
 * @param  {string} url - URL to be validated
 * @return {boolean}
 */
const isValidUrl = (url) => {
	try {
		const _url = new URL(url);
		return ["http:", "https:"].includes(_url.protocol) ? Boolean(_url) : false;
	} catch (e) {
		console.error(e);
		return false;
	}
};

/**
 * Return a sanitized text to save and render in the UI
 * @param  {string} text
 * @return {string}
 */
const sanitizeText = (text) => {
	if (!text) return "";
	const tagsToReplace = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
	const replaceTag = (tag) => tagsToReplace[tag] || tag;
	const safe_tags_replace = (str) => str.replace(/[&<>]/g, replaceTag);
	return safe_tags_replace(text.replace("\b", ""));
};

/**
 * Returns a sha256 hashed string, adds an optional secret that can be configured in config.js
 * @param  {string} str - string to be hashed
 * @return {string} Hashed string
 */
const hashString = (str) => {
	return crypto
		.createHash("sha256")
		.update(str + config.SECRET)
		.digest("hex");
};

/**
 * Returns a sha256 hashed string, adds an optional secret that can be configured in config.js
 * @param  {string} password - password string to be hashed
 * @return {string} Hashed password
 */
const getValidPassword = (password) => {
	if (!password) return httpError(400, "Invalid password");
	if (password.length < 8) return httpError(400, "Password length should be atleast 8 characters");
	return hashString(password);
};

/**
 * Returns a valid push body text
 * @param  {string} body - body of the push message
 * @return {string} Valid trimmed body
 */
const getValidPushBody = (body) => {
	if (!body) return httpError(400, "Empty body");
	if (body.length > 160) sanitizeText(body.substring(0, 160));
	return sanitizeText(body);
};

/**
 * This is an Express js middleware to attach the request user to req.user path.
 * @param  {object}   req  - Express.js Request object. https://expressjs.com/en/5x/api.html#req
 * @param  {[type]}   res  - Express.js Response object. https://expressjs.com/en/5x/api.html#res
 * @param  {Function} next - Express.js next middleware function https://expressjs.com/en/guide/writing-middleware.html
 * @return {null}
 */
const attachUsertoRequest = async (req, res, next) => {
	if (req.session.token) {
		const token = req.session.token;
		req["token"] = token;
		req["user"] = await Users.findOne({ token });
	}
	next();
};

/**
 * This is an Express js middleware to attach the request user to req.user path from API key.
 * @param  {object}   req  - Express.js Request object. https://expressjs.com/en/5x/api.html#req
 * @param  {[type]}   res  - Express.js Response object. https://expressjs.com/en/5x/api.html#res
 * @param  {Function} next - Express.js next middleware function https://expressjs.com/en/guide/writing-middleware.html
 * @return {null}
 */

const attachUsertoRequestFromAPIKey = async (req, res, next) => {
	if (req.headers["x-api-key"] || req.headers["X-API-KEY"]) {
		const apiKey = req.headers["x-api-key"] || req.headers["X-API-KEY"];
		req["user"] = await Users.findOne({ apiKeys: apiKey });
	}
	next();
};

/**
 * This is an Express js middleware to check if the request is authenticated or not.
 * Calls next when authenticated.
 * Responds a JSON error response if not authenticated.
 * @param  {object}   req  - Express.js Request object. https://expressjs.com/en/5x/api.html#req
 * @param  {[type]}   res  - Express.js Response object. https://expressjs.com/en/5x/api.html#res
 * @param  {Function} next - Express.js next middleware function https://expressjs.com/en/guide/writing-middleware.html
 * @return {null}
 */
const isUserAuthed = (req, res, next) => {
	if (req.user) return next();
	res.status(401).json({ message: "Please log in" });
};

/**
 * This is an Express js middleware to validate if the request holds a valid CSRF token
 * Calls next when the request holds a valid CSRF token
 * Responds a JSON error response if the request does not hold a valid CSRF token
 * @param  {object}   req  - Express.js Request object. https://expressjs.com/en/5x/api.html#req
 * @param  {[type]}   res  - Express.js Response object. https://expressjs.com/en/5x/api.html#res
 * @param  {Function} next - Express.js next middleware function https://expressjs.com/en/guide/writing-middleware.html
 * @return {null}
 */
const csrfValidator = async (req, res, next) => {
	if (config.DISABLE_CSRF || req.method === "GET" || req.headers["x-api-key"] || req.headers["X-API-KEY"]) {
		return next();
	}
	if (!req.session.csrfs?.some((csrf) => csrf.token === req.headers["x-csrf-token"])) {
		return res.status(400).json({ message: "Page expired. Please refresh and try again" });
	}
	next();
};

/**
 * This is an Express js middleware to rate limit request. Uses `express-rate-limit` package
 * @param  {object}   req  - Express.js Request object. https://expressjs.com/en/5x/api.html#req
 * @param  {[type]}   res  - Express.js Response object. https://expressjs.com/en/5x/api.html#res
 * @param  {Function} next - Express.js next middleware function https://expressjs.com/en/guide/writing-middleware.html
 * @return {null}
 */
const rateLimit = (options) => {
	return rateLimiter({
		max: 50,
		...options,
		windowMs: (options?.windowMs || 5) * 60 * 1000, // in minutes
		handler: (req, res) =>
			res.status(429).json({ message: `Too many requests. Try again after ${options?.windowMs || 5} mins` }),
	});
};

/**
 * A database helper function to check if the given email address is registered or not.
 * @param  {string} email - Email address to be validated.
 * @param  {string} currentUserId - Current logged in users' id
 * @return {Promise<string>} A promise which resolves to email
 */
const isNewUsername = async (username, currentChannelId) => {
	let query = { username: { $regex: new RegExp(`^${username}$`, "i") } };
	if (currentChannelId) {
		query["_id"] = { $ne: currentChannelId };
	}

	const existingUsername = await Users.findOne(query).select("username").exec();
	return existingUsername ? httpError(400, "Username already taken") : username;
};

/**
 * A database helper function to check if the given email address is registered or not.
 * @param  {string} email - Email address to be validated.
 * @param  {string} currentUserId - Current logged in users' id
 * @return {Promise<string>} A promise which resolves to email
 */
const isNewEmail = async (email, currentUserId) => {
	let query = { email: { $regex: new RegExp(`^${email}$`, "i") } };
	if (currentUserId) {
		query["_id"] = { $ne: currentUserId };
	}

	const existingEmail = await Users.findOne(query).select("email").exec();
	return existingEmail ? httpError(400, "Email already taken") : email;
};

/**
 * A database helper function to fetch user by email
 * @param  {string} email - Email address to be validated.
 * @return {Promise<User>} A promise which resolves to user object
 */
const getUserByEmail = async (email) => {
	let query = { email: { $regex: new RegExp(`^${email}$`, "i") } };

	return await Users.findOne(query).exec();
};

/**
 * A database helper function to fetch device by id
 * @param  {string} deviceId - Deivce id
 * @return {Promise<User>} A promise which resolves to device object
 */
const getDeviceByDeviceId = async (deviceId) => {
	return await Devices.findOne({ _id: deviceId }).exec();
};

/**
 * Throws a error which can be usernamed and changed to HTTP Error in the Express js Error handling middleware.
 * @param  {number} code - HTTP error code
 * @param  {[type]} message - HTTP error message
 * @return {Error}
 */
const httpError = (code, message) => {
	code = code ? code : 500;
	message = message ? message : "Something went wrong";
	const errorObject = new Error(message);
	errorObject.httpErrorCode = code;
	throw errorObject;
};

/**
 * Returns the payload of the push notification in string format
 * @param  {user} user - User object
 * @param  {string} body - Body of the push notification in text format
 * @param  {string} channel - Channel to which the notification is to be pushed
 * @param  {string} url - URL to be attached to the push notification
 * @return {} Payload of the webpush
 */
const getWebPushPayload = (user, body, channel, url = "") => {
	const payload = JSON.stringify({
		title: `@${user.username} pushed on /${channel}`,
		body,
		url: url ?? `${config.URL}/${channel}`,
	});
	return payload;
};

/**
 * Sends the push notification using web push library
 * @param  {object} pushCredentials - Push credentials from the browser
 * @param  {string} payload - payload to be sent with the push
 * @return {boolean} Return if the operation succeeded on not
 */
const sendWebPush = async (pushCredentials, payload) => {
	try {
		await webPush.sendNotification(pushCredentials, payload, config.PUSH_OPTIONS);
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
};

/**
 * Sends the push notifications to all the subscribed devices
 * @param  {device[]} devices - Device object
 * @param  {string} payload - payload to be sent with the push
 * @return {boolean} Return if the operation succeeded on not
 */
const sendPushNotificationToSubscribers = async (devices, payload) => {
	const pushPromises = [];

	devices.forEach((device) => pushPromises.push(sendWebPush(device.pushCredentials, payload)));

	//@TODO: handle the failure in a better way
	try {
		await Promise.all(pushPromises);
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
};

/**
 *
 * Returns the props that needs to be passed to the view template
 * @param  {object}   req    - Express.js Request object. https://expressjs.com/en/5x/api.html#req
 * @param  {string}   title  - String title to be used for the view
 * @return {object}
 */
const getViewProps = (req, title) => {
	let page = req.page ?? req.path.substr(1);
	if (!page) {
		page = req.user ? "account" : "intro";
		title = title ?? (req.user ? "Ahey" : "Ahey - A simple pub-sub over web push");
	}

	return {
		page,
		title,
		user: req.user,
		csrfToken: req.csrfToken,
	};
};
module.exports = {
	getValidUsername,
	getValidChannelName,
	isUserChannel,
	getValidEmail,
	getValidURL,
	isValidEmail,
	isValidUrl,
	isNewUsername,
	isNewEmail,
	getUserByEmail,
	getDeviceByDeviceId,
	sanitizeText,
	hashString,
	getValidPassword,
	getValidPushBody,
	httpError,
	attachUsertoRequest,
	attachUsertoRequestFromAPIKey,
	isUserAuthed,
	csrfValidator,
	rateLimit,
	getWebPushPayload,
	sendWebPush,
	sendPushNotificationToSubscribers,
	getViewProps,
};
