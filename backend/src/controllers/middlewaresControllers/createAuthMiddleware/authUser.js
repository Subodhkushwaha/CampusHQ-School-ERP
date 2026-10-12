const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authUser = async (req, res, { user, databasePassword, password, UserPasswordModel }) => {
  const isMatch = await bcrypt.compare(databasePassword.salt + password, databasePassword.password);

  if (!isMatch)
    return res.status(401).json({
      success: false,
      result: null,
      message: 'Invalid credentials.',
    });

  if (isMatch === true) {
    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: req.body.remember ? 365 * 24 + 'h' : '24h' }
    );

    await UserPasswordModel.findOneAndUpdate(
      { user: user._id },
      { $push: { loggedSessions: token } },
      {
        new: true,
      }
    ).exec();

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      maxAge: req.body.remember ? 365 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
      sameSite: isProduction ? 'none' : 'lax',
      httpOnly: true,
      secure: isProduction,
      path: '/',
    });

    res.status(200).json({
      success: true,
      result: {
        _id: user._id,
        name: user.name,
        surname: user.surname,
        role: user.role,
        email: user.email,
        photo: user.photo,
        teacherRef: user.teacherRef,
        studentRef: user.studentRef,
        parentStudentRef: user.parentStudentRef,
        token: token,
        maxAge: req.body.remember ? 365 : null,
      },
      message: 'Successfully login user',
    });
  } else {
    return res.status(401).json({
      success: false,
      result: null,
      message: 'Invalid credentials.',
    });
  }
};

module.exports = authUser;
