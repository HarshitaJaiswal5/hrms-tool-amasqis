import mongoose from "mongoose";

const taskSchema = new Schema({
  title: { type: String, required: true },
  empIds: [{ type: Types.ObjectId, ref: 'employees', required: true }],
  projectId: { type: Types.ObjectId, ref: 'projects', required: true },
  starred: { type: Boolean, default: false },
  checked: { type: Boolean, default: false },
  status: { type: String, enum: ["onHold", "ongoing", "completed", "pending"], default: "pending" }
});
export const tasks = mongoose.model("tasks", taskSchema)

const projectSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  projLead: { type: Types.ObjectId, ref: 'leads', required: true },
  projManager: { type: Types.ObjectId, ref: 'employees', required: true },
  empMembers: [{ type: Types.ObjectId, ref: 'employees', required: true }],
  status: { type: String, enum: ["ongoing", "onHold", "completed", "cancelled"], default: "ongoing" },
  startDate: { type: Date },
  dueDate: { type: Date },
  domain: { type: String },
  priority: { type: String, enum: ["high", "medium", "low"], default: "low" },
  clientName: { type: String },
}, { timestamps: true });

export const projects = mongoose.model("projects", projectSchema)

const meetingSchema = new mongoose.Schema({
  startTime: { type: Date, required: true, },
  title: { type: String, required: true },
  description: { type: String, trim: true },
  tag: { type: String, enum: ["review", "development", "celebration"], default: "review" },
  leadId: { type: String, required: true },
}, { timestamps: true, })

export const meetings = mongoose.model("meetings", meetingSchema);

const skillSchema = new mongoose.Schema({
  employeeId: { type: Types.ObjectId, ref: 'employees', required: true },
  name: { type: String, required: true },
  proficiency: { type: Number, required: true, min: 0, max: 100 },
}, { timestamps: true, })

export const skills = mongoose.model("skills", skillSchema);

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  time: { type: Date, required: true, index: true },
  description: { type: String, required: true },
  employeeId: { type: Types.ObjectId, ref: 'leads', required: true },
}, { timestamps: true, })

export const notifications = mongoose.model("notifications", notificationSchema);

const attendanceSchema = new Schema({
  employeeId: { type: Types.ObjectId, ref: 'employees', required: true },
  date: { type: Date, required: true },
  punchIn: { type: Date },
  punchOut: { type: Date },
  breakDetails: [
    {
      start: { type: Date },
      end: { type: Date }
    }
  ],
  totalBreakMins: { type: Number, default: 0 },
  totalProductiveHours: { type: Number, default: 0 },
  attendanceStatus: { type: String, enum: ['onTime', 'late', 'absent'], required: true },
  mode: { type: String, enum: ["workFromHome", "onSite"], default: "onSite" },
  overtimeRequestStatus: { type: String, enum: ["pending", "approved", "rejected", "none"], default: "none" },
  expectedOvertimeHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
}, { timestamps: true });

export const attendance = mongoose.model("attendance", attendanceSchema);

const salaryHistorySchema = new Schema({
  empId: { type: Types.ObjectId, ref: 'employees', required: true },
  salary: { type: Number, required: true },
  effectiveDate: { type: Date, required: true },
}, { timestamps: true, });

export const SalaryHistory = mongoose.model('salaryHistory', salaryHistorySchema);

const detailsSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  headOffice: { type: String, required: true },
  punchInTime: { type: String, required: true },
  punchOutTime: { type: String, required: true },
  totalWorkingHoursInDay: { type: Number, required: true },
  totalWorkingDays: { type: Number, required: true },
  totalLeavesAllowed: { type: Number, required: true },
  timeZone: { type: String, required: true },
}, {
  timestamps: true
});

export const details = mongoose.model('details', detailsSchema);

const leaveSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'employees' },
  leaveType: { type: String, enum: ["causual", "sick", "lossOfPay"], default: "casual", required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", required: true },
  noOfDays: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String },
}, {
  timestamps: true
});

export const leaves = mongoose.model('leaves', leaveSchema);

// sub-schemas for employees
const addressSchema = new Schema({
  blockNo: { type: String, trim: true, maxlength: 20 },
  street: { type: String, trim: true, maxlength: 100 },
  city: { type: String, trim: true, maxlength: 50 },
  state: { type: String, trim: true, maxlength: 50 },
  country: { type: String, trim: true, maxlength: 50 },
  zipCode: { type: String, trim: true, maxlength: 20 },
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
}, { _id: false, select: false, timeStamps: true });

const passportSchema = new Schema({
  number: { type: String, trim: true, uppercase: true, maxlength: 20 },
  expiry: { type: Date, required: true },
  nationality: { type: String, trim: true, maxlength: 50 },
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
}, { _id: false, select: false, timeStamps: true });

const emergencyContactSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  relationship: { type: String, required: true, trim: true, maxlength: 30 },
  phones: [{ type: String, validate: { validator: v => /^\+?\d{10,15}$/.test(v) } }],
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
}, { _id: false, select: false, timeStamps: true });

const bankDetailsSchema = new Schema({
  bankName: { type: String, required: true, trim: true, maxlength: 50 },
  accountNumber: { type: String, required: true, maxlength: 20 },
  ifsc: { type: String, required: true, trim: true, uppercase: true, maxlength: 15 },
  branchAddress: { type: String, trim: true, maxlength: 100 },
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
}, { _id: false, select: false, timeStamps: true });

const educationSchema = new Schema({
  institution: { type: String, required: true, trim: true, maxlength: 100 },
  course: { type: String, required: true, trim: true, maxlength: 50 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, validate: { validator: function (v) { return !this.start || v >= this.start } } },
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
}, { _id: false, select: false, timeStamps: true });

const experienceSchema = new Schema({
  previousCompany: { type: String, required: true, trim: true, maxlength: 100 },
  designation: { type: String, required: true, trim: true, maxlength: 50 },
  start: { type: Date, required: true },
  end: { type: Date, validate: { validator: function (v) { return this.current || (!this.current && v >= this.start) } } },
  currentlyWorking: { type: Boolean, required: true, default: false },
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
}, { _id: false, select: false, timeStamps: true });

const warrantySchema = new Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true, validate: { validator: function (v) { return v >= this.start } } },
}, { _id: false, select: false });

const assetSchema = new Schema({
  assetId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true, maxlength: 50 },
  type: { type: String, required: true, trim: true, maxlength: 30 },
  images: [{ type: String, validate: { validator: v => /\.(jpg|jpeg|png)$/i.test(v) } }],
  serial: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
  cost: { type: Number, min: 0 },
  brand: { type: String, required: true, trim: true, maxlength: 20 },
  category: { type: String, required: true, trim: true, maxlength: 20 },
  vendor: { type: String, required: true, trim: true, maxlength: 20 },
  location: { type: String, required: true, trim: true, maxlength: 50 },
  warranty: warrantySchema,
  assignedOn: { type: Date, default: Date.now },
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
  isIssue: { type: Boolean, required: true },
  issueDetails: {
    issueId: { type: String, unique: true, trim: true, uppercase: true },
    description: { type: String, trim: true, maxlength: 500 },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'employees' },
    raisedOn: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN'
    },
  },
  maintenanceHistory: [{
    date: { type: Date, default: Date.now },
    performedBy: { type: String, trim: true, maxlength: 50 },
    description: { type: String, trim: true, maxlength: 500 },
    cost: { type: Number, min: 0 }
  }]
}, { _id: false, select: false, timeStamps: true });

export const assets = mongoose.model("assets", assetSchema);

const familySchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 20 },
  relationship: { type: String, required: true, trim: true, maxlength: 10 },
  phone: { type: String, required: true, trim: true, maxlength: 0 },
  passportExpiry: { type: String, validate: { validator: v => /^\+?\d{10,15}$/.test(v) } },
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
}, { _id: false, select: false, timeStamps: true });

const salaryInformationSchema = new Schema({
  basisType: { type: String, enum: ['Monthly', 'Annually'], required: true },
  amount: { type: Number, required: true, min: 0 },
  paymentType: { type: String, enum: ['Cash', 'Debit Card', 'Mobile Payment', 'Bank Transfer'], required: true },
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
}, { _id: false, select: false, timeStamps: true });

const pfInformationSchema = new Schema({
  pfContribution: { type: String, required: true },
  pfNo: { type: String, trim: true },
  pfRate: { type: Number, min: 0, max: 100 },
  additionalRate: { type: Number, min: 0, max: 100 },
  totalRate: { type: Number, min: 0, max: 100 },
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
}, { _id: false, select: false, timeStamps: true });

const esiInformationSchema = new Schema({
  esiContribution: { type: String, required: true },
  esiNo: { type: String, trim: true },
  esiRate: { type: Number, min: 0, max: 100 },
  additionalRate: { type: Number, min: 0, max: 100 },
  totalRate: { type: Number, min: 0, max: 100 },
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
}, { _id: false, select: false, timeStamps: true });

const employeeSchema = new Schema({
  employeeId: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 20 },
  dateOfJoining: { type: Date, required: true },
  designation: { type: String, required: true, trim: true, maxlength: 50 },
  department: { type: String, required: true, trim: true, maxlength: 50 },
  role: { type: String, trim: true, maxlength: 50 },
  timeZone: { type: String, required: true, trim: true, maxlength: 15 },
  companyName: { type: String, required: true, trim: true, maxlength: 20 },
  about: { type: String, required: true, trim: true, maxlength: 100 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  reportOffice: { type: String, required: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  avatar: { type: String, default: 'assets/img/profiles/default-avatar.jpg' },
  yearsOfExperience: { type: Number, required: true, trim: true, maxlength: 2 },
  contact: {
    phone: { type: String, required: true, validate: { validator: v => /^\+?\d{10,15}$/.test(v) } },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/] },
  },
  personal: {
    type: {
      gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
      birthday: { type: Date, required: true },
      maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'], required: true },
      religion: { type: String, required: true, trim: true, maxlength: 15 },
      employmentOfSpouse: { type: Boolean, required: true },
      noOfChildren: { type: Number, required: true },
      passport: passportSchema,
      address: addressSchema,
    },
    select: false,
  },
  account: {
    type: {
      userName: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
      password: { type: String, required: true, select: false, minlength: 8 }
    },
    select: false,
  },
  emergencyContacts: { type: [emergencyContactSchema], select: false },
  bank: { type: bankDetailsSchema, select: false },
  family: { type: familySchema, select: false },
  education: { type: educationSchema, select: false },
  experience: { type: experienceSchema, select: false },
  assets: { type: [assetSchema], select: false },
  statutory: {
    type: {
      salary: { type: salaryInformationSchema, select: false },
      pf: { type: pfInformationSchema, select: false },
      esi: { type: esiInformationSchema, select: false }
    }, select: false,
  },
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export const employees = mongoose.model('employees', employeeSchema);