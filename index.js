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
    
    // Ensure file exists
    if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, JSON.stringify([]));
    
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));

    // Check if email is already taken
    if (users.find(u => u.email === email)) {
        return res.render('signin', { title: "Sign In", error: "Email already exists. Please try to login." });
    }

    // Create the new user object
    const newUser = { username, email, password };

    // Save to JSON file
    users.push(newUser);
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

    // --- AUTO-LOGIN LOGIC ---
    currentUser = newUser; // Directly set the global session variable
    
    res.redirect('/'); // Land directly on the home page
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
        currentUser = user; // Simulate a session
        res.redirect('/');
    } else {
        res.render('login', { title: "Login", error: "Invalid email or password." });
    }
});

// 4. LOGOUT ROUTE (Optional but recommended)
app.get('/logout', (req, res) => {
    currentUser = null;
    res.redirect('/');
});

// 5. ERROR HANDLING (Must be the VERY LAST route)
app.use((req, res) => {
    res.status(404).end(); // Default Google/Browser error
});

// This route clears the current user session
app.get('/logout', (req, res) => {
    currentUser = null; // Reset the global user variable
    res.redirect('/');  // Send them back to the home page
});

app.listen(3000, () => console.log('Server running on port 3000'));