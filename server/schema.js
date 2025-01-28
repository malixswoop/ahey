/**
 * A singleton implemetaion for the database collections
 */

const mongoose = require("mongoose");
const config = require("./config");

module.exports = (() => {
	let instance;
	let db = mongoose.connection;
	const Schema = mongoose.Schema;

	mongoose.set("strictQuery", true);

	const connectToDb = () => {
		mongoose.connect(config.MONGODB_URI);
	};

	const createInstance = () => {
		db.on("error", (error) => {
			console.error("Error in MongoDb connection: " + error);
			mongoose.disconnect(); // Trigger disconnect on any error
		});
		db.on("connected", () => console.log("Ahey DB connected"));
		db.on("disconnected", () => {
			console.log("MongoDB disconnected!");
			connectToDb();
		});

		connectToDb();

		console.log("Ahey DB initialized");

		const userSchema = new Schema({
			username: { type: String, index: true, required: true, unique: true, match: /^([a-zA-Z0-9]){1,18}$/ },
			email: { type: String, index: true, unique: true, required: true },
			password: { type: String, required: true },
			emailVerificationCode: { type: String, index: true },
			joinedOn: { type: Date, default: Date.now },
			lastLoginOn: Date,
			lastUpdatedOn: Date,
			token: [{ type: String, index: true }],
			savedChannels: [{ type: String, index: true }],
			apiKeys: [{ type: String, index: true }],
		});

		const deviceSchema = new Schema({
			pushCredentials: Object, //  Push subscription data which includes push endpoint, token & auth credentials
			userAgent: { type: String },
			createdOn: { type: Date, default: Date.now },
			lastUpdatedOn: { type: Date, expires: 86400 * 30 },
			subscribedChannels: [{ type: String, index: true }],
		});

		const pushSchema = new Schema({
			from: { type: Schema.Types.ObjectId, ref: "Users", index: true },
			channel: { type: String, index: true },
			text: String,
			link: String,
			date: { type: Date, default: Date.now, expires: 86400 },
		});

		const Users = mongoose.model("Users", userSchema);
		const Devices = mongoose.model("Devices", deviceSchema);
		const Pushes = mongoose.model("Pushes", pushSchema);

		return { Devices, Pushes, Users };
	};
	return {
		getInstance: () => {
			if (!instance) {
				instance = createInstance();
			}
			return instance;
		},
	};
})();
