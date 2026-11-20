import {useId} from 'react';

export function UpLogo({className='' }:{className?:string}){
  const gradientId=useId().replace(/:/g,'');
  return <svg className={className} viewBox="0 0 184 72" role="img" aria-label="Up">
    <defs>
      <linearGradient id={gradientId} x1="0" x2="1" y1="1" y2="0"><stop stopColor="#b8ff35"/><stop offset=".45" stopColor="#64e5ff"/><stop offset="1" stopColor="#ff5fc8"/></linearGradient>
    </defs>
    <path d="M13 12v27c0 13 8 21 22 21s22-8 22-21V12H44v26c0 6-3 10-9 10s-9-4-9-10V12H13Z" fill="currentColor"/>
    <path d="M69 12h14v5c4-4 9-6 15-6 14 0 25 11 25 25S112 61 98 61c-6 0-11-2-15-6v15H69V12Zm14 24c0 8 5 13 13 13s13-5 13-13-5-13-13-13-13 5-13 13Z" fill="currentColor"/>
    <path d="m143 9 10 16 18 3-13 13 3 18-18-9-17 9 3-18-13-13 18-3 9-16Z" fill={'url(#'+gradientId+')'}/>
  </svg>;
}
