import {Disclosure} from './src/Disclosure';
import {NativeDialogHost} from './src/NativeDialogHost';
import {ExportIdentityContext} from './src/ExportIdentity';
import {NavigationGuardProvider,useNativeNavigation} from './src/NavigationGuard';
import { hasModulePermission, canSettleCommercial } from '../../shared/constants/modulePermissions';
import {OrganizationPanel} from './src/OrganizationPanel';
import {RolesPanel} from './src/RolesPanel';
import {CompliancePanel} from './src/CompliancePanel';
import {RisksPanel} from './src/RisksPanel';
import {TicketsPanel} from './src/TicketsPanel';
import {AssetsPanel} from './src/AssetsPanel';
import {QualityPanel} from './src/QualityPanel';
import {MaintenancePanel} from './src/MaintenancePanel';
import {ShipmentsPanel} from './src/ShipmentsPanel';
import {OpportunitiesPanel} from './src/OpportunitiesPanel';
import {InvoicesPanel} from './src/InvoicesPanel';
import {ProductionPanel} from './src/ProductionPanel';
import {ProjectsPanel} from './src/ProjectsPanel';
import {UsersPanel} from './src/UsersPanel';
import {DepartmentsPanel} from './src/DepartmentsPanel';
import {NotificationsPanel} from './src/NotificationsPanel';
import {EmployeePanel} from './src/EmployeePanel';
import {AuditPanel} from './src/AuditPanel';
import {InventoryAlerts} from './src/InventoryAlerts';
import {PeriodReportPanel} from './src/PeriodReportPanel';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TransactionPanel } from './src/TransactionPanel';
import { ProfilePanel } from './src/ProfilePanel';
import { FinancePanel } from './src/FinancePanel';
import { loginRequest, type Session, type CatalogKind } from './src/api';
import { CatalogPanel } from './src/CatalogPanel';
import { InventoryPanel } from './src/InventoryPanel';
import { DashboardPanel } from './src/DashboardPanel';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from './src/ui';

import {Linking,BackHandler,KeyboardAvoidingView,Platform} from './src/ui';
import {NativeThemeProvider,useNativeTheme} from './src/NativeTheme';
import {accentOptions} from './src/themeModel';
import {visibleNavigation,pageInfo,searchPages,type Page} from '../../shared/constants/navigation';
import {SupportStaffPanel} from './src/SupportStaffPanel';
import {loadCompany,loadBranches} from './src/organizationApi';

declare const process:{env:Record<string,string|undefined>};
const apiBaseUrl=(process.env.EXPO_PUBLIC_API_URL||'http://localhost:4000/api/v1').replace(/\/+$/,'');
const storefrontUrl=process.env.EXPO_PUBLIC_STOREFRONT_URL||(apiBaseUrl==='https://proyectoerp-addi.onrender.com/api/v1'?'https://proyectoerp-web.onrender.com/tienda':null);
export default function App(){return <NativeThemeProvider><NavigationGuardProvider><Workspace/><NativeDialogHost/></NavigationGuardProvider></NativeThemeProvider>;}
function Workspace(){
 const {theme:t,setAppearance}=useNativeTheme(); const navigation=useNativeNavigation();
 const [session,setSession]=useState<Session|null>(null),[page,setPage]=useState<Page|'profile'>('dashboard'),[menu,setMenu]=useState(false),[settings,setSettings]=useState(false),[customColor,setCustomColor]=useState(''),[search,setSearch]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[company,setCompany]=useState('Empresa de tu sesión'),[branch,setBranch]=useState('Sucursal de tu sesión');
 const scroll=useRef<import('react-native').ScrollView>(null),loginLock=useRef(false);
 const expire=useCallback(()=>{setSession(null);setPage('dashboard');setError('Tu sesión venció. Inicia sesión de nuevo.');},[]);
 const groups=visibleNavigation(session?.user.permissions??[]),group=groups.find(g=>g.pages.includes(page as Page)),info=page==='profile'?{label:'Mi cuenta',description:'Los datos de tu cuenta y de tu sesión.',tip:''}:pageInfo[page];
 const navigate=(next:Page|'profile')=>{if(next!=='profile'&&!hasModulePermission(session?.user.permissions??[],next))return;navigation.navigate(()=>{setPage(next);setMenu(false);setSearch('');scroll.current?.scrollTo({y:0,animated:false});});};
 useEffect(()=>{const handler=BackHandler.addEventListener('hardwareBackPress',()=>{if(page==='dashboard'||!session)return false;navigation.navigate(()=>{setPage('dashboard');scroll.current?.scrollTo({y:0,animated:false});});return true;});return()=>handler.remove();},[page,session]);
 useEffect(()=>{setCompany('Empresa de tu sesión');setBranch('Sucursal de tu sesión');if(!session||!hasModulePermission(session.user.permissions,'organization'))return;const c=new AbortController();Promise.all([loadCompany(apiBaseUrl,session.token,session.user.companyId,c.signal),loadBranches(apiBaseUrl,session.token,session.user.companyId,1,'',c.signal)]).then(([row,branches])=>{if(!c.signal.aborted){setCompany(row.name);const current=branches.items.find(b=>b.id===session.user.branchId);if(current)setBranch(current.name);}}).catch(e=>{if(!c.signal.aborted&&e instanceof Error&&'status' in e&&e.status===401)expire();});return()=>c.abort();},[session,expire]);
 async function login(){if(loginLock.current)return;loginLock.current=true;setBusy(true);setError('');try{const value=await loginRequest(apiBaseUrl,email,password);setSession(value);setPassword('');setPage('dashboard');}catch(e){setError(e instanceof Error?e.message:'No se pudo iniciar sesión.');}finally{loginLock.current=false;setBusy(false);}}
 function logout(){Alert.alert('Cerrar sesión','Tendrás que iniciar sesión de nuevo para consultar tu empresa.',[{text:'Volver',style:'cancel'},{text:'Cerrar sesión',onPress:()=>navigation.navigate(()=>{setSession(null);setPage('dashboard');setMenu(false);setPassword('');setCompany('Empresa de tu sesión');})}]);}
 async function openWebsite(){if(!storefrontUrl){Alert.alert('Página web','Falta configurar la dirección del catálogo para este entorno.');return;}try{await Linking.openURL(storefrontUrl);}catch{Alert.alert('Página web','No se pudo abrir el navegador.');}}
 const panel={backgroundColor:t.surface,borderColor:t.line,borderWidth:1,borderRadius:14,padding:18,marginBottom:16};
 const heading={fontSize:23,fontWeight:'700' as const,lineHeight:30,color:t.text};
 const label={fontSize:13,color:t.muted,marginBottom:6};
 const action=(text:string,fn:()=>void,selected=false)=><Pressable onPress={fn} style={{paddingVertical:10,paddingHorizontal:14,borderWidth:1,borderColor:selected?t.link:t.line,backgroundColor:selected?t.soft:t.surface,borderRadius:9}}><Text style={{color:selected?t.link:t.text,fontWeight:'600'}}>{text}</Text></Pressable>;
 return <ExportIdentityContext.Provider value={{companyId:session?.user.companyId,branchId:session?.user.branchId,companyName:company,branchName:branch}}><KeyboardAvoidingView style={{flex:1,backgroundColor:t.background,paddingTop:NativeStatusBar.currentHeight??24}} behavior={Platform.OS==='ios'?'padding':undefined}>
  <StatusBar style={t.mode==='dark'?'light':'dark'}/>
  <View style={{flex:1}} importantForAccessibility={menu||settings?'no-hide-descendants':'auto'}>
   <View style={{flexDirection:'row',flexWrap:'nowrap',alignItems:'center',gap:12,paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderColor:t.line}}>
    {session?<Pressable accessibilityLabel="Abrir menú" onPress={()=>setMenu(true)} style={{width:44,alignItems:'center',borderWidth:1,borderColor:t.line}}><Text style={{fontSize:23}}>☰</Text></Pressable>:<View style={{width:42,height:42,borderRadius:12,backgroundColor:t.accent,alignItems:'center',justifyContent:'center'}}><Text style={{color:t.onAccent,fontSize:23,fontWeight:'800'}}>N</Text></View>}
    <View style={{flex:1,minWidth:0}}><Text numberOfLines={1} style={{fontSize:18,fontWeight:'700'}}>{session?group?.label??'Mi cuenta':'Núcleo ERP'}</Text><Text numberOfLines={1} style={{fontSize:11,color:t.muted}}>{session?company+' · '+branch:'Tu negocio, en orden'}</Text></View>
    <Pressable accessibilityLabel="Cambiar apariencia" onPress={()=>setSettings(true)} style={{width:44,alignItems:'center'}}><Text style={{fontSize:23}}>☼</Text></Pressable>
   </View>
   <ScrollView ref={scroll} contentContainerStyle={{padding:16,paddingBottom:32}} keyboardShouldPersistTaps="handled">
    {!session?<View style={{paddingTop:28}}><Text style={{...label,letterSpacing:1}}>ACCESO SEGURO</Text><Text style={{...heading,fontSize:30,lineHeight:38}}>Bienvenido de nuevo</Text><Text style={{color:t.muted,marginTop:8,marginBottom:24}}>Ventas, productos y equipo en un solo lugar. Ingresa con tu cuenta para continuar.</Text><View style={panel}>
     <Text style={label}>Correo electrónico</Text><TextInput accessibilityLabel="Correo electrónico" autoCapitalize="none" autoComplete="email" keyboardType="email-address" editable={!busy} value={email} onChangeText={setEmail} style={{marginBottom:16}}/>
     <Text style={label}>Contraseña</Text><TextInput accessibilityLabel="Contraseña" secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="current-password" editable={!busy} value={password} onChangeText={setPassword} onSubmitEditing={()=>{if(email&&password)void login();}}/>
     <Pressable accessibilityRole="checkbox" accessibilityState={{checked:showPassword}} onPress={()=>setShowPassword(v=>!v)}><Text style={{color:t.link}}>{showPassword?'☑':'☐'} Mostrar contraseña</Text></Pressable>
     {!!error&&<Text accessibilityRole="alert" style={{padding:12,color:t.danger,backgroundColor:t.dangerSurface,borderRadius:9,marginVertical:12}}>{error}</Text>}
     <Pressable disabled={busy||!email.trim()||!password} onPress={()=>void login()} style={{backgroundColor:t.accent,padding:12,alignItems:'center',marginTop:12}}><Text style={{color:t.onAccent,fontWeight:'700'}}>{busy?'Entrando…':'Entrar al ERP'}</Text></Pressable>
     <Text style={{...label,marginTop:16}}>Usa la cuenta que te proporcionó el administrador de tu empresa.</Text>
    </View></View>:<>
     {page==='dashboard'&&<><Text accessibilityRole="header" style={heading}>{info.label}</Text><Text style={{color:t.muted,marginTop:6,marginBottom:18}}>{info.description}</Text></>}
     {group&&group.pages.length>1&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingBottom:16}}>{group.pages.map(p=><View key={p}>{action(pageInfo[p].label,()=>navigate(p),page===p)}</View>)}</ScrollView>}
     {page==='dashboard'?<><View style={panel}><Text style={heading}>Hola, {session.user.name.split(' ')[0]}.</Text><Text style={{color:t.muted,marginTop:6}}>Todo lo que necesitas para llevar tu negocio, paso a paso.</Text></View><Text style={{fontWeight:'700',fontSize:18,marginBottom:12}}>¿Qué quieres hacer?</Text><View style={{gap:10,marginBottom:18}}>{groups.filter(g=>g.id!=='home').slice(0,4).map(g=><View key={g.id}>{action(g.label,()=>navigate(g.pages[0]))}</View>)}</View>{hasModulePermission(session.user.permissions,'dashboard')&&<DashboardPanel base={apiBaseUrl} token={session.token} accent={t.link} onExpired={expire}/>}<View style={panel}><Text style={{fontWeight:'700',fontSize:17,marginBottom:10}}>Áreas de trabajo</Text>{groups.filter(g=>g.id!=='home').map(g=><Pressable key={g.id} onPress={()=>navigate(g.pages[0])} style={{paddingVertical:12,borderBottomWidth:1,borderColor:t.line}}><Text style={{color:t.link,fontWeight:'600'}}>{g.label} ›</Text><Text style={{color:t.muted,fontSize:12}}>{pageInfo[g.pages[0]].description}</Text></Pressable>)}</View></>:page==='profile'?<ProfilePanel base={apiBaseUrl} session={session} accent={t.link} onExpired={expire}/>:<ModulePanel key={session.token+':'+page} page={page} session={session} accent={t.link} onExpired={expire} onHome={()=>navigate('dashboard')} onEdit={()=>scroll.current?.scrollTo({y:0,animated:true})}/>}
     {page!=='dashboard'&&<Disclosure title="Ayuda de esta sección"><Text style={{color:t.muted,fontSize:13}}>{info.description}{info.tip?' '+info.tip:''}</Text></Disclosure>}
    </>}
   </ScrollView>
   {session&&<View style={{flexDirection:'row',flexWrap:'nowrap',justifyContent:'space-around',borderTopWidth:1,borderColor:t.line,backgroundColor:t.surface,paddingTop:6,paddingBottom:16}}>{[['Inicio','⌂',()=>navigate('dashboard')],['Áreas','▦',()=>setMenu(true)],['Página web','↗',()=>void openWebsite()],['Mi cuenta','○',()=>navigate('profile')]].map(([name,icon,fn])=><Pressable key={String(name)} accessibilityLabel={String(name)} onPress={fn as ()=>void} style={{alignItems:'center',paddingHorizontal:8}}><Text style={{color:t.link,fontSize:22,lineHeight:26}}>{String(icon)}</Text><Text style={{fontSize:11}}>{String(name)}</Text></Pressable>)}</View>}
  </View>
  <Modal visible={menu&&!!session} animationType="slide" onRequestClose={()=>setMenu(false)}><View accessibilityViewIsModal style={{flex:1,backgroundColor:t.background,paddingTop:NativeStatusBar.currentHeight??24}}><View style={{padding:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={heading}>Tu espacio de trabajo</Text>{action('Cerrar',()=>setMenu(false))}</View><ScrollView contentContainerStyle={{padding:18,paddingTop:0}}><Text style={{fontWeight:'700'}}>{company}</Text><Text style={{...label,marginBottom:18}}>{session?.user.name}</Text><TextInput accessibilityLabel="Buscar una sección del sistema" placeholder="¿Qué necesitas hacer?" value={search} onChangeText={setSearch} style={{marginBottom:18}}/>{search.trim()?searchPages(session?.user.permissions??[],search).map(item=><Pressable key={item.page} onPress={()=>navigate(item.page)} style={{paddingVertical:13}}><Text style={{fontWeight:'700',color:t.link}}>{item.label}</Text><Text style={label}>{item.group}</Text></Pressable>):groups.map(g=><View key={g.id} style={{marginBottom:10}}>{action(g.label,()=>navigate(g.pages[0]),g.id===group?.id)}</View>)}{search.trim()&&!searchPages(session?.user.permissions??[],search).length&&<Text style={label}>No hay secciones para esta búsqueda.</Text>}<View style={{marginTop:20,gap:10}}>{action('Página web ↗',()=>void openWebsite())}{action('Apariencia',()=>{setMenu(false);setSettings(true);})}{action('Cerrar sesión',logout)}</View></ScrollView></View></Modal>
  <Modal visible={settings} animationType="slide" onRequestClose={()=>setSettings(false)}><View accessibilityViewIsModal style={{flex:1,backgroundColor:t.background,paddingTop:NativeStatusBar.currentHeight??24}}><ScrollView contentContainerStyle={{padding:20}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:20}}><Text style={heading}>Apariencia</Text>{action('Cerrar',()=>setSettings(false))}</View><Text style={{color:t.muted,marginBottom:20}}>Elige cómo se ve tu espacio de trabajo.</Text><View style={panel}><Text style={{fontWeight:'700',marginBottom:12}}>Tema</Text><View style={{flexDirection:'row',gap:10}}>{action('Claro',()=>setAppearance({...t,mode:'light'}),t.mode==='light')}{action('Oscuro',()=>setAppearance({...t,mode:'dark'}),t.mode==='dark')}</View></View><View style={panel}><Text style={{fontWeight:'700',marginBottom:12}}>Color de acento</Text><View style={{flexDirection:'row',gap:14}}>{accentOptions.map(c=><Pressable key={c} accessibilityLabel={'Seleccionar color '+c} accessibilityState={{selected:t.accent===c}} onPress={()=>setAppearance({...t,accent:c})} style={{width:44,height:44,borderRadius:22,backgroundColor:c,borderWidth:3,borderColor:t.accent===c?t.text:t.line}}/>)}</View><Text style={{color:t.muted,marginTop:16,marginBottom:6}}>Color personalizado (ejemplo: #14786b)</Text><TextInput accessibilityLabel="Color personalizado" autoCapitalize="characters" autoCorrect={false} maxLength={7} placeholder={t.accent} value={customColor} onChangeText={setCustomColor}/><Pressable disabled={!/^#[a-f\d]{6}$/i.test(customColor)} onPress={()=>{setAppearance({...t,accent:customColor});setCustomColor('');}}><Text style={{color:t.link}}>Aplicar color</Text></Pressable></View><View style={panel}><Text style={{fontWeight:'700',marginBottom:12}}>Tipografía</Text>{(['modern','rounded','mono'] as const).map((font,i)=><View key={font} style={{marginBottom:8}}>{action(['Moderna','Neutra','Técnica'][i],()=>setAppearance({...t,font}),t.font===font)}</View>)}</View><View style={panel}><Text style={{fontWeight:'700'}}>Vista previa del sistema</Text><Text style={{color:t.muted,marginTop:8}}>La operación de tu empresa, en un solo lugar.</Text></View><Text style={label}>Estas preferencias se guardan en este dispositivo.</Text></ScrollView></View></Modal>
 </KeyboardAvoidingView></ExportIdentityContext.Provider>;
}
function ModulePanel({page,session,accent,onExpired,onHome,onEdit}:{page:Page;session:Session;accent:string;onExpired:()=>void;onHome:()=>void;onEdit:()=>void}){
 const {user,token}=session,permissions=user.permissions;
 const p={base:apiBaseUrl,token,companyId:user.companyId,branchId:user.branchId,accent,onExpired};
 const can=(module:string,action:string)=>hasModulePermission(permissions,module,action);
 switch(page){
 case 'sales':case 'purchases':{const kind=page==='sales'?'sales':'purchase-orders';return <TransactionPanel {...p} kind={kind} canCreate={can(page,'crear')} canEdit={can(page,'editar')} canSettle={canSettleCommercial(permissions,kind)}/>;}
 case 'products':case 'customers':case 'suppliers':return <CatalogPanel {...p} kind={page} canCreate={can(page,'crear')} canEdit={can(page,'editar')} onClose={onHome} onEdit={onEdit}/>;
 case 'inventory':return <><InventoryPanel {...p} canCreate={can(page,'editar')}/><InventoryAlerts {...p} canConfigure={permissions.includes('configuracion.ver')} canEdit={permissions.includes('usuarios.editar')}/></>;
 case 'finance':return <FinancePanel {...p} canCreate={can(page,'editar')}/>;
 case 'reports':return <PeriodReportPanel {...p} permissions={permissions}/>;
 case 'notifications':return <NotificationsPanel {...p}/>;
 case 'employees':return <EmployeePanel {...p} canCreate={can(page,'crear')} canEdit={can(page,'editar')} canManageDepartments={can('departments','editar')}/>;
 case 'departments':return <DepartmentsPanel {...p} canEdit={can(page,'editar')}/>;
 case 'organization':return <OrganizationPanel {...p} canManage={can(page,'editar')}/>;
 case 'roles':return <RolesPanel {...p} permissions={permissions} canManage={can(page,'editar')}/>;
 case 'users':return <UsersPanel {...p} currentEmail={user.email} permissions={permissions} canEdit={can(page,'editar')} canCreate={can(page,'crear')}/>;
 case 'projects':return <ProjectsPanel {...p} canCreate={can(page,'crear')} canEdit={can(page,'editar')}/>;
 case 'production':return <ProductionPanel {...p} canManage={can(page,'editar')}/>;
 case 'invoices':return <InvoicesPanel {...p} canManage={can(page,'editar')}/>;
 case 'crm':return <OpportunitiesPanel {...p} canCreate={can(page,'crear')} canEdit={can(page,'editar')}/>;
 case 'shipments':return <ShipmentsPanel {...p} canCreate={can(page,'crear')} canEdit={can(page,'editar')}/>;
 case 'maintenance':return <MaintenancePanel {...p} canManage={can(page,'editar')}/>;
 case 'quality':return <QualityPanel {...p} canManage={can(page,'editar')}/>;
 case 'assets':return <AssetsPanel {...p} canManage={can(page,'editar')}/>;
 case 'tickets':return <><SupportStaffPanel {...p}/><TicketsPanel {...p} canManage={can(page,'editar')}/></>;
 case 'risks':return <RisksPanel {...p} canManage={can(page,'editar')}/>;
 case 'compliance':return <CompliancePanel {...p} canManage={can(page,'editar')}/>;
 case 'audit':return <AuditPanel {...p}/>;
 default:return null;
 }
}
