import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { getAuditEventModel } from '../auditoria/models/AuditEvent.js';
import { getCompanyModel } from './models/Company.js';

const companyId = 'company-promaxima-demo';
const branchId = 'branch-promaxima-demo';
const oldName = 'Albor Moda — empresa ficticia';
const newName = 'Up!';

export async function renameLegacyDemoCompanyName(): Promise<boolean> {
  if (env.ERP_ENVIRONMENT !== 'demo' || env.MONGODB_DB_NAME !== 'erp_app') return false;
  const Company = getCompanyModel();
  const AuditEvent = getAuditEventModel();
  await Promise.all([Company.init(), AuditEvent.init()]);
  const session = await mongoose.startSession();
  let changed = false;
  try {
    await session.withTransaction(async () => {
      const updated = await Company.findOneAndUpdate(
        { _id: companyId, name: oldName, status: 'ACTIVE' },
        { $set: { name: newName } },
        { new: true, session, runValidators: true }
      ).lean();
      if (!updated) return;
      await AuditEvent.create([{
        companyId,
        branchId,
        userId: 'system:rename-up-brand',
        action: 'UPDATE',
        module: 'configuracion',
        entityId: companyId,
        details: { field: 'name', previousName: oldName, newName, operation: 'rename-company-brand' }
      }], { session });
      changed = true;
    });
    return changed;
  } finally {
    await session.endSession();
  }
}
