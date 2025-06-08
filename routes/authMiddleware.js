const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
require('dotenv').config();

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; 

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); 

    const user = await User.findById(decoded.id); 
    if (!user) {
      return res.status(401).json({ message: 'Invalid token: user not found' });
    }

    req.userId = user._id;
    next(); 
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized', error: error.message });
  }
};

module.exports = authMiddleware;
