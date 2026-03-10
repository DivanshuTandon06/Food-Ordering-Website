const express = require("express");
const fs = require('fs');
const path = require('path');
const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

let currentUser = null; 
app.use((req, res, next) => {
    res.locals.user = currentUser || null; 
    next();
});


app.get("/", (req, res) => {
    res.render("home", { title: "Home Page" });
});
app.get("/offers", (req, res) => {
    res.render("offers", { title: "Offers" });
});
app.get("/explore", (req, res) => {
    res.render("explore", { title: "Explore" });
});
app.get("/cart", (req, res) => {
    res.render("cart", { title: "Cart" });
});
app.get('/contact', (req, res) => {
    res.render("contact", { title: "Contact us" });
});
app.post('/contact', (req, res) => {
    console.log("Form data received:", req.body); 
    res.redirect('/'); 
});
app.get('/signin', (req, res) => {
    res.render('signin', { title: "Sign In", error: null });
});
app.post('/signin', (req, res) => {
    const { username, email, password } = req.body;
    const usersPath = path.join(__dirname, 'users.json'); 
    if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, JSON.stringify([]));
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8')); 
    if (users.find(u => u.email === email)) {
        return res.render('signin', { title: "Sign In", error: "Email already exists. Please try to login." });
    }
    const newUser = { username, email, password };
    users.push(newUser);
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    currentUser = newUser; 
    res.redirect('/'); 
});

app.get('/login', (req, res) => {
    res.render('login', { title: "Login", error: null });
});
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const usersPath = path.join(__dirname, 'users.json');
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        currentUser = user; 
        res.redirect('/');
    } else {
        res.render('login', { title: "Login", error: "Invalid email or password." });
    }
});

app.get('/logout', (req, res) => {
    currentUser = null;
    res.redirect('/');
});

app.use((req, res) => {
    res.status(404).send("<h1>404-Page Not Found</h1> <p> Sorry, we couldn't find that!</p>"); 
});
app.get('/logout', (req, res) => {
    currentUser = null;
    res.redirect('/');  
});

app.listen(3000, () => console.log('Server running on port 3000'));