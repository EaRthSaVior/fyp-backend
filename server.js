const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const connectDb = require("./config/dbConnection");
const List = require('./models/listModel'); // Import the List model

connectDb();
const app = express();

// Move the deleteExpiredLists function declaration above the setInterval line
const deleteExpiredLists = async () => {
    try {
      // Find lists with a deletedAt timestamp less than the current time
      const expiredLists = await List.find({ deleted: true, deletedAt: { $lt: new Date() } });
  
      // Delete the expired lists from the database
      for (const list of expiredLists) {
        await List.deleteOne({ _id: list._id });
      }
  
      // console.log(`Deleted ${expiredLists.length} expired lists.`);
    } catch (error) {
      console.error('Failed to delete expired lists:', error);
    }
  };
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/completions', require("./routes/chatGptApi"));
app.use("/list", require("./routes/listRoutes"));
app.use("/users",require("./routes/userRoutes"));
app.use("/share", require("./routes/shareRoute"));
app.use("/reset", require("./routes/resetRoute"));
setInterval(deleteExpiredLists, 60000);

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});

