const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const { transferMoney } = require("./controllers/transferController");

const app = express();
app.use(bodyParser.json());

mongoose.connect("mongodb://localhost:27017/userTransactionApp", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.post("/transfer", transferMoney);

app.listen(3000, () => console.log("Server running on port 3000"));
