import {promises as dns} from 'node:dns';
// Atlas-only fallback when this workstation blocks UDP DNS. Queries contain
// public hostnames only. Credentials are never sent to the DNS HTTPS endpoint.
export async function backupMongoUri(uri,request=fetch){
 if(!uri.startsWith('mongodb+srv://'))return uri;
 const original=new URL(uri);
 if(!original.hostname.endsWith('.mongodb.net'))return uri;
 async function answer(name,type){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{const response=await request('https://cloudflare-dns.com/dns-query?'+new URLSearchParams({name,type}),{headers:{Accept:'application/dns-json'},signal:controller.signal});if(!response.ok)throw Error('DNS lookup unavailable');const result=await response.json();if(result.Status!==0)throw Error('DNS lookup failed');return (result.Answer??[]).filter(v=>v.type===(type==='SRV'?33:16)).map(v=>v.data);}finally{clearTimeout(timer);}
 }
 let hosts,txt;
 try{hosts=await dns.resolveSrv('_mongodb._tcp.'+original.hostname);txt=(await dns.resolveTxt(original.hostname)).map(v=>v.join(''));}
 catch{const [srv,records]=await Promise.all([answer('_mongodb._tcp.'+original.hostname,'SRV'),answer(original.hostname,'TXT')]);hosts=srv.map(row=>{const fields=row.trim().split(/\s+/);return {name:fields[3]?.replace(/\.$/,''),port:Number(fields[2])};});txt=records.map(row=>row.replace(/^"|"$/g,'').replace(/"\s*"/g,''));}
 const suffix='.'+original.hostname.split('.').slice(1).join('.');
 if(!hosts.length||hosts.length>20||hosts.some(h=>typeof h.name!=='string'||!h.name.endsWith(suffix)||!/^[a-z0-9.-]+$/i.test(h.name)||!Number.isInteger(h.port)||h.port<1||h.port>65535))throw Error('Unsafe Atlas DNS response');
 const options=new URLSearchParams();
 for(const record of txt)for(const [key,value]of new URLSearchParams(record))if(['authSource','replicaSet','loadBalanced'].includes(key))options.set(key,value);
 for(const [key,value]of original.searchParams)options.set(key,value);options.set('tls','true');
 const auth=original.username?(original.username+(original.password?':'+original.password:'')+'@'):'';
 return 'mongodb://'+auth+hosts.map(h=>h.name+':'+h.port).join(',')+original.pathname+'?'+options;
}
