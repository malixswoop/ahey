const { generateApiKey } = require("generate-api-key");
const randomString = require("randomstring");

const uuid = require("uuid").v4;

const utils = require("./utils");
const config = require("./config");
const sendEmail = require("./email");

const { Users, Devices, Pushes } = require("./schema").getInstance();

const signUp = async (req, res, next) => {
	try {
		const username = utils.getValidUsername(req.body.username);
		await utils.isNewUsername(username);
		const email = utils.getValidEmail(req.body.email);
		await utils.isNewEmail(email);
		const password = utils.getValidPassword(req.body.password);

		const date = new Date();

		const emailVerificationCode = uuid();
		const token = uuid();

		await new Users({
			username,
			email,
			password,
			emailVerificationCode,
			token,
			createdAt: date,
		}).save();
		req.session.token = token;

		res.json({ message: "Account created. Please verify your email.", username });

		sendEmail.verificationEmail(username, email, emailVerificationCode);
	} catch (error) {
		next(error);
	}
};

const logIn = async (req, res, next) => {
	try {
		const username = utils.getValidUsername(req.body.username);
		const password = utils.getValidPassword(req.body.password);

		const user = await Users.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") }, password }).exec();

		if (!user) return utils.httpError(400, "Invalid user credentials");

		const token = uuid();

		await Users.updateOne({ _id: user._id }, { $push: { token }, lastLoginAt: new Date() });

		req.session.token = token;
		res.json({ message: "Logged in", username: user.username });
	} catch (error) {
		next(error);
	}
};

const verifyEmail = async (req, res, next) => {
	try {
		const code = req.params.code;

		const user = await Users.findOne({ emailVerificationCode: code }).exec();
		if (!user) return res.status(400).send("Invalid email verification code");

		await Users.updateOne({ _id: user._id }, { $unset: { emailVerificationCode: 1 }, lastUpdatedAt: new Date() });

		res.send("Email verified");
	} catch (error) {
		next(error);
	}
};

const resetPassword = async (req, res, next) => {
	try {
		const username = utils.getValidUsername(req.body.username);

		const user = await Users.findOne({ username }).exec();
		if (!user) return utils.httpError(400, "Invalid username");

		const passwordString = randomString.generate(8);
		const password = await utils.getValidPassword(passwordString);

		await Users.updateOne({ _id: user._id }, { password, lastUpdatedOn: new Date() });
		await sendEmail.resetPasswordEmail(user.username, user.email, passwordString);

		res.json({ message: "Password resetted" });
	} catch (error) {
		next(error);
	}
};

const me = async (req, res, next) => {
	try {
		const { username, email, joinedOn, apiKeys, emailVerificationCode, savedChannels } = req.user;

		const response = { username, email, joinedOn, savedChannels };
		if (req.query.apiKeys === "true") {
			response["apiKeys"] = apiKeys;
		}

		res.json({ ...response, isEmailVerified: !emailVerificationCode });
	} catch (error) {
		next(error);
	}
};

const resendEmailVerification = async (req, res, next) => {
	try {
		const { username, email, emailVerificationCode } = req.user;
		if (!emailVerificationCode) return utils.httpError(400, "Email has beed already verified");

		sendEmail.verificationEmail(username, email, emailVerificationCode);

		res.json({ message: "Re-sent verification email." });
	} catch (error) {
		next(error);
	}
};

const updateAccount = async (req, res, next) => {
	try {
		const email =
			req.body.email && req.body.email !== req.user.email ? await utils.getValidEmail(req.body.email) : null;
		if (email) await utils.isNewEmail(email, req.user._id);

		const password = req.body.password ? await utils.getValidPassword(req.body.password) : null;

		const updateFields = {};
		if (password) updateFields["password"] = password;

		if (email && email !== req.user.email) {
			const emailVerificationCode = uuid();
			updateFields["email"] = email;
			updateFields["emailVerificationCode"] = emailVerificationCode;
			await sendEmail.verificationEmail(req.user.username, email, emailVerificationCode);
		}

		await Users.updateOne({ _id: req.user._id }, { ...updateFields, lastUpdatedOn: new Date() });
		res.json({
			message: `Account updated. ${updateFields["emailVerificationCode"] ? "Please verify your email" : ""}`,
		});
	} catch (error) {
		next(error);
	}
};

const newApiKey = async (req, res, next) => {
	try {
		if (!req.user.userType === "paid") return utils.httpError(405, "This API cannot be used by free users");
		const apiKey = generateApiKey({ method: "uuidv4", dashes: false });

		await Users.updateOne({ _id: req.user._id }, { $push: { apiKeys: apiKey }, lastUpdatedOn: new Date() });

		res.json({ message: "API Key updated" });
	} catch (error) {
		next(error);
	}
};

const deleteApiKey = async (req, res, next) => {
	try {
		if (!req.user.userType === "paid") return utils.httpError(405, "This API cannot be used by free users");
		const apiKey = req.params.key;

		await Users.updateOne({ _id: req.user._id }, { $pull: { apiKeys: apiKey }, lastUpdatedOn: new Date() });

		res.json({ message: "API Key deleted" });
	} catch (error) {
		next(error);
	}
};

const saveChannel = async (req, res, next) => {
	try {
		const channel = utils.getValidChannelName(req.body.channel);

		await Users.updateOne({ _id: req.user._id }, { $push: { savedChannels: channel }, lastUpdatedOn: new Date() });

		res.json({ message: "Saved channel to your account" });
	} catch (error) {
		next(error);
	}
};

const unsaveChannel = async (req, res, next) => {
	try {
		const channel = utils.getValidChannelName(req.body.channel);

		await Users.updateOne({ _id: req.user._id }, { $pull: { savedChannels: channel }, lastUpdatedOn: new Date() });

		res.json({ message: "Removed channel from your account" });
	} catch (error) {
		next(error);
	}
};

const updateDevice = async (req, res, next) => {
	try {
		let device = req.session.device;
		const credentials = req.body.credentials;

		// Test if the credentials are valid
		const isValidPushCredentials = await utils.sendWebPush(credentials, config.TEST_PUSH_PAYLOAD);
		if (!isValidPushCredentials) return utils.httpError(400, "Invalid push credentials");

		const date = new Date();

		if (!device) {
			const userAgent = req.get("user-agent");
			const newDevice = await new Devices({
				pushCredentials: credentials,
				userAgent,
				createdOn: date,
				lastUpdatedOn: date,
			}).save();

			device = newDevice._id;
			req.session.device = device.toString();
		}

		await Devices.updateOne({ _id: device }, { pushCredentials: credentials, lastUpdatedOn: date });

		res.json({ message: "Push credentials updated" });
	} catch (error) {
		next(error);
	}
};

const getDeviceDetails = async (req, res, next) => {
	try {
		let device = req.session.device;

		const deviceDetails = await Devices.findOne({ _id: device })
			.select("userAgent createdOn lastUpdatedOn subscribedChannels")
			.exec();

		res.json({ device: deviceDetails });
	} catch (error) {
		next(error);
	}
};

const subscribeChannel = async (req, res, next) => {
	try {
		const device = req.session.device;
		const channel = utils.getValidChannelName(req.body.channel);

		if (!device) return utils.httpError(400, "Invalid device");

		const detailDetails = await utils.getDeviceByDeviceId(device);
		if (!detailDetails) return utils.httpError(400, "Invalid device");

		if (detailDetails.subscribedChannels.includes(channel)) return utils.httpError(400, "Already subscribed");
		await Devices.updateOne({ _id: device }, { $push: { subscribedChannels: channel }, lastUpdatedOn: new Date() });

		res.json({ message: "Channel subscribed" });
	} catch (error) {
		next(error);
	}
};

const unsubscribeChannel = async (req, res, next) => {
	try {
		const device = req.session.device;
		const channel = utils.getValidChannelName(req.body.channel);

		if (!device) return utils.httpError(400, "Invalid device");
		await Devices.updateOne({ _id: device }, { $pull: { subscribedChannels: channel }, lastUpdatedOn: new Date() });

		res.json({ message: "Channel unsubscribed" });
	} catch (error) {
		next(error);
	}
};

const push = async (req, res, next) => {
	try {
		if (req.user.emailVerificationCode) {
			return utils.httpError(400, "Please verify your email.");
		}
		const body = utils.getValidPushBody(req.body.body);
		const date = new Date();

		const channel = utils.getValidChannelName(req.params.channel);

		if (utils.isUserChannel(channel) && req.user.username !== channel.substring(1)) {
			return utils.httpError(401, "Unauthorized");
		}

		await new Pushes({ from: req.user._id, channel, body, date }).save();

		const subscribers = await Devices.find({ subscribedChannels: channel }).select("pushCredentials").exec();
		const payload = utils.getWebPushPayload(req.user, body, channel);

		utils.sendPushNotificationToSubscribers(subscribers, payload);

		return res.json({ message: "Pushed successfully" });
	} catch (error) {
		next(error);
	}
};

const pull = async (req, res, next) => {
	try {
		const channel = utils.getValidChannelName(req.params.channel);
		const skip = Number(req.query.skip) || 0;

		let query = { channel };

		const [pushes, subscribers] = await Promise.all([
			Pushes.find(query).populate("from", "username").skip(skip).limit(config.PAGE_LIMIT).sort("-date").exec(),
			Devices.countDocuments({ subscribedChannels: channel }),
		]);

		res.json({ pushes, subscribers });
	} catch (error) {
		next(error);
	}
};

const logOut = async (req, res, next) => {
	try {
		await Users.updateOne({ _id: req.user._id }, { $pull: { devices: { token: req.token } } });
		req.session.destroy();
		res.json({ message: "Logged out" });
	} catch (error) {
		next(error);
	}
};

module.exports = {
	signUp,
	logIn,
	verifyEmail,
	resendEmailVerification,
	resetPassword,
	updateAccount,
	me,
	newApiKey,
	deleteApiKey,
	saveChannel,
	unsaveChannel,
	updateDevice,
	getDeviceDetails,
	subscribeChannel,
	unsubscribeChannel,
	push,
	pull,
	logOut,
};
