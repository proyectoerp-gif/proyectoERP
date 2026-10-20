import Feather from '@expo/vector-icons/Feather';
import type {ComponentProps} from 'react';
import {useNativeTheme} from './NativeTheme';
export type IconName=ComponentProps<typeof Feather>['name'];
export function Icon({name,size=20,color}:{name:IconName;size?:number;color?:string}){const {theme:t}=useNativeTheme();return <Feather name={name} size={size} color={color??t.muted} accessible={false} allowFontScaling={false}/>;}
export const areaIcons:Record<string,IconName>={home:'grid',sales:'shopping-bag',purchases:'shopping-cart',inventory:'box',finance:'credit-card',team:'users',operations:'briefcase',support:'headphones',notifications:'bell'};
export const pageIcons:Record<string,IconName>={dashboard:'grid',sales:'shopping-bag',customers:'users',crm:'trending-up',invoices:'file-text',purchases:'shopping-cart',suppliers:'truck',products:'package',inventory:'layers',finance:'credit-card',reports:'bar-chart-2',employees:'user-check',departments:'git-merge',organization:'home',users:'user',roles:'shield',projects:'briefcase',production:'tool',shipments:'truck',maintenance:'settings',assets:'monitor',quality:'check-circle',tickets:'headphones',risks:'alert-triangle',compliance:'clipboard',audit:'activity',notifications:'bell',profile:'user'};
