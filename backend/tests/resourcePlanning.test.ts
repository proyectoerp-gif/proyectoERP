import {expect,it} from 'vitest';
import {getResourcePlanningSummary} from '../src/modules/resourcePlanning/resourcePlanningService.js';
it('resourcePlanning: unconfigured summaries never report invented health or metrics',()=>{const result=getResourcePlanningSummary();expect(result.service).toBe('erp-api');expect(result.status).toBe('not_configured');for(const value of Object.values(result.metrics))expect(value).toBeNull();for(const value of Object.values(result))if(Array.isArray(value))expect(value).toEqual([]);});
