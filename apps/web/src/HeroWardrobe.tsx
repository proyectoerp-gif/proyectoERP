import React,{useEffect,useState} from 'react';
import {loadPublicCatalog,type PublicProduct} from './publicCatalogApi';
import {ProductArt} from './ProductArt';

export function HeroWardrobe({base}:{base:string}){
  const [products,setProducts]=useState<PublicProduct[]>([]);
  useEffect(()=>{
    let disposed=false,busy=false,lastAttempt=0;
    let controller:AbortController|undefined;
    const refresh=async()=>{
      if(disposed||busy||document.visibilityState==='hidden'||Date.now()-lastAttempt<15000)return;
      busy=true;lastAttempt=Date.now();controller=new AbortController();
      const timeout=window.setTimeout(()=>controller?.abort(),10000);
      try{
        const page=await loadPublicCatalog(base,'','',controller.signal,{sort:'recent'});
        if(!disposed)setProducts(page.items.slice(0,5));
      }catch{/* Keep the last confirmed selection during a temporary connection failure. */}
      finally{window.clearTimeout(timeout);busy=false;}
    };
    void refresh();
    const interval=window.setInterval(()=>void refresh(),60000);
    const resume=()=>void refresh();
    document.addEventListener('visibilitychange',resume);
    window.addEventListener('focus',resume);
    return()=>{disposed=true;controller?.abort();window.clearInterval(interval);document.removeEventListener('visibilitychange',resume);window.removeEventListener('focus',resume);};
  },[base]);
  return <div className="up-runway" aria-hidden="true">
    <div className="up-runway-glow"/>
    {products.map((product,index)=><div className={'up-runway-look up-runway-product'+(products.length===1?' up-runway-single':'')} key={product.id+':'+(product.imageVersion??'illustration')} data-product-id={product.id} style={{animationDuration:products.length*3.5+'s',animationDelay:-(products.length-index-1)*3.5+'s'}}>
      <span>{product.name}</span><ProductArt product={product} base={base} eager/>
    </div>)}
    <div className="up-runway-orbit up-runway-orbit-one"/><div className="up-runway-orbit up-runway-orbit-two"/>
    {!!products.length&&<p>NOVEDADES DEL CATÁLOGO · UP!</p>}
  </div>;
}
