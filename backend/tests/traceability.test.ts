import {expect,it} from 'vitest';
import {getTraceabilitySummary} from '../src/modules/traceability/traceabilityService.js';
it('traceability: unconfigured summaries never report invented health or metrics',()=>{const result=getTraceabilitySummary();expect(result.service).toBe('erp-api');expect(result.status).toBe('not_configured');for(const value of Object.values(result.metrics))expect(value).toBeNull();for(const value of Object.values(result))if(Array.isArray(value))expect(value).toEqual([]);});
