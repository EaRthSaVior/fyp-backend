const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");



//@desc add recent list
//@route Put users/addRecent
//@access private
const addRecent = asyncHandler(async (req, res) => {
  const { list_id } = req.body;
  const userId = req.user.id;

  // Find the user by ID
  const user = await User.findById(userId);

  if (!user) {
    // Handle the case where the user doesn't exist
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Check if the list already exists in the recent array
  const recentIndex = user.recent.findIndex((recent) => recent.list_id.equals(list_id));

  if (recentIndex !== -1) {
    // If the list already exists, remove it from the array
    user.recent.splice(recentIndex, 1);
 
  }
  
  // Push a new recent object with the list_id and current date and time
  user.recent.push({ list_id, createdAt: Date.now() });

  await user.save();

  res.status(200).json({ success: true });
});

//@desc Toggle favorite list
//@route PUT /users/toggleFavorite/:id
//@access private
const toggleFavorite = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const listId = req.params.id;

  // Find the user by ID
  const user = await User.findById(userId);

  if (!user) {
    // Handle the case where the user doesn't exist
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Check if the list already exists in the favorites array
  const favoriteIndex = user.favorites.findIndex((favorite) => favorite.list_id.equals(listId));

  if (favoriteIndex === -1) {
    // If the list doesn't exist, add it to the favorites array
    user.favorites.push({ list_id: listId });
  } else {
    // If the list exists, remove it from the favorites array
    user.favorites.splice(favoriteIndex, 1);
  }

  await user.save();

  res.status(200).json({ success: true });
});

//@desc Register a user
//@route POST users/register
//@access public
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  console.log(req.body);
  if (!username || !email || !password) {
    res.status(400);
    throw new Error("All fields are mandatory!");
  }

  const emailAvailable = await User.findOne({ email });
  if (emailAvailable) {
    res.status(400);
    throw new Error("Email already registered!");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log("Hashed Password: ", hashedPassword);
  const user = await User.create({
    username,
    email,
    password: hashedPassword,
  });

  console.log(`User created ${user}`);
  if (user) {
    // Create token
    const accessToken = jwt.sign(
      {
        user: {
          username: user.username,
          email: user.email,
          id: user.id,
        },
      },
      process.env.ACCESS_TOKEN_SECRET,
      {}
    );

    // Send response with token
    res.status(201).json({ accessToken, _id: user.id, email: user.email });
  } else {
    res.status(400);
    throw new Error("User data is not valid");
  }
});

//@desc Login user
//@route POST users/login
//@access public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error("All fields are mandatory!");
  }
  const user = await User.findOne({ email });
  //compare password with hashedpassword
  if (user && (await bcrypt.compare(password, user.password))) {
    const accessToken = jwt.sign(
      {
        user: {
          username: user.username,
          email: user.email,
          id: user.id,
        },
      },
      process.env.ACCESS_TOKEN_SECRET,
      {}
    );
    res.status(200).json({ accessToken });
  } else {
    res.status(401);
    throw new Error("email or password is not valid");
  }
});

//@desc Current user info
//@route POST users/current
//@access private
const currentUser = asyncHandler(async (req, res) => {
  res.json(req.user);
});
//@desc Update user details
//@route PUT users/update
//@access private
const updateUser = asyncHandler(async (req, res) => {
  const { username, password, currentPassword } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (currentPassword) {
    // Check if the provided current password matches the user's actual password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      res.status(400);
      throw new Error("Invalid current password");
    }
  }

  if (username) {
    user.username = username;
  }



  if (password) {
    user.password = await bcrypt.hash(password, 10);
  }

  const updatedUser = await user.save();

  // Generate a new access token
  const accessToken = jwt.sign(
    {
      user: {
        username: updatedUser.username,
        email: updatedUser.email,
        id: updatedUser.id,
      },
    },
    process.env.ACCESS_TOKEN_SECRET,
    {}
  );

  res.json({

    accessToken, // Include the access token in the response
  });
});


module.exports = { toggleFavorite,addRecent,registerUser, loginUser, currentUser, updateUser };