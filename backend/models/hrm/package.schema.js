import mongoose, { Schema } from "mongoose";

const permissionSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'employees',
    required: true
  },

  enableAllModules: {
    type: Boolean,
    default: false
  },

  modules: {
    holidays: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    leaves: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    clients: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    projects: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    tasks: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    chats: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    assets: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    timingSheets: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    }
  },
}, { timestamps: true });

export const permissions = mongoose.model("permissions", permissionSchema);

const policySchema = new Schema(
  {
    policyName: { type: String, required: true, maxlength: 100 },
    department: { type: String, required: true },
    description: {type: String, required: true},
    effectiveDate: { type: Date, required: true},
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
    updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
  }, { timestamps: true });

export const policy = mongoose.model("policy", policySchema);

const designationSchema = new Schema({
  department: { type: Schema.Types.ObjectId, required: true, ref: 'department' },
  designation: { type: String, required: true,},
  status: { type: String, required: true, enum: ['Active', 'Inactive'], default: 'Active' },
  createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
}, { timestamps: true });

export const designations = mongoose.model("designations", designationSchema);

const departmentSchema = new Schema({
  department: { type: String, required: true , unique: true},
  status: { type: String, required: true, enum: ['Active', 'Inactive'], default: 'Active' },
  createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'hr' },
}, { timestamps: true });

export const departments = mongoose.model("departments", departmentSchema);
