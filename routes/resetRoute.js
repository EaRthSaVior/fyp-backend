const express = require("express");
const router = express.Router();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const Token = require('../models/tokenModel');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5m' });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

const createResetToken = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('User not found');
  }

  const token = new Token({
    userId: user._id,
    function:"password",
    token: generateToken({ userId: user._id }),
  });

  await token.save();

  return token.token;
};


router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const token = await createResetToken(email);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const link = `http://localhost:3000/resetpassword?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `Click <a href="${link}">here</a> to reset your password. This link will expire in 5 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  try {
    const decodedToken = verifyToken(token);
    const user = await User.findById(decodedToken.userId);

    if (!user) {
      throw new Error('User not found');
    }

    const tokenDoc = await Token.findOneAndDelete({ userId: user._id, function : "password",token });

    if (!tokenDoc) {
      throw new Error('Invalid token');
    }
    
    const now = Date.now();
    
    if (now > tokenDoc.createdAt.getTime() + 300000) {
      // Token has expired
      throw new Error('Token expired');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );
    
    res.status(200).json({ message: 'Password updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/validate-old-email', async (req, res) => {
  const { email } = req.body;

  try {
    // Find the user by the provided email
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate a verification token for the old email
    const token = new Token({
      userId: user._id,
      function: 'email-validation',
      token: generateToken({ userId: user._id }),

    });

    await token.save();

    // Send the verification email to the old email address
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const link = `http://localhost:3000/changeemail?token=${token.token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Email Change Validation',
      html: `Click <a href="${link}">here</a> to change your email address in Smart Quizzer. This link will expire in 5 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'A Change Email Request has been sent to your current email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/changenewemail', async (req, res) => {
  const { token, newEmail } = req.body;

  try {
    // Verify the provided token
    const decodedToken = verifyToken(token);

    // Find the user by the decoded user ID
    const user = await User.findById(decodedToken.userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Check if the new email is already taken by another user
    const existingUser = await User.findOne({ email: newEmail });

    if (existingUser) {
      throw new Error('Email address is already in use');
    }

    // Find the token associated with the user and the old email
    const tokenDoc = await Token.findOne({
      userId: user._id,
      function: 'email-validation',
      token,
    });

    if (!tokenDoc) {
      throw new Error('Invalid token');
    }

    // Check if the token has expired
    const now = Date.now();
    if (now > tokenDoc.createdAt.getTime() + 300000) {
      throw new Error('Token expired');
    }

    // Update the user's email address with the new email
    user.email = newEmail;
    await user.save();

    // Delete the token document
    await Token.findByIdAndDelete(tokenDoc._id);

    res.status(200).json({ message: 'Email address changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error });
  }
});



module.exports = router;
