import {it,expect} from 'vitest';
import {zonedPeriodStart,localDate,validTimezone} from '../src/modules/reportes/reportTimezone.js';
import {reserveRequest} from '../src/middleware/rateLimit.js';
import {newPasswordSchema} from '../src/modules/auth/passwordLifecycle.js';
it('uses the business calendar across Mexico midnight, year boundaries and US DST',()=>{
 expect(localDate(new Date('2026-11-03T02:00:00Z'),'America/Mexico_City')).toBe('2026-11-02');
 expect(zonedPeriodStart('day',new Date('2026-11-03T02:00:00Z'),'America/Mexico_City').toISOString()).toBe('2026-11-02T06:00:00.000Z');
 expect(zonedPeriodStart('year',new Date('2026-01-01T02:00:00Z'),'America/Mexico_City').toISOString()).toBe('2025-01-01T06:00:00.000Z');
 expect(zonedPeriodStart('day',new Date('2026-03-08T18:00:00Z'),'America/New_York').toISOString()).toBe('2026-03-08T05:00:00.000Z');
 expect(zonedPeriodStart('day',new Date('2026-11-01T18:00:00Z'),'America/New_York').toISOString()).toBe('2026-11-01T04:00:00.000Z');
 expect(validTimezone('not/a-zone')).toBe(false);
});
it('reserves at most the request quota and releases the next time window',async()=>{
 const bucket='audit-'+Math.random(),results=await Promise.all(Array.from({length:10},()=>reserveRequest(bucket,3,60000,120001)));
 expect(results.filter(Boolean)).toHaveLength(3);expect(await reserveRequest(bucket,3,60000,180001)).toBe(true);
});
it('new passwords enforce character and bcrypt UTF8 byte limits',()=>{
 expect(newPasswordSchema.safeParse('short').success).toBe(false);expect(newPasswordSchema.safeParse('á'.repeat(37)).success).toBe(false);expect(newPasswordSchema.safeParse('Long-test-password-1').success).toBe(true);
});
import {boundedLegacyRows} from '../src/core/legacyList.js';
it('legacy listings fail explicitly rather than silently truncating large results',()=>{expect(boundedLegacyRows(Array.from({length:200},(_,id)=>id))).toHaveLength(200);expect(()=>boundedLegacyRows(Array.from({length:201},(_,id)=>id))).toThrowError(expect.objectContaining({statusCode:413}));});
