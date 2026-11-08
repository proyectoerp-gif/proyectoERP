import {useId} from 'react';
export type GarmentKind='tee'|'shirt'|'knit'|'trousers'|'jeans'|'skirt'|'dress'|'blazer'|'jacket'|'coat'|'bag'|'cap'|'scarf';
export function GarmentArt({kind,color='#bdb3a0'}:{kind:GarmentKind;color?:string}){
  const id=useId().replace(/:/g,'');
  const top=['tee','shirt','knit','blazer','jacket','coat'].includes(kind);
  const long=kind!=='tee';
  return <svg className="fashion-art" viewBox="0 0 260 340" aria-hidden="true">
    <defs>
      <linearGradient id={'fabric'+id} x1="0" y1="0" x2="1" y2=".4"><stop stopColor={color}/><stop offset=".48" stopColor={color}/><stop offset="1" stopColor="#000" stopOpacity=".24"/></linearGradient>
      <filter id={'shadow'+id} x="-30%" y="-20%" width="160%" height="160%"><feDropShadow dx="2" dy="7" stdDeviation="5" floodOpacity=".1"/></filter>
    </defs>
    <ellipse cx="130" cy="308" rx="67" ry="8" fill="#000" opacity=".035"/>
    <g fill={'url(#fabric'+id+')'} stroke="#302e2a" strokeOpacity=".28" strokeWidth="1" strokeLinejoin="round" filter={'url(#shadow'+id+')'}>
      {top&&<>
        <path d={long?'M106 54 83 64 62 84 32 226 61 234 81 139 81 278 179 278 179 139 199 234 228 226 198 84 177 64 154 54Z':'M106 54 83 64 44 116 70 137 81 119 81 268 179 268 179 119 190 137 216 116 177 64 154 54Z'}/>
        <path d="M106 54Q130 80 154 54L148 48Q130 66 112 48Z" fill="#000" opacity=".15"/>
        <path d="M109 54Q130 77 151 54M86 261h88M84 101v154m92-154v154" fill="none" stroke="#fff" strokeOpacity=".25"/>
        {['shirt','jacket','blazer','coat'].includes(kind)&&<>
          <path d="m112 52-8 27 25 27 1-37 1 37 25-27-8-27" fill={color}/>
          <path d="M130 75v201" stroke="#000" strokeOpacity=".2"/>
          {[120,153,186,219,252].map(y=><circle key={y} cx="133" cy={y} r="2.4" fill="#4a473f" stroke="none"/>)}
          <path d="M91 176h25v35H91zm53 0h25v35h-25z" fill={color}/>
        </>}
        {kind==='knit'&&<path d="M91 87v169m9-169v169m10-172v172m10-168v168m10-167v167m10-168v168m10-172v172m10-169v169m9-169v169" fill="none" stroke="#fff" strokeOpacity=".12"/>}
      </>}
      {(kind==='trousers'||kind==='jeans')&&<>
        <path d="M82 53H178L192 292H144L130 154 116 292H68Z"/>
        <path d="M82 67h96m-48 0v80m-38-67-9 200m85-200 9 200M86 76l25 2-15 27m78-29-25 2 15 27" fill="none" stroke="#fff" strokeOpacity=".25"/>
        <path d="M88 53v14m25-14v14m34-14v14m24-14v14" fill="none"/><circle cx="132" cy="60" r="2.5" fill="#7a6d54"/>
      </>}
      {kind==='skirt'&&<><path d="M89 67H171L204 282H56Z"/><path d="M89 79h82m-73 8L82 271m80-184 16 184m-48-186v185" fill="none" stroke="#fff" strokeOpacity=".27"/></>}
      {kind==='dress'&&<><path d="M104 49H114L116 76H144L146 49H156L169 119 151 149 199 293H61L109 149 91 119Z"/><path d="M111 150h39m-25 9-16 120m27-120 15 120" fill="none" stroke="#fff" strokeOpacity=".25"/></>}
      {kind==='bag'&&<><path d="M84 139V102a46 46 0 0 1 92 0v37" fill="none" stroke={color} strokeOpacity="1" strokeWidth="12"/><path d="M67 134H193Q200 243 130 252 60 243 67 134Z"/><path d="M71 145h118M82 176q48 59 96 0" fill="none" stroke="#fff" strokeOpacity=".2"/></>}
      {kind==='cap'&&<><path d="M68 175a62 62 0 0 1 124 0Z"/><path d="M68 175q65-19 124 0l34 39q-56 26-126-9Z"/><path d="M130 113v57m-37-44-9 47m82-47 9 47" fill="none" stroke="#fff" strokeOpacity=".25"/><circle cx="130" cy="112" r="4"/></>}
      {kind==='scarf'&&<><path d="M83 54H130L153 292H103Z"/><path d="M137 53H177L147 270H110Z"/><path d="M88 62 109 282m-12-220 21 220m28-220-27 200m38-200-27 200m38-200-27 200" fill="none" stroke="#fff" strokeOpacity=".23"/><path d="m105 290 1 12m8-12 1 12m8-12 1 12m8-12 1 12m8-12 1 12" fill="none" stroke={color} strokeOpacity="1" strokeWidth="3"/></>}
    </g>
  </svg>;
}
