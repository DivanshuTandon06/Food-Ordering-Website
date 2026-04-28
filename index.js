require("dotenv").config();

const express = require("express");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("./models/User");
const Cart = require("./models/Cart");
const Order = require("./models/Order");

const app = express();


// ================= DB =================
mongoose.connect("mongodb://127.0.0.1:27017/backendDB")
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log(err));


// ================= MIDDLEWARE =================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


// ================= 🔥 ACTIVITY TRACK =================
app.use((req, res, next) => {
  const isLoggedIn = req.user || req.cookies.token;

  if (!isLoggedIn) {
    return next();
  }

  if (!req.session.lastActivity) {
    req.session.lastActivity = Date.now();
  }

  const now = Date.now();
  const diff = now - req.session.lastActivity;

  if (diff > 30 * 60 * 1000) {
    return req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.clearCookie("token");
        return res.redirect("/login");
      });
    });
  }

  req.session.lastActivity = now;
  next();
});


// ================= FILE UPLOAD =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });


// ================= GOOGLE AUTH =================
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/callback"
},
async (accessToken, refreshToken, profile, done) => {

  const email = profile.emails[0].value;
  const googlePic = profile.photos?.[0]?.value?.replace("s96-c", "s400-c");

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      username: profile.displayName,
      email,
      password: "google",
      profilePic: googlePic || "/images/default.png"
    });
  } else {
    user.profilePic = googlePic || user.profilePic;
    await user.save();
  }

  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});


// ================= GLOBAL USER =================
app.use(async (req, res, next) => {
  let user = null;
  let cartCount = 0;
  const token = req.cookies.token;

  if (token) {
    try {
      const data = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(data.id);
    } catch {}
  }

  if (!user && req.user) user = req.user;

  if (user?._id) {
    const cart = await Cart.findOne({ userId: user._id }).select("items.quantity");
    cartCount = cart
      ? cart.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
      : 0;
  }

  res.locals.user = user;
  res.locals.cartCount = cartCount;
  next();
});


// ================= AUTH CHECK =================
function isLoggedIn(req, res, next) {
  if (req.user) return next();
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: data.id };
    next();
  } catch {
    return res.redirect("/login");
  }
}

function isLoggedInApi(req, res, next) {
  if (req.user && req.user._id) return next();

  const token = req.cookies.token;
  if (!token) return res.status(401).json({ success: false, loginRequired: true });

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: data.id };
    next();
  } catch {
    return res.status(401).json({ success: false, loginRequired: true });
  }
}

function issueAuthToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "30m"
  });
}

const MENU_SEARCH_INDEX = [
  { name: "Paneer Pizza", price: 299, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80", description: "Loaded with paneer cubes and cheese", category: "Pizza", route: "/pizza" },
  { name: "Margherita Pizza", price: 249, image: "https://images.unsplash.com/photo-1598023696416-0193a0bcd302?auto=format&fit=crop&w=1200&q=80", description: "Classic cheese and tomato base", category: "Pizza", route: "/pizza" },
  { name: "Farmhouse Pizza", price: 349, image: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=1200&q=80", description: "Mushroom, capsicum, onion and olives", category: "Pizza", route: "/pizza" },
  { name: "Veggie Delight", price: 319, image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80", description: "Fresh veggies with mozzarella topping", category: "Pizza", route: "/pizza" },
  { name: "Cheese Burst", price: 389, image: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=1200&q=80", description: "Extra melted cheese in every bite", category: "Pizza", route: "/pizza" },
  { name: "Mexican Green Wave", price: 359, image: "https://images.unsplash.com/photo-1600628422019-f60cd59d8d26?auto=format&fit=crop&w=1200&q=80", description: "Spicy jalapeno, onion and herbs", category: "Pizza", route: "/pizza" },
  { name: "Tandoori Paneer", price: 419, image: "https://images.unsplash.com/photo-1620374645498-af6bd681a0bd?auto=format&fit=crop&w=1200&q=80", description: "Smoky tandoori paneer and capsicum", category: "Pizza", route: "/pizza" },
  { name: "Classic Veg Burger", price: 149, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80", description: "Crispy patty with fresh veggies", category: "Burger", route: "/burger" },
  { name: "Cheese Blast Burger", price: 179, image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=1200&q=80", description: "Double cheese melt with soft bun", category: "Burger", route: "/burger" },
  { name: "Paneer Tikka Burger", price: 199, image: "https://images.unsplash.com/photo-1610970878459-a0e464d7592b?auto=format&fit=crop&w=1200&q=80", description: "Smoky paneer tikka patty burger", category: "Burger", route: "/burger" },
  { name: "Aloo Crunch Burger", price: 129, image: "https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&w=1200&q=80", description: "Crunchy potato patty and mayo", category: "Burger", route: "/burger" },
  { name: "Spicy Peri Peri Burger", price: 219, image: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=1200&q=80", description: "Hot peri peri sauce and onions", category: "Burger", route: "/burger" },
  { name: "Maharaja Burger", price: 249, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80", description: "Large size burger with rich layers", category: "Burger", route: "/burger" },
  { name: "Crispy Chicken Burger", price: 269, image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1200&q=80", description: "Golden fried chicken and lettuce", category: "Burger", route: "/burger" },
  { name: "Paneer Butter Masala", price: 289, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1200&q=80", description: "Creamy tomato gravy with paneer cubes", category: "North Indian", route: "/north-indian" },
  { name: "Dal Makhani", price: 229, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80", description: "Slow-cooked black lentils with butter", category: "North Indian", route: "/north-indian" },
  { name: "Shahi Paneer", price: 279, image: "https://images.unsplash.com/photo-1690401767645-595de0e0e5f8?auto=format&fit=crop&w=1200&q=80", description: "Royal paneer curry in rich cashew gravy", category: "North Indian", route: "/north-indian" },
  { name: "Chole Bhature", price: 189, image: "https://images.unsplash.com/photo-1626132647523-66f6d9d375f7?auto=format&fit=crop&w=1200&q=80", description: "Spiced chickpeas served with fluffy bhature", category: "North Indian", route: "/north-indian" },
  { name: "Rajma Chawal", price: 199, image: "https://images.unsplash.com/photo-1596797038530-2c107aa10b45?auto=format&fit=crop&w=1200&q=80", description: "Classic rajma curry with steamed rice", category: "North Indian", route: "/north-indian" },
  { name: "Kadhai Chicken", price: 329, image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80", description: "Spicy chicken tossed in kadhai masala", category: "North Indian", route: "/north-indian" },
  { name: "Butter Naan Basket", price: 119, image: "https://images.unsplash.com/photo-1601050690117-5f3f0f0a0f6a?auto=format&fit=crop&w=1200&q=80", description: "Fresh butter naan served hot", category: "North Indian", route: "/north-indian" },
  { name: "Hakka Noodles", price: 209, image: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=1200&q=80", description: "Stir-fried noodles with sauces and veggies", category: "Chinese", route: "/chinese" },
  { name: "Veg Fried Rice", price: 189, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80", description: "Wok tossed rice with spring onion", category: "Chinese", route: "/chinese" },
  { name: "Manchurian Gravy", price: 239, image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=80", description: "Veg balls in spicy tangy gravy", category: "Chinese", route: "/chinese" },
  { name: "Chilli Paneer", price: 259, image: "https://images.unsplash.com/photo-1701579231374-f9706f97ec2f?auto=format&fit=crop&w=1200&q=80", description: "Paneer cubes tossed in chili garlic sauce", category: "Chinese", route: "/chinese" },
  { name: "Spring Roll", price: 169, image: "https://images.unsplash.com/photo-1630912467423-763935f6bc45?auto=format&fit=crop&w=1200&q=80", description: "Crispy rolls with cabbage filling", category: "Chinese", route: "/chinese" },
  { name: "Schezwan Momos", price: 219, image: "https://images.unsplash.com/photo-1626776876729-bab4369a5a5a?auto=format&fit=crop&w=1200&q=80", description: "Steamed momos with fiery schezwan", category: "Chinese", route: "/chinese" },
  { name: "Hot Garlic Soup", price: 149, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80", description: "Warm and spicy soup bowl", category: "Chinese", route: "/chinese" }
];

function scoreSearchMatch(item, normalizedQuery) {
  const name = item.name.toLowerCase();
  const description = (item.description || "").toLowerCase();
  const category = item.category.toLowerCase();

  if (name === normalizedQuery) return 120;
  if (name.startsWith(normalizedQuery)) return 90;
  if (name.includes(normalizedQuery)) return 75;
  if (category.includes(normalizedQuery)) return 55;
  if (description.includes(normalizedQuery)) return 35;
  return 0;
}

app.get("/search", (req, res) => {
  const query = String(req.query.q || "").trim();
  const normalizedQuery = query.toLowerCase();

  const results = normalizedQuery
    ? MENU_SEARCH_INDEX
        .map((item) => ({ ...item, _score: scoreSearchMatch(item, normalizedQuery) }))
        .filter((item) => item._score > 0)
        .sort((a, b) => b._score - a._score || a.price - b.price)
        .map(({ _score, ...item }) => item)
    : [];

  res.render("search", {
    title: "Search",
    query,
    results
  });
});


// ================= ROUTES =================
// HOME
app.get("/", (req, res) => {
  res.render("home", { title: "Home" });
});

// ABOUT PAGE
app.get("/about", (req, res) => {
  res.render("about", { title: "Who We Are" });
});

// BLOG PAGE
app.get("/blog", (req, res) => {
  res.render("blog", { title: "Blog" });
});

// DINING PAGE
app.get("/explore", (req, res) => {
  res.render("explore", { title: "Dining" });
});

// OFFERS PAGE
app.get("/offers", (req, res) => {
  res.render("offers", { title: "Offers" });
});

// CODE OF CONDUCT
app.get("/codeofconduct", (req, res) => {
  res.render("codeofconduct", { title: "Code of Conduct" });
});

// PARTNER WITH US
app.get("/partnerwithus", (req, res) => {
  res.render("partnerwithus", { title: "Partner with Us" });
});

// CONTACT US
app.get("/contact", (req, res) => {
  const success = req.query.success === "1";
  res.render("contact", { title: "Contact Us", success });
});

app.post("/contact", (req, res) => {
  res.redirect("/contact?success=1");
});

// TERMS AND CONDITIONS
app.get("/terms&conditions", (req, res) => {
  res.render("terms-and-conditions", { title: "Terms and Conditions" });
});

// Optional clean URL for the same page
app.get("/terms-and-conditions", (req, res) => {
  res.render("terms-and-conditions", { title: "Terms and Conditions" });
});

// PRIVACY POLICY
app.get("/privacypolicy", (req, res) => {
  res.render("privacy-policy", { title: "Privacy Policy" });
});

// SECURITY
app.get("/security", (req, res) => {
  res.render("security", { title: "Security" });
});

// REPORT PAGE
app.get("/report", (req, res) => {
  const success = req.query.success === "1";
  res.render("report", { title: "Report Issue", success });
});

app.post("/report", (req, res) => {
  // For now we only acknowledge the report in UI.
  res.redirect("/report?success=1");
});


// ================= AUTH =================
// SIGNUP
app.get("/signin", (req, res) => {
  res.render("signin", { title: "Sign Up", error: null });
});

app.post("/signin", upload.single("profilePic"), async (req, res) => {
  const { username, email, password } = req.body;

  const exist = await User.findOne({ email });
  if (exist) {
    return res.render("signin", { title: "Sign Up", error: "Email exists" });
  }

  const hash = await bcrypt.hash(password, 10);

  await User.create({
    username,
    email,
    password: hash,
    profilePic: req.file ? req.file.filename : null
  });

  res.redirect("/login");
});


// LOGIN
app.get("/login", (req, res) => {
  res.render("login", { title: "Login", error: null });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.render("login", { error: "User not found" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.render("login", { error: "Wrong password" });

  const token = issueAuthToken(user);

  res.cookie("token", token, { httpOnly: true });

  res.redirect("/");
});


// GOOGLE LOGIN
app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    const token = issueAuthToken(req.user);

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax"
    });

    res.redirect("/");
  }
);


// ================= PROFILE =================
// PROFILE
app.get("/profile", isLoggedIn, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.render("profile", { user });
});

// 🔥 EDIT PROFILE PAGE
app.get("/edit-profile", isLoggedIn, async (req, res) => {
  const user = await User.findById(req.user._id);

  res.render("edit-profile", {
    user,
    title: "Edit Profile"
  });
});

// 🔥 UPDATE PROFILE
app.post("/edit-profile", isLoggedIn, upload.single("profilePic"), async (req, res) => {
  const { username, email } = req.body;
  let updateData = {
    username,
    email
  };
  if (req.file) {
    updateData.profilePic = req.file.filename;
  }

  await User.findByIdAndUpdate(req.user._id, updateData);

  res.redirect("/profile");
});


// DELETE ACCOUNT
app.post("/delete-account", isLoggedIn, async (req, res) => {
  const userId = req.user._id;

  await Promise.all([
    User.findByIdAndDelete(userId),
    Cart.deleteMany({ userId }),
    Order.deleteMany({ userId })
  ]);

  req.logout(() => {});
  res.clearCookie("token");
  res.redirect("/login");
});


// ================= CART (BASIC) =================

// PIZZA PAGE
app.get('/pizza', (req, res) => {
    res.render('pizza', {
        title: "Subway",

        restaurant: {
            name: "Subway",
            diningRating: 3.9,
            deliveryRating: 4.1,
            description: "Healthy Food, Salad, Fast Food",
            banner1: "https://cdn.sanity.io/images/kts928pd/production/d46e9751ab0c6e97a5f8d63fa4020492af4c5381.png",
            banner2: "https://b.zmtcdn.com/data/pictures/chains/5/120285/3679c0c7694e0c06c6d446a56046a95a.jpg"
        },

        menu: [
            {
                name: "Paneer Pizza",
                price: 299,
            image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
            description: "Loaded with paneer cubes and cheese"
          },
          {
            name: "Margherita Pizza",
            price: 249,
            image: "https://images.unsplash.com/photo-1598023696416-0193a0bcd302?auto=format&fit=crop&w=1200&q=80",
            description: "Classic cheese and tomato base"
          },
          {
            name: "Farmhouse Pizza",
            price: 349,
            image: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=1200&q=80",
            description: "Mushroom, capsicum, onion and olives"
          },
          {
            name: "Veggie Delight",
            price: 319,
            image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80",
            description: "Fresh veggies with mozzarella topping"
          },
          {
            name: "Cheese Burst",
            price: 389,
            image: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=1200&q=80",
            description: "Extra melted cheese in every bite"
          },
          {
            name: "Mexican Green Wave",
            price: 359,
            image: "https://images.unsplash.com/photo-1600628422019-f60cd59d8d26?auto=format&fit=crop&w=1200&q=80",
            description: "Spicy jalapeno, onion and herbs"
          },
          {
            name: "Tandoori Paneer",
            price: 419,
            image: "https://images.unsplash.com/photo-1620374645498-af6bd681a0bd?auto=format&fit=crop&w=1200&q=80",
            description: "Smoky tandoori paneer and capsicum"
            }
        ]
    });
});

// BURGER PAGE
app.get('/burger', (req, res) => {
  res.render('burger', {
    title: 'Burger King Menu',
    restaurant: {
      name: 'Burger Junction',
      diningRating: 4.0,
      deliveryRating: 4.3,
      description: 'Juicy burgers, loaded fries and cool shakes',
      banner1: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1400&q=80'
    },
    menu: [
      { name: 'Classic Veg Burger', price: 149, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80', description: 'Crispy patty with fresh veggies' },
      { name: 'Cheese Blast Burger', price: 179, image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=1200&q=80', description: 'Double cheese melt with soft bun' },
      { name: 'Paneer Tikka Burger', price: 199, image: 'https://images.unsplash.com/photo-1610970878459-a0e464d7592b?auto=format&fit=crop&w=1200&q=80', description: 'Smoky paneer tikka patty burger' },
      { name: 'Aloo Crunch Burger', price: 129, image: 'https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&w=1200&q=80', description: 'Crunchy potato patty and mayo' },
      { name: 'Spicy Peri Peri Burger', price: 219, image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=1200&q=80', description: 'Hot peri peri sauce and onions' },
      { name: 'Maharaja Burger', price: 249, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80', description: 'Large size burger with rich layers' },
      { name: 'Crispy Chicken Burger', price: 269, image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1200&q=80', description: 'Golden fried chicken and lettuce' }
    ]
  });
});

// NORTH INDIAN PAGE
app.get('/north-indian', (req, res) => {
  res.render('north-indian', {
    title: 'North Indian Delights',
    restaurant: {
      name: 'Punjab Rasoi',
      diningRating: 4.4,
      deliveryRating: 4.2,
      description: 'Rich gravies, buttery breads and aromatic spices',
      banner1: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1400&q=80'
    },
    menu: [
      { name: 'Paneer Butter Masala', price: 289, image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1200&q=80', description: 'Creamy tomato gravy with paneer cubes' },
      { name: 'Dal Makhani', price: 229, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80', description: 'Slow-cooked black lentils with butter' },
      { name: 'Shahi Paneer', price: 279, image: 'https://images.unsplash.com/photo-1690401767645-595de0e0e5f8?auto=format&fit=crop&w=1200&q=80', description: 'Royal paneer curry in rich cashew gravy' },
      { name: 'Chole Bhature', price: 189, image: 'https://images.unsplash.com/photo-1626132647523-66f6d9d375f7?auto=format&fit=crop&w=1200&q=80', description: 'Spiced chickpeas served with fluffy bhature' },
      { name: 'Rajma Chawal', price: 199, image: 'https://images.unsplash.com/photo-1596797038530-2c107aa10b45?auto=format&fit=crop&w=1200&q=80', description: 'Classic rajma curry with steamed rice' },
      { name: 'Kadhai Chicken', price: 329, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80', description: 'Spicy chicken tossed in kadhai masala' },
      { name: 'Butter Naan Basket', price: 119, image: 'https://images.unsplash.com/photo-1601050690117-5f3f0f0a0f6a?auto=format&fit=crop&w=1200&q=80', description: 'Fresh butter naan served hot' }
    ]
  });
});

// CHINESE PAGE
app.get('/chinese', (req, res) => {
  res.render('chinese', {
    title: 'Chinese Fusion',
    restaurant: {
      name: 'Wok Street',
      diningRating: 4.1,
      deliveryRating: 4.3,
      description: 'Wok-tossed noodles, rice bowls and dim sums',
      banner1: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1400&q=80'
    },
    menu: [
      { name: 'Hakka Noodles', price: 209, image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=1200&q=80', description: 'Stir-fried noodles with sauces and veggies' },
      { name: 'Veg Fried Rice', price: 189, image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80', description: 'Wok tossed rice with spring onion' },
      { name: 'Manchurian Gravy', price: 239, image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=80', description: 'Veg balls in spicy tangy gravy' },
      { name: 'Chilli Paneer', price: 259, image: 'https://images.unsplash.com/photo-1701579231374-f9706f97ec2f?auto=format&fit=crop&w=1200&q=80', description: 'Paneer cubes tossed in chili garlic sauce' },
      { name: 'Spring Roll', price: 169, image: 'https://images.unsplash.com/photo-1630912467423-763935f6bc45?auto=format&fit=crop&w=1200&q=80', description: 'Crispy rolls with cabbage filling' },
      { name: 'Schezwan Momos', price: 219, image: 'https://images.unsplash.com/photo-1626776876729-bab4369a5a5a?auto=format&fit=crop&w=1200&q=80', description: 'Steamed momos with fiery schezwan' },
      { name: 'Hot Garlic Soup', price: 149, image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80', description: 'Warm and spicy soup bowl' }
    ]
  });
});

async function addItemToUserCart(userId, name, price, image) {
  const safePrice = Number(price) || 0;

  let cart = await Cart.findOne({ userId });

  if (!cart) {
    const user = await User.findById(userId);
    cart = new Cart({
      userId,
      userName: user?.username || "",
      userEmail: user?.email || "",
      items: []
    });
  }

  const existingItem = cart.items.find((item) => item.name === name && item.image === image);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.items.push({ name, price: safePrice, image, quantity: 1 });
  }

  await cart.save();
}

function getCartCount(cart) {
  if (!cart) return 0;
  return cart.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

const OFFER_CATALOG = {
  PIZZA40: {
    code: "PIZZA40",
    label: "Pizza Party Deal",
    minAmount: 499,
    type: "percentage",
    value: 40,
    maxDiscount: 200,
    description: "40% off on pizza orders above ₹499"
  },
  BURGERBOGO: {
    code: "BURGERBOGO",
    label: "Burger Combo Day",
    minAmount: 299,
    type: "flat",
    value: 80,
    description: "Flat ₹80 off on burger orders above ₹299"
  },
  NORTH120: {
    code: "NORTH120",
    label: "North Indian Feast",
    minAmount: 699,
    type: "flat",
    value: 120,
    description: "Instant ₹120 off on orders above ₹699"
  },
  CHINESEFREE: {
    code: "CHINESEFREE",
    label: "Chinese Special",
    minAmount: 299,
    type: "delivery",
    value: 30,
    description: "Free delivery on Chinese orders above ₹299"
  }
};

function getOfferConfig(code) {
  if (!code) return null;
  return OFFER_CATALOG[String(code).toUpperCase()] || null;
}

function calculateCartPricing(cart) {
  const items = cart ? cart.items : [];
  const itemTotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  const deliveryFee = items.length ? 30 : 0;
  const taxes = items.length ? Math.round(itemTotal * 0.05) : 0;

  const appliedOffer = getOfferConfig(cart?.appliedOfferCode);
  let discount = 0;
  let offerMessage = "";
  let offerValid = false;

  if (appliedOffer && items.length) {
    if (itemTotal >= appliedOffer.minAmount) {
      offerValid = true;

      if (appliedOffer.type === "percentage") {
        discount = Math.min(Math.round((itemTotal * appliedOffer.value) / 100), appliedOffer.maxDiscount || Number.MAX_SAFE_INTEGER);
      } else if (appliedOffer.type === "flat") {
        discount = appliedOffer.value;
      } else if (appliedOffer.type === "delivery") {
        discount = deliveryFee;
      }

      discount = Math.min(discount, itemTotal + deliveryFee + taxes);
    } else {
      offerMessage = `Add ₹${appliedOffer.minAmount - itemTotal} more to use ${appliedOffer.code}`;
    }
  }

  const grandTotal = Math.max(itemTotal + deliveryFee + taxes - discount, 0);

  return {
    items,
    itemTotal,
    deliveryFee,
    taxes,
    discount,
    grandTotal,
    appliedOffer: appliedOffer ? {
      code: appliedOffer.code,
      label: appliedOffer.label,
      description: appliedOffer.description,
      valid: offerValid,
      message: offerMessage
    } : null
  };
}

async function saveAppliedOffer(cart, code, label) {
  cart.appliedOfferCode = code || "";
  cart.appliedOfferLabel = label || "";
  await cart.save();
}

app.post("/api/cart/apply-offer", isLoggedInApi, async (req, res) => {
  const { code } = req.body;
  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart || !cart.items.length) {
    return res.status(400).json({ success: false, message: "Cart is empty" });
  }

  const offer = getOfferConfig(code);
  if (!offer) {
    return res.status(400).json({ success: false, message: "Invalid offer code" });
  }

  const pricing = calculateCartPricing({ ...cart.toObject(), appliedOfferCode: offer.code });
  if (!pricing.appliedOffer?.valid) {
    return res.status(400).json({ success: false, message: pricing.appliedOffer?.message || "Offer not valid for this cart" });
  }

  await saveAppliedOffer(cart, offer.code, offer.label);
  const savedCart = await Cart.findOne({ userId: req.user._id });
  const savedPricing = calculateCartPricing(savedCart);

  return res.json({
    success: true,
    message: `${offer.label} applied successfully`,
    pricing: savedPricing
  });
});

app.get("/api/cart/items", isLoggedInApi, async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id });
  const pricing = calculateCartPricing(cart);
  return res.json({
    success: true,
    items: pricing.items,
    cartCount: getCartCount(cart),
    pricing
  });
});

app.post("/api/cart/add", isLoggedInApi, async (req, res) => {
  const { name, price, image } = req.body;
  await addItemToUserCart(req.user._id, name, price, image);

  const cart = await Cart.findOne({ userId: req.user._id });
  const item = cart?.items.find((entry) => entry.name === name && entry.image === image);

  return res.json({
    success: true,
    itemQuantity: item ? item.quantity : 0,
    cartCount: getCartCount(cart),
    pricing: calculateCartPricing(cart)
  });
});

app.post("/api/cart/update", isLoggedInApi, async (req, res) => {
  const { name, image, action } = req.body;
  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    return res.json({ success: true, itemQuantity: 0, cartCount: 0 });
  }

  const item = cart.items.find((entry) => entry.name === name && entry.image === image);
  if (!item) {
    return res.json({ success: true, itemQuantity: 0, cartCount: getCartCount(cart) });
  }

  if (action === "inc") {
    item.quantity += 1;
  } else if (action === "dec") {
    item.quantity -= 1;
  }

  cart.items = cart.items.filter((entry) => entry.quantity > 0);
  await cart.save();

  const updatedItem = cart.items.find((entry) => entry.name === name && entry.image === image);

  return res.json({
    success: true,
    itemQuantity: updatedItem ? updatedItem.quantity : 0,
    cartCount: getCartCount(cart),
    pricing: calculateCartPricing(cart)
  });
});

app.post("/api/cart/remove", isLoggedInApi, async (req, res) => {
  const { name, image } = req.body;
  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    return res.json({ success: true, cartCount: 0 });
  }

  cart.items = cart.items.filter((entry) => !(entry.name === name && entry.image === image));

  if (!cart.items.length) {
    cart.appliedOfferCode = "";
    cart.appliedOfferLabel = "";
  }

  await cart.save();

  return res.json({ success: true, cartCount: getCartCount(cart), pricing: calculateCartPricing(cart) });
});

app.post('/add-to-cart-burger', isLoggedIn, async (req, res) => {
  const { name, price, image } = req.body;
  await addItemToUserCart(req.user._id, name, price, image);

  res.redirect('/burger');
});

app.post('/add-to-cart-north-indian', isLoggedIn, async (req, res) => {
  const { name, price, image } = req.body;
  await addItemToUserCart(req.user._id, name, price, image);

  res.redirect('/north-indian');
});

app.post('/add-to-cart-chinese', isLoggedIn, async (req, res) => {
  const { name, price, image } = req.body;
  await addItemToUserCart(req.user._id, name, price, image);

  res.redirect('/chinese');
});


// ADD TO CART
app.post("/add-to-cart", isLoggedIn, async (req, res) => {

  const { name, price, image } = req.body;
  await addItemToUserCart(req.user._id, name, price, image);

  res.redirect("/pizza");
});

app.post("/cart/update-quantity", isLoggedIn, async (req, res) => {
  const { name, image, action } = req.body;

  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) return res.redirect("/cart");

  const item = cart.items.find((entry) => entry.name === name && entry.image === image);
  if (!item) return res.redirect("/cart");

  if (action === "inc") {
    item.quantity += 1;
  } else if (action === "dec") {
    item.quantity -= 1;
  }

  cart.items = cart.items.filter((entry) => entry.quantity > 0);

  if (!cart.items.length) {
    cart.appliedOfferCode = "";
    cart.appliedOfferLabel = "";
  }

  await cart.save();

  res.redirect("/cart");
});

app.post("/cart/remove", isLoggedIn, async (req, res) => {
  const { name, image } = req.body;

  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) return res.redirect("/cart");

  cart.items = cart.items.filter((entry) => !(entry.name === name && entry.image === image));
  await cart.save();

  res.redirect("/cart");
});


// VIEW CART
app.get("/cart", isLoggedIn, async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id });
  const pricing = calculateCartPricing(cart);

  res.render("cart", {
    items: pricing.items,
    itemTotal: pricing.itemTotal,
    deliveryFee: pricing.deliveryFee,
    taxes: pricing.taxes,
    discount: pricing.discount,
    grandTotal: pricing.grandTotal,
    appliedOffer: pricing.appliedOffer
  });
});

app.get("/orders", isLoggedIn, async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });

  res.render("orders", {
    title: "Order History",
    orders
  });
});

app.post("/api/cart/checkout", isLoggedInApi, async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id });
  const pricing = calculateCartPricing(cart);
  const paymentMethod = String(req.body.paymentMethod || "cod").toLowerCase();

  if (!pricing.items.length) {
    return res.status(400).json({
      success: false,
      message: "Your cart is already empty"
    });
  }

  const etaMinutes = Math.floor(Math.random() * 16) + 20;

  const order = await Order.create({
    userId: req.user._id,
    items: pricing.items.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image
    })),
    pricing: {
      itemTotal: pricing.itemTotal,
      deliveryFee: pricing.deliveryFee,
      taxes: pricing.taxes,
      discount: pricing.discount,
      grandTotal: pricing.grandTotal
    },
    appliedOffer: {
      code: pricing.appliedOffer?.code || "",
      label: pricing.appliedOffer?.label || ""
    },
    paymentMethod: paymentMethod === "cod" ? "cod" : "cod",
    paymentStatus: "cash_on_delivery",
    etaMinutes,
    status: "placed"
  });

  if (cart) {
    cart.items = [];
    cart.appliedOfferCode = "";
    cart.appliedOfferLabel = "";
    await cart.save();
  }

  return res.json({
    success: true,
    orderId: order._id,
    etaMinutes,
    amountPaid: pricing.grandTotal,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    message: `Your Cash on Delivery order is placed and will arrive in about ${etaMinutes} minutes. Thank you!`
  });
});


// ================= LOGOUT =================
app.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.clearCookie("token");
      res.redirect("/login");
    });
  });
});


// ================= 404 ERROR PAGE =================
app.use((req, res) => {
  res.status(404).render("404", { title: "404 - Page Not Found" });
});


// ================= SERVER =================
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

