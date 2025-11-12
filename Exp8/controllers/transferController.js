const mongoose = require("mongoose");
const User = require("../models/User");

exports.transferMoney = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { from, to, amount } = req.body;

    const sender = await User.findById(from).session(session);
    const receiver = await User.findById(to).session(session);

    if (!sender || !receiver) {
      throw new Error("Sender or receiver not found");
    }

    if (sender.balance < amount) {
      throw new Error("Insufficient balance");
    }

    sender.balance -= amount;
    receiver.balance += amount;

    await sender.save({ session });
    await receiver.save({ session });

    await session.commitTransaction();
    res.send("Transfer successful");
  } catch (error) {
    await session.abortTransaction();
    res.status(500).send("Transaction failed: " + error.message);
  } finally {
    session.endSession();
  }
};
