const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const auth = require("./middleware/auth");
const { login } = require("./controllers/authController");

const app = express();
app.use(bodyParser.json());

mongoose.connect("mongodb://localhost:27017/userAuthApp", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.post("/login", login);
app.get("/protected", auth, (req, res) => {
  res.json({ message: "Access granted", userId: req.userId });
});

app.listen(3000, () => console.log("Server running on port 3000"));
