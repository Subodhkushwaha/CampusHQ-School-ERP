const mongoose = require('mongoose');

const logout = async (req, res, { userModel }) => {
  const UserPassword = mongoose.model(userModel + 'Password');

  // const token = req.cookies[`token_${cloud._id}`];

  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.cookies?.token;

  if (res.clearCookie) {
    res.clearCookie('token', {
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  if (token)
    await UserPassword.findOneAndUpdate(
      { user: req.admin._id },
      { $pull: { loggedSessions: token } },
      {
        new: true,
      }
    ).exec();
  else
    await UserPassword.findOneAndUpdate(
      { user: req.admin._id },
      { loggedSessions: [] },
      {
        new: true,
      }
    ).exec();

  return res.json({
    success: true,
    result: {},
    message: 'Successfully logout',
  });
};

module.exports = logout;
