import { createContext } from 'react';
import type { ExportDocument } from './exportDocument';
type Identity = { companyId?: string; branchId?: string; companyName?: string; branchName?: string };
export const ExportIdentityContext = createContext<Identity>({});
export function identifyExport(document: ExportDocument, identity: Identity): ExportDocument {
  return { ...document,
    company: identity.companyName && (document.company === identity.companyId || document.company === 'Empresa de la sesión') ? identity.companyName : document.company,
    branch: identity.branchName && (document.branch === identity.branchId || document.branch === 'Sucursal de la sesión') ? identity.branchName : document.branch
  };
}
