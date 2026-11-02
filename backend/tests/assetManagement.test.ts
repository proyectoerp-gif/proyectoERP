import {expect,it} from 'vitest';
import {getAssetManagementSummary} from '../src/modules/assetManagement/assetManagementService.js';
it('assetManagement: unconfigured summaries never report invented health or metrics',()=>{const result=getAssetManagementSummary();expect(result.service).toBe('erp-api');expect(result.status).toBe('not_configured');for(const value of Object.values(result.metrics))expect(value).toBeNull();for(const value of Object.values(result))if(Array.isArray(value))expect(value).toEqual([]);});
