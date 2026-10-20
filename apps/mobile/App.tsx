import {AppearancePanel} from './src/AppearancePanel';
import {Brand,IconButton,Tabs,BottomNavigation,NavigationDrawer,TaskTile} from './src/NativeChrome';
import {Icon,areaIcons,pageIcons,type IconName} from './src/Icon';
import {ActionButton,ModulePresentation} from './src/ModuleLayout';
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
 const {theme:t,setAppearance}=useNativeTheme(),navigation=useNativeNavigation();
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
 const action=(text:string,fn:()=>void,selected=false)=><ActionButton accessibilityState={{selected}} onPress={fn}>{text}</ActionButton>;
 const quickTasks=[{page:'sales',title:'Ventas y cobros',description:'Registra y da seguimiento.',icon:'shopping-bag'},{page:'products',title:'Tus productos',description:'Organiza el catálogo.',icon:'package'},{page:'inventory',title:'Existencias',description:'Consulta tus almacenes.',icon:'layers'},{page:'tickets',title:'Atención al cliente',description:'Responde solicitudes.',icon:'headphones'}].filter(task=>hasModulePermission(session?.user.permissions??[],task.page));
 return <ExportIdentityContext.Provider value={{companyId:session?.user.companyId,branchId:session?.user.branchId,companyName:company,branchName:branch}}><KeyboardAvoidingView style={{flex:1,backgroundColor:t.background,paddingTop:NativeStatusBar.currentHeight??24}} behavior={Platform.OS==='ios'?'padding':undefined}>
  <StatusBar style={t.mode==='dark'?'light':'dark'}/>
  <View style={{flex:1}} importantForAccessibility={menu||settings?'no-hide-descendants':'auto'}>
   <View style={{flexDirection:'row',flexWrap:'nowrap',alignItems:'center',gap:4,paddingHorizontal:12,paddingVertical:8,backgroundColor:t.surface,borderBottomWidth:1,borderColor:t.line}}>
    {session&&<IconButton icon="menu" label="Abrir menú de módulos" onPress={()=>setMenu(true)}/>}
    <View style={{flex:1,minWidth:0}}><Brand small/></View>
    {session&&<IconButton icon="globe" label="Abrir página web de la empresa" onPress={()=>void openWebsite()}/>}
    <IconButton icon="sliders" label="Cambiar apariencia" onPress={()=>setSettings(true)}/>
    {session&&<Pressable accessibilityLabel="Mi cuenta" onPress={()=>navigate('profile')} style={{width:36,height:36,minHeight:36,borderRadius:11,backgroundColor:t.accent,alignItems:'center'}}><Text style={{fontSize:13,fontWeight:'700',color:t.onAccent}}>{session.user.name.split(' ').slice(0,2).map(v=>v[0]).join('').toUpperCase()}</Text></Pressable>}
   </View>
   {session&&<View style={{backgroundColor:t.surface,paddingHorizontal:18,paddingVertical:9,flexDirection:'row',alignItems:'center',gap:7,borderBottomWidth:1,borderColor:t.line}}><Icon name="briefcase" size={12}/><Text numberOfLines={1} style={{fontSize:10,lineHeight:15,color:t.muted,flex:1}}>{company} · {branch}</Text></View>}
   {session&&group&&<Tabs group={group} page={page} onNavigate={navigate}/>}
   <ScrollView ref={scroll} contentContainerStyle={{padding:16,paddingBottom:28,maxWidth:1040,width:'100%',alignSelf:'center'}} keyboardShouldPersistTaps="handled">
    {!session?<View style={{maxWidth:440,width:'100%',alignSelf:'center',paddingTop:24}}><View style={{width:56,height:56,backgroundColor:t.accent,borderRadius:18,alignItems:'center',justifyContent:'center',marginBottom:20}}><Icon name="layers" size={30} color={t.onAccent}/></View><Text style={{fontSize:10,lineHeight:17,fontWeight:'700',letterSpacing:1.5,color:t.link}}>BIENVENIDO A TU ESPACIO</Text><Text style={{fontSize:30,lineHeight:38,fontWeight:'800',letterSpacing:-.8,marginTop:5}}>Todo tu negocio.{`\n`}Un solo lugar.</Text><Text style={{fontSize:13,lineHeight:21,color:t.muted,marginTop:12,marginBottom:24}}>Ingresa para organizar tus ventas, productos y equipo con Núcleo ERP.</Text><View style={panel}><Text style={{fontWeight:'700',fontSize:17,marginBottom:18}}>Iniciar sesión</Text><Text style={{fontSize:12,fontWeight:'600',marginBottom:7}}>Correo electrónico</Text><View style={{flexDirection:'row',alignItems:'center',backgroundColor:t.soft,borderWidth:1,borderColor:t.line,borderRadius:9,paddingLeft:12,marginBottom:17}}><Icon name="mail" size={17}/><TextInput accessibilityLabel="Correo electrónico" autoCapitalize="none" autoComplete="email" keyboardType="email-address" editable={!busy} placeholder="tu@empresa.com" value={email} onChangeText={setEmail} style={{flex:1,borderWidth:0,backgroundColor:'transparent',fontSize:14}}/></View><Text style={{fontSize:12,fontWeight:'600',marginBottom:7}}>Contraseña</Text><View style={{flexDirection:'row',flexWrap:'nowrap',alignItems:'center',backgroundColor:t.soft,borderWidth:1,borderColor:t.line,borderRadius:9,paddingLeft:12}}><Icon name="lock" size={17}/><TextInput accessibilityLabel="Contraseña" secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="current-password" editable={!busy} placeholder="Tu contraseña" value={password} onChangeText={setPassword} onSubmitEditing={()=>{if(email&&password)void login();}} style={{flex:1,borderWidth:0,backgroundColor:'transparent',fontSize:14}}/><IconButton icon={showPassword?'eye-off':'eye'} label={showPassword?'Ocultar contraseña':'Mostrar contraseña'} onPress={()=>setShowPassword(v=>!v)}/></View>{!!error&&<Text accessibilityRole="alert" style={{padding:12,fontSize:12,color:t.danger,backgroundColor:t.dangerSurface,borderRadius:9,marginVertical:12}}>{error}</Text>}<ActionButton variant="primary" icon="log-in" disabled={busy||!email.trim()||!password} onPress={()=>void login()} style={{marginTop:20,justifyContent:'center',minHeight:48}}>{busy?'Entrando…':'Entrar a mi espacio'}</ActionButton><View style={{flexDirection:'row',gap:6,alignItems:'center',marginTop:16}}><Icon name="shield" size={13}/><Text style={{fontSize:10,lineHeight:16,color:t.muted,flex:1}}>Accede con la cuenta de tu empresa. Tus permisos se aplican en cada operación.</Text></View></View><Text style={{fontSize:10,color:t.muted,textAlign:'center',marginTop:6}}>Núcleo ERP · Tu negocio, en orden</Text></View>:<>
     {page==='dashboard'?<><View style={{...panel,borderLeftWidth:3,borderLeftColor:t.accent,padding:18}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><Text style={{fontSize:9,fontWeight:'700',color:t.link,letterSpacing:1.2}}>TU ESPACIO DE TRABAJO</Text><Icon name="sun" size={18} color={t.link}/></View><Text style={{fontSize:24,lineHeight:32,fontWeight:'800',letterSpacing:-.7}}>Hola, {session.user.name.split(' ')[0]}.</Text><Text style={{fontSize:12,color:t.muted,marginTop:5}}>Así va tu operación. ¿Por dónde empezamos?</Text></View><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><Text style={{fontSize:16,fontWeight:'700'}}>Accesos rápidos</Text><Text style={{fontSize:10,color:t.muted}}>TU DÍA A DÍA</Text></View><View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:22}}>{quickTasks.map(task=><TaskTile key={task.page} title={task.title} description={task.description} icon={task.icon as IconName} onPress={()=>navigate(task.page as Page)}/>)}</View>{hasModulePermission(session.user.permissions,'dashboard')&&<DashboardPanel onNavigate={navigate} base={apiBaseUrl} token={session.token} accent={t.link} onExpired={expire}/>}<View style={panel}><View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:10}}><Icon name="compass" size={18} color={t.link}/><Text style={{fontWeight:'700',fontSize:15}}>Explora tu empresa</Text></View>{groups.filter(g=>g.id!=='home').map(g=><Pressable key={g.id} onPress={()=>navigate(g.pages[0])} style={{flexDirection:'row',alignItems:'center',flexWrap:'nowrap',gap:11,paddingVertical:11,borderBottomWidth:1,borderColor:t.line}}><Icon name={areaIcons[g.id]??'folder'} size={18}/><Text style={{fontSize:12,fontWeight:'600',flex:1}}>{g.label}</Text><Icon name="chevron-right" size={15}/></Pressable>)}</View></>:<ModulePresentation.Provider value={{icon:pageIcons[page]??'file-text',hideHeading:true}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16}}><View style={{flex:1}}><Text style={{fontSize:9,color:t.muted,letterSpacing:1,fontWeight:'600'}}>{group?.label.toUpperCase()??'TU CUENTA'}</Text><Text accessibilityRole="header" style={{fontSize:23,lineHeight:31,fontWeight:'800',letterSpacing:-.6,marginTop:3}}>{info.label}</Text></View><IconButton icon="help-circle" label="Ayuda de esta sección" onPress={()=>Alert.alert(info.label,info.description+' '+info.tip)}/></View>{page==='profile'?<ProfilePanel base={apiBaseUrl} session={session} accent={t.link} onExpired={expire}/>:<ModulePanel key={session.token+':'+page} page={page} session={session} accent={t.link} onExpired={expire} onHome={()=>navigate('dashboard')} onEdit={()=>scroll.current?.scrollTo({y:0,animated:true})}/>}</ModulePresentation.Provider>}
    </>}
   </ScrollView>
   {session&&<BottomNavigation page={page} permissions={session.user.permissions} onNavigate={navigate} onMenu={()=>setMenu(true)}/>}
  </View>
  {session&&<NavigationDrawer visible={menu} onClose={()=>setMenu(false)} groups={groups} page={page} permissions={session.user.permissions} onNavigate={navigate} company={company} branch={branch} user={session.user.name} onWebsite={()=>void openWebsite()} onAppearance={()=>{setMenu(false);setSettings(true);}} onLogout={logout}/>}
  <AppearancePanel visible={settings} onClose={()=>setSettings(false)}/>
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
