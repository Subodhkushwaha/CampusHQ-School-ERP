const mongoose = require('mongoose');

const getNoticeFeed = async (req, res) => {
  try {
    const Notice = mongoose.model('Notice');
    const userRole = req.admin?.role || 'owner';

    const query = { removed: false, isPublished: true };

    const now = new Date();
    // For general audiences, do not show expired notices
    if (['student', 'teacher', 'parent'].includes(userRole)) {
      query.$or = [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gte: now } }];
    }

    if (['student'].includes(userRole)) {
      query.targetAudience = { $in: ['All', 'Students'] };
    } else if (['teacher'].includes(userRole)) {
      query.targetAudience = { $in: ['All', 'Teachers'] };
    } else if (['parent'].includes(userRole)) {
      query.targetAudience = { $in: ['All', 'Parents'] };
    }

    const notices = await Notice.find(query).sort({ isPinned: -1, publishDate: -1 });

    return res.status(200).json({
      success: true,
      result: notices,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getNoticeFeed,
};
