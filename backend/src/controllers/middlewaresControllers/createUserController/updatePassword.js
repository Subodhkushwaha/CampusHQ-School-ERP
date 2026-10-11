const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generate: uniqueId } = require('shortid');

const updatePassword = async (userModel, req, res) => {
  const UserPassword = mongoose.model(userModel + 'Password');

  const reqUserName = userModel.toLowerCase();
  const userProfile = req[reqUserName];

  if (!userProfile) {
    return res.status(401).json({
      success: false,
      result: null,
      message: 'Authentication required.',
    });
  }

  const targetUserId = req.params.id;

  if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid target user ID format.',
    });
  }

  // Authorization check: only self or super admin/owner can change user password
  const isSelf = userProfile._id.toString() === targetUserId.toString();
  const isSuperAdmin = userProfile.role === 'owner' || userProfile.role === 'admin';
  if (!isSelf && !isSuperAdmin) {
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Access denied: You are not authorized to update passwords for other accounts.',
    });
  }

  let { password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'The password needs to be at least 8 characters long.',
    });
  }

  const salt = uniqueId();
  const passwordHash = bcrypt.hashSync(salt + password);

  const UserPasswordData = {
    password: passwordHash,
    salt: salt,
    loggedSessions: [], // Invalidate previous sessions upon password reset for security
  };

  const resultPassword = await UserPassword.findOneAndUpdate(
    { user: targetUserId, removed: false },
    { $set: UserPasswordData },
    {
      new: true,
    }
  ).exec();

  if (!resultPassword) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'User password record not found.',
    });
  }

  return res.status(200).json({
    success: true,
    result: {},
    message: 'Password updated successfully.',
  });
};

module.exports = updatePassword;
