import React,{useEffect,useState} from 'react';
import {GarmentArt} from './GarmentArt';
import type {PublicProduct} from './publicCatalogApi';

export function ProductArt({product,base,eager=false}:{product:PublicProduct;base:string;eager?:boolean}){
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>setLoaded(false),[product.id,product.imageVersion]);
  return <div className="store-product-art fashion-product-art">
    {product.imageVersion&&<img className={'store-product-photo'+(loaded?' is-loaded':'')} src={base+'/demo-support/catalog/'+product.id+'/image?v='+encodeURIComponent(product.imageVersion)} alt={product.name} loading={eager?'eager':'lazy'} decoding="async" onLoad={()=>setLoaded(true)} onError={()=>setLoaded(false)}/>}
    <div style={loaded?{visibility:'hidden',width:'100%'}:{width:'100%'}}><GarmentArt kind={product.apparel?.garment??'tee'} color={product.apparel?.colorHex}/></div>
    {!loaded&&<small>Ilustración</small>}
  </div>;
}
