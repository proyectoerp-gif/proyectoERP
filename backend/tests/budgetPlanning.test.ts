import {expect,it} from 'vitest';
import {getBudgetPlanningSummary} from '../src/modules/budgetPlanning/budgetPlanningService.js';
it('budgetPlanning: unconfigured summaries never report invented health or metrics',()=>{const result=getBudgetPlanningSummary();expect(result.service).toBe('erp-api');expect(result.status).toBe('not_configured');for(const value of Object.values(result.metrics))expect(value).toBeNull();for(const value of Object.values(result))if(Array.isArray(value))expect(value).toEqual([]);});
