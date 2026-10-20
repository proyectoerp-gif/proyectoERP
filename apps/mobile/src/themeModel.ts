export type Appearance = {mode:'light'|'dark';accent:string;font:'modern'|'rounded'|'mono'};
export const defaultAppearance:Appearance={mode:'light',accent:'#14786b',font:'modern'};
export const accentOptions=['#14786b','#385fba','#7755a6','#a95a20','#ad435c'];
export function parseAppearance(value:unknown):Appearance {
 const v=value as Partial<Appearance>|null;
 return {mode:v?.mode==='dark'?'dark':'light',accent:typeof v?.accent==='string'&&/^#[a-f\d]{6}$/i.test(v.accent)?v.accent:defaultAppearance.accent,font:v?.font==='mono'||v?.font==='rounded'?v.font:'modern'};
}
export function luminance(hex:string){const c=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
export function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function makeTheme(appearance:Appearance){
 const dark=appearance.mode==='dark',surface=dark?'#14232e':'#ffffff';
 return {...appearance,background:dark?'#0d1822':'#f4f6f8',surface,soft:dark?'#10202c':'#f6f8fa',line:dark?'#2d4554':'#dce3e8',text:dark?'#edf5f8':'#192c36',muted:dark?'#adbfca':'#596c76',danger:dark?'#ffd3d5':'#a12530',dangerSurface:dark?'#402730':'#fff0f0',onAccent:contrast(appearance.accent,'#ffffff')>=contrast(appearance.accent,'#000000')?'#ffffff':'#000000',link:contrast(appearance.accent,surface)>=4.5?appearance.accent:dark?'#94e4bc':'#245d4c',fontFamily:appearance.font==='mono'?'monospace':appearance.font==='rounded'?'sans-serif-medium':'sans-serif'};
}
export type MobileTheme=ReturnType<typeof makeTheme>;
// Compatibility tokens keep existing native forms on the same palette while their
// business logic remains unchanged. New screens use the semantic theme directly.
export function themedColor(value:unknown,theme:MobileTheme):unknown {
 if(typeof value!=='string')return value;
 const key=value.toUpperCase();
 if(['#F1F5F9'].includes(key))return theme.text;
 if(['#9BACBA','#8B99A8','#718096'].includes(key))return theme.muted;
 if(['#111923','#101922'].includes(key))return theme.surface;
 if(['#0A1118','#0B1118','#0B1016','#0B1119'].includes(key))return theme.soft;
 if(key==='#293746')return theme.line;
 if(key==='#F87171')return theme.danger;
 return value;
}
