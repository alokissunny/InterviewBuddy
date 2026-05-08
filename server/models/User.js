const mongoose = require('mongoose');

const ExperienceSchema = new mongoose.Schema({
  company:    { type: String, default: '' },
  role:       { type: String, default: '' },
  duration:   { type: String, default: '' },
  highlights: { type: [String], default: [] },
}, { _id: false });

const EducationSchema = new mongoose.Schema({
  institution: { type: String, default: '' },
  degree:      { type: String, default: '' },
  year:        { type: String, default: '' },
}, { _id: false });

const ProjectSchema = new mongoose.Schema({
  name:         { type: String, default: '' },
  description:  { type: String, default: '' },
  technologies: { type: [String], default: [] },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  // LinkedIn identity — email is the primary key used for lookups
  email:        { type: String, required: true, unique: true, index: true, lowercase: true },
  linkedinSub:  { type: String, index: true, sparse: true },

  // Basic info
  name:       { type: String, default: '' },
  title:      { type: String, default: '' },
  phone:      { type: String, default: '' },
  photoUrl:   { type: String, default: '' },
  profileUrl: { type: String, default: '' },
  summary:    { type: String, default: '' },

  // Structured profile data
  skills:       { type: [String], default: [] },
  experience:   { type: [ExperienceSchema], default: [] },
  education:    { type: [EducationSchema], default: [] },
  projects:     { type: [ProjectSchema], default: [] },
  achievements: { type: [String], default: [] },

  // Resume storage
  resumeS3Key:      { type: String, default: '' },   // S3 object key of the latest uploaded file
  resumeS3Bucket:   { type: String, default: '' },   // bucket name (in case it changes)
  resumeUploadedAt: { type: Date },

}, { timestamps: true }); // adds createdAt + updatedAt automatically

// Convert Mongoose doc to the plain CandidateProfile shape the client expects
UserSchema.methods.toClientProfile = function () {
  return {
    name:        this.name,
    title:       this.title,
    email:       this.email,
    phone:       this.phone,
    photoUrl:    this.photoUrl,
    profileUrl:  this.profileUrl,
    summary:     this.summary,
    skills:      this.skills,
    experience:  this.experience.map(e => ({
      company:    e.company,
      role:       e.role,
      duration:   e.duration,
      highlights: e.highlights,
    })),
    education:   this.education.map(e => ({
      institution: e.institution,
      degree:      e.degree,
      year:        e.year,
    })),
    projects:    this.projects.map(p => ({
      name:         p.name,
      description:  p.description,
      technologies: p.technologies,
    })),
    achievements: this.achievements,
  };
};

module.exports = mongoose.model('User', UserSchema);
