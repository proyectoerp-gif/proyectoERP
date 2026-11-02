import {afterAll,beforeAll,it,expect} from 'vitest';
import {gzipSync} from 'node:zlib';
import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {app} from '../src/app.js';
let server:Server,base:string;
beforeAll(async()=>{server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve));base='http://127.0.0.1:'+(server.address() as AddressInfo).port;});
afterAll(()=>new Promise<void>(resolve=>server.close(()=>resolve())));
it('rejects compressed JSON before authentication while accepting normal JSON validation',async()=>{
 const encoded=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json','Content-Encoding':'gzip'},body:gzipSync('{}')});expect(encoded.status).toBe(415);
 const normal=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});expect(normal.status).toBe(400);
 expect((await fetch(base+'/health/live')).status).toBe(200);
});
it('rejects oversized JSON and compressed recovery forms with explicit HTTP status',async()=>{
 expect((await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:'x'.repeat(1024*1024)})})).status).toBe(413);
 expect((await fetch(base+'/api/v1/auth/password-reset',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Encoding':'gzip'},body:gzipSync('email=test%40example.invalid')})).status).toBe(415);
});
