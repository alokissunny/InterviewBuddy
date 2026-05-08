const mongoose = require('mongoose');
const User = require('../models/User');

let connected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[DB] MONGODB_URI not set — running without persistence');
    return false;
  }
  if (connected) return true;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    connected = true;
    console.log('[DB] Connected to MongoDB');
    return true;
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    return false;
  }
}

// Look up a user by email. If not found, create with the provided basicProfile.
// Returns the User document (always the MongoDB-stored version).
async function findOrCreateUser(email, basicProfile) {
  if (!email || !connected) return null;

  const lowerEmail = email.toLowerCase();
  let user = await User.findOne({ email: lowerEmail });

  if (!user) {
    user = await User.create({
      email: lowerEmail,
      name:        basicProfile.name       || '',
      title:       basicProfile.title      || '',
      phone:       basicProfile.phone      || '',
      photoUrl:    basicProfile.photoUrl   || '',
      profileUrl:  basicProfile.profileUrl || '',
      summary:     basicProfile.summary    || '',
      linkedinSub: basicProfile.linkedinSub || '',
      skills:       basicProfile.skills      || [],
      experience:   basicProfile.experience  || [],
      education:    basicProfile.education   || [],
      projects:     basicProfile.projects    || [],
      achievements: basicProfile.achievements || [],
    });
    console.log('[DB] Created new user:', lowerEmail);
  } else {
    // Update lightweight fields that may change at each LinkedIn login (photo, name)
    let changed = false;
    if (basicProfile.photoUrl && basicProfile.photoUrl !== user.photoUrl) {
      user.photoUrl = basicProfile.photoUrl;
      changed = true;
    }
    if (basicProfile.linkedinSub && !user.linkedinSub) {
      user.linkedinSub = basicProfile.linkedinSub;
      changed = true;
    }
    if (changed) await user.save();
    console.log('[DB] Found existing user:', lowerEmail,
      '| skills:', user.skills.length,
      '| exp:', user.experience.length);
  }

  return user;
}

// Full upsert — replace entire profile for a given email.
async function upsertUser(email, profileData) {
  if (!email || !connected) return null;

  const lowerEmail = email.toLowerCase();
  const update = {
    name:         profileData.name         || '',
    title:        profileData.title        || '',
    phone:        profileData.phone        || '',
    photoUrl:     profileData.photoUrl     || '',
    profileUrl:   profileData.profileUrl   || '',
    summary:      profileData.summary      || '',
    skills:       profileData.skills       || [],
    experience:   profileData.experience   || [],
    education:    profileData.education    || [],
    projects:     profileData.projects     || [],
    achievements: profileData.achievements || [],
  };

  const user = await User.findOneAndUpdate(
    { email: lowerEmail },
    { $set: update },
    { new: true, upsert: true }
  );

  console.log('[DB] Upserted user:', lowerEmail);
  return user;
}

// Patch resume S3 metadata only (called after CV upload)
async function setResumeS3Key(email, s3Key, s3Bucket) {
  if (!email || !connected) return;

  await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $set: { resumeS3Key: s3Key, resumeS3Bucket: s3Bucket, resumeUploadedAt: new Date() } }
  );
  console.log('[DB] Saved S3 key for:', email, '→', s3Key);
}

module.exports = { connectDB, findOrCreateUser, upsertUser, setResumeS3Key };
