const asyncHandler = require("express-async-handler");
const List = require("../models/listModel");
const User = require("../models/userModel");
const mongoose = require('mongoose');

//@desc Get Info lists
//@route GET /list/other
//@access private
const getOther = asyncHandler(async (req, res) => {
  const { category, page, perPage, title } = req.query;
  // Get the user ID from the authenticated user
  const userId = req.user.id;
  let listIds;

  if (category === "Favorites") {
    const user = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      { $unwind: "$favorites" },
      { $sort: { "favorites.createdAt": -1 } },
      { $lookup: { from: "lists", localField: "favorites.list_id", foreignField: "_id", as: "favoritesList" } },
      { $unwind: "$favoritesList" },
      { $replaceRoot: { newRoot: "$favoritesList" } }
    ]);
    
    listIds = user.map((favorite) => favorite._id);
  } else {
    const user = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      { $unwind: "$recent" },
      { $sort: { "recent.createdAt": -1 } },
      { $lookup: { from: "lists", localField: "recent.list_id", foreignField: "_id", as: "recentList" } },
      { $unwind: "$recentList" },
      { $replaceRoot: { newRoot: "$recentList" } }
    ]);
    
    listIds = user.map((recent) => recent._id);
  }
  console.log(listIds)
  const skip = (parseInt(page) - 1) * parseInt(perPage);
  const limit = parseInt(perPage);
 
  let listQuery = { _id: { $in: listIds }, deleted: false };

  if (title) {
    // Add the title search condition to the list query
    listQuery.title = { $regex: title, $options: 'i' };
  }

  const totalListsCount = await List.countDocuments(listQuery);

  if (skip >= totalListsCount) {
    return res.status(200).json([]);
  }

  const lists = await List.find(listQuery)
    .lean();

    const sortedLists = listIds
    .map((listId) => lists.find((list) => list && list._id && list._id.toString() === listId.toString()))
    .filter((list) => list);
  

  // Calculate the duration since the createdAt field of each list
  const updatedLists = await Promise.all(
    sortedLists.map(async (list) => {

      if (list.user_id.toString() !== userId.toString() && !list.public) {
        return null; // Exclude the list item
      }


      const givenDate = new Date(list.createdAt);
      const currentDate = new Date();

      // Calculate the time difference in milliseconds
      const timeDiff = currentDate.getTime() - givenDate.getTime();

      // Convert milliseconds to days
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const secondsDiff = Math.floor(timeDiff / 1000);
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));
      const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));

      let duration;

      if (daysDiff >= 365) {
        // Convert to years if more than 365 days
        const years = Math.floor(daysDiff / 365);
        duration = `${years} year${years > 1 ? 's' : ''} ago`;
      } else if (daysDiff >= 30) {
        // Convert to months if more than 30 days
        const months = Math.floor(daysDiff / 30);
        duration = `${months} month${months > 1 ? 's' : ''} ago`;
      } else if (daysDiff >= 1) {
        // Display the number of days
        duration = `${daysDiff} day${daysDiff > 1 ? 's' : ''} ago`;
      } else if (hoursDiff >= 1) {
        // Display in hours if less than one day
        duration = `${hoursDiff} hour${hoursDiff > 1 ? 's' : ''} ago`;
      } else if (minutesDiff >= 1) {
        // Display in minutes if less than one hour
        duration = `${minutesDiff} minute${minutesDiff > 1 ? 's' : ''} ago`;
      } else if (secondsDiff >= 1) {
        // Display "a few seconds ago" if less than one minute
        duration = `a few seconds ago`;
      } else {
        duration = `just now`;
      }
      const user = await User.findById(list.user_id);
      list.username = user.username;
  
  
      return { ...list, duration };
    })
  );
  // Filter out null values (excluded list items)
  const filteredLists = updatedLists.filter((list) => list !== null);

  const paginatedLists = filteredLists.slice(skip, skip + limit);
  res.status(200).json(paginatedLists);
});


//@desc Get Info lists
//@route GET /list/info
//@access private
const getInfo = asyncHandler(async (req, res) => {// Get the user ID from the authenticated user
  const userId = req.user.id;

  // Retrieve the number of questions in each category
  const mcqCount = await List.countDocuments({ user_id: userId, type: 'MCQ', deleted: false, });
  const trueFalseCount = await List.countDocuments({ user_id: userId, type: 'True/False', deleted: false, });
  const customCount = await List.countDocuments({ user_id: userId, type: 'Custom', deleted: false, });

  // Prepare the response data
  const data = {
    mcqCount,
    trueFalseCount,
    customCount,
  };

  res.status(200).json(data);
});

//@desc Getspecific own lists
//@route GET /list
//@access private
const getLists = asyncHandler(async (req, res) => {
  const { category, title, page, perPage } = req.query;
  const query = {
 
    deleted: false,
  };
  if (title) {
    query.title = { $regex: title, $options: 'i' };
  }
  if (category === "MCQ" || category === "True/False" || category === "Custom") {
    query.type = category;
    query.user_id = req.user.id;
  }

  const skip = (parseInt(page) - 1) * parseInt(perPage);
  const limit = parseInt(perPage);

  const totalListsCount = await List.countDocuments(query);

  if (skip >= totalListsCount) {
    return res.status(200).json([]);
  }

  // let sortOptions = {};
  // if (order === 'Oldest') {
  //   sortOptions.createdAt = 1;
  // } else {
  //   sortOptions.createdAt = -1;
  // }
  let sortOptions = {};
  sortOptions.createdAt = -1;
  let lists = await List.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .lean()
  // Calculate the duration since the createdAt field of each list
  lists = lists.map(async (list) => {
    const givenDate = new Date(list.createdAt);
    const currentDate = new Date();

    // Calculate the time difference in milliseconds
    const timeDiff = currentDate.getTime() - givenDate.getTime();

    // Convert milliseconds to days
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const secondsDiff = Math.floor(timeDiff / 1000);
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));

    let duration;

    if (daysDiff >= 365) {
      // Convert to years if more than 365 days
      const years = Math.floor(daysDiff / 365);
      duration = `${years} year${years > 1 ? 's' : ''} ago`;
    } else if (daysDiff >= 30) {
      // Convert to months if more than 30 days
      const months = Math.floor(daysDiff / 30);
      duration = `${months} month${months > 1 ? 's' : ''} ago`;
    } else if (daysDiff >= 1) {
      // Display the number of days
      duration = `${daysDiff} day${daysDiff > 1 ? 's' : ''} ago`;
    } else if (hoursDiff >= 1) {
      // Display in hours if less than one day
      duration = `${hoursDiff} hour${hoursDiff > 1 ? 's' : ''} ago`;
    } else if (minutesDiff >= 1) {
      // Display in minutes if less than one hour
      duration = `${minutesDiff} minute${minutesDiff > 1 ? 's' : ''} ago`;
    } else if (secondsDiff >= 1) {
      // Display "a few seconds ago" if less than one minute
      duration = `a few seconds ago`;
    } else {
      duration = `just now`;
    }

    const user = await User.findById(list.user_id);
    list.username = user.username;



    return { ...list, duration };
  });
  lists = await Promise.all(lists);

  res.status(200).json(lists);
});




//@desc Get lists by title, type, language 
//@route GET /list/search
//@access private
const searchLists = asyncHandler(async (req, res) => {
  const { title, page, perPage, type, language, order, num } = req.query;
  const query = {
    public: true,
    deleted: false,
    title: { $regex: title, $options: 'i' },
  };

  if (type !== 'All') {
    query.type = type;
  }

  if (num === '10') {
    query['$expr'] = { $lt: [{ $size: '$questions' }, 10] };
  } else if (num === '1020') {
    query['$expr'] = {
      $and: [
        { $gte: [{ $size: '$questions' }, 10] },
        { $lte: [{ $size: '$questions' }, 20] }
      ]
    };
  } else if (num === '20') {
    query['$expr'] = { $gt: [{ $size: '$questions' }, 20] };
  }
  
  const totalListsCount = await List.countDocuments(query);
  
  
  const skip = (parseInt(page) - 1) * parseInt(perPage);
  const limit = parseInt(perPage);


  if (skip >= totalListsCount) {
    return res.status(200).json([]);
  }

  let sortOptions = {};
  if (order === 'Oldest') {
    sortOptions.createdAt = 1;
  } else {
    sortOptions.createdAt = -1;
  }

  let lists = await List.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .lean();

  // Calculate the duration since the createdAt field of each list
  lists = await Promise.all(
    lists.map(async (list) => {
      const givenDate = new Date(list.createdAt);
      const currentDate = new Date();

      // Calculate the time difference in milliseconds
      const timeDiff = currentDate.getTime() - givenDate.getTime();

      // Convert milliseconds to days
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const secondsDiff = Math.floor(timeDiff / 1000);
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));
      const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));

      let duration;

      if (daysDiff >= 365) {
        // Convert to years if more than 365 days
        const years = Math.floor(daysDiff / 365);
        duration = `${years} year${years > 1 ? 's' : ''} ago`;
      } else if (daysDiff >= 30) {
        // Convert to months if more than 30 days
        const months = Math.floor(daysDiff / 30);
        duration = `${months} month${months > 1 ? 's' : ''} ago`;
      } else if (daysDiff >= 1) {
        // Display the number of days
        duration = `${daysDiff} day${daysDiff > 1 ? 's' : ''} ago`;
      } else if (hoursDiff >= 1) {
        // Display in hours if less than one day
        duration = `${hoursDiff} hour${hoursDiff > 1 ? 's' : ''} ago`;
      } else if (minutesDiff >= 1) {
        // Display in minutes if less than one hour
        duration = `${minutesDiff} minute${minutesDiff > 1 ? 's' : ''} ago`;
      } else if (secondsDiff >= 1) {
        // Display "a few seconds ago" if less than one minute
        duration = `a few seconds ago`;
      } else {
        duration = `just now`;
      }

      const user = await User.findById(list.user_id);
      list.username = user.username;

      return { ...list, duration };
    })
  );

  res.status(200).json(lists);
});




//@desc Get a specific list by ID
//@route GET /list/own/:id
//@access private
const getOwnListById = asyncHandler(async (req, res) => {
  const listId = req.params.id;
  const userId = req.user ? req.user.id : null;

  let list;
  let isFavorite = false;
  let own = false;

  if (userId) {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      // Handle the case where the user doesn't exist
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find the list by ID and user ID
    list = await List.findOne({ _id: listId, user_id: userId });

    if (!list) {
      // If the list is not found using user ID, search using list ID only
      list = await List.findOne({ _id: listId ,public: true});
      own = false;
    } else {
      own = true;
    }

    if (list) {
      // Check if the list is already in the user's favorites
      isFavorite = user.favorites.some(favorite => favorite.list_id.toString() === listId);
    }
  } else {
    // Find the list by ID without user ID
    list = await List.findOne({ _id: listId });
    own = false;
  }

  if (list) {
    // Add the 'isFavorite' and 'own' flags to the list object
    const listWithFlags = { ...list.toObject(), isFavorite, own };

    res.status(200).json(listWithFlags);
  } else {
    res.status(404);
    throw new Error('List not found');
  }
});

//@desc Get a specific list by ID
//@route GET /list/:id
//@access public
const getListById = asyncHandler(async (req, res) => {
  const listId = req.params.id;




  // Find the list by ID
  const list = await List.findOne({ _id: listId ,public:true });

  if (list) {
 
    res.status(200).json(list);
  } else {
    res.status(404);
    throw new Error('List not found');
  }
});


//@desc Create New list
//@route POST /list
//@access private
const createList = asyncHandler(async (req, res) => {
  const { title, questions, type, language } = req.body;
  if (!title || !questions) {
    res.status(400);
    throw new Error("Please add title and questions !");
  }
  const list = await List.create({
    title,
    questions,
    user_id: req.user.id,
    language,
    type,
  });

  res.status(201).json(list);
});


//@desc Update list
//@route PUT /list/:id
//@access private
const updateList = asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) {
    res.status(404);
    throw new Error("List not found");
  }

  if (list.user_id.toString() !== req.user.id) {
    res.status(403);
    throw new Error("User don't have permission to update other user lists");
  }

  const updatedlist = await List.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.status(200).json(updatedlist);
});
//@desc star list
//@route PUT /star/:id
//@access private
const starList = asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) {
    res.status(404);
    throw new Error("List not found");
  }

  if (list.user_id.toString() !== req.user.id) {
    res.status(403);
    throw new Error("User doesn't have permission to update other user's lists");
  }

  const { star } = req.body;

  if (typeof star !== 'boolean') {
    res.status(400);
    throw new Error("Invalid 'star' value");
  }

  const updatedList = await List.findByIdAndUpdate(req.params.id, { star }, {
    new: true,
  });

  res.status(200).json(updatedList);
});


//@desc soft Delete List
//@route PUT /list/delete/:id
//@access private
const softDeleteList = asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) {
    res.status(404);
    throw new Error("List not found");
  }
  if (list.user_id.toString() !== req.user.id) {
    res.status(403);
    throw new Error("User doesn't have permission to update other user lists");
  }
  const deletedAt = Date.now() + 5000; // Set deletedAt to current date and time plus 5 seconds
  await List.updateOne({ _id: req.params.id }, { $set: { deleted: true, deletedAt } }); // Set deleted to true and deletedAt to the new value
  res.status(200).json(list);
});
const undoSoftDeleteList = asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) {
    res.status(404);
    throw new Error("List not found");
  }
  if (list.user_id.toString() !== req.user.id) {
    res.status(403);
    throw new Error("User doesn't have permission to update other user lists");
  }
  await List.updateOne({ _id: req.params.id }, { $set: { deleted: false, deletedAt: null } }); // Revert the soft delete by setting deleted to false and deletedAt to null

  // Return the updated list with soft delete reverted
  const updatedList = await List.findById(req.params.id);
  res.status(200).json(updatedList);
});

//@desc Delete List
//@route DELETE /list/:id
//@access private
const deleteList = asyncHandler(async (req, res) => {

  const list = await List.findById(req.params.id);
  if (!list) {
    res.status(404);
    throw new Error("List not found");
  }
  if (list.user_id.toString() !== req.user.id) {
    res.status(403);
    throw new Error("User don't have permission to update other user lists");
  }
  await List.deleteOne({ _id: req.params.id });
  res.status(200).json(list);
});



module.exports = {
  getLists,
  createList,
  updateList,
  deleteList,
  getListById,
  softDeleteList,
  undoSoftDeleteList,
  starList,
  searchLists,
  getOwnListById,
  getInfo,
  getOther,
};