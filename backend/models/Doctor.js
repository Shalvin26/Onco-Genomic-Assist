const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // never return password by default in queries
    },
    specialization: {
      type: String, // e.g. "Oncologist", "Clinical Geneticist"
      default: '',
    },
    institution: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['doctor', 'admin'], // scaffolding for future roles (genetic counselor, admin, etc.)
      default: 'doctor',
    },
  },
  { timestamps: true }
);

// password hashing code before saving so that plain text dont get  saved kind of middleware 
doctorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

//method to verify inserted password to stored password while logging in 
doctorSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Doctor', doctorSchema);