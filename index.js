const express = require("express");
const fs = require('fs');
const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.get("/", (req, res) => {
    res.render("home", { title: "Home Page" });
});
app.listen(3000, () => console.log('Server running on port 3000'));