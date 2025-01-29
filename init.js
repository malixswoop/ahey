const express = require("express");
const path = require("path");
const app = express();

const config = require("./server/config");
const apiRoutes = require("./server/routes");
const middlewares = require("./server/middlewares");
const { getViewProps } = require("./server/utils");

app.set("view engine", "ejs");

// Serve vue.js, page.js & axios to the browser
app.use(express.static(path.join(__dirname, "node_modules/linkifyjs/dist/")));
app.use(express.static(path.join(__dirname, "node_modules/linkify-html/dist/")));
app.use(express.static(path.join(__dirname, "node_modules/linkify-plugin-mention/dist/")));
app.use(express.static(path.join(__dirname, "node_modules/linkify-plugin-hashtag/dist/")));
app.use(express.static(path.join(__dirname, "node_modules/axios/dist/")));
app.use(express.static(path.join(__dirname, "node_modules/vue/dist/")));

// Serve frontend assets & images to the browser
app.use(express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "assets/icons")));

// Attach the session middleware
app.use(middlewares);

// Handle API requests
app.use("/api", apiRoutes);

// Handle web view requests
app.get("/", (req, res) => res.render(req.user ? "account" : "intro", getViewProps(req)));
app.get(Object.keys(config.VIEW_CONFIG), (req, res, next) => {
	if (req.user && ["/signup", "/login"].includes(req.path)) return res.redirect("/");
	res.render(req.path.substring(1), getViewProps(req, `${config.VIEW_CONFIG[req.path]} - Ahey`));
});
app.get("/:channel", (req, res) =>
	res.render("channel", { ...getViewProps(req, `${req.params.channel} - Ahey`), channel: req.params.channel })
);
app.get("/*", async (req, res) => res.render("404", getViewProps(req, "Page not found - Ahey")));

// Start the server
app.listen(config.PORT, null, function () {
	console.log("Node version", process.version);
	console.log("Ahey server running on port", config.PORT);
});
