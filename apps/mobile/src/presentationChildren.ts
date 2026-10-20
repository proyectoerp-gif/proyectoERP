import {Children,Fragment,cloneElement,isValidElement,type ReactNode} from 'react';
/** Preserve the fragment ancestry when lifting its children into a record row. */
export function keyedRecordChildren(children:ReactNode,prefix='record'):ReactNode[]{
 return Children.toArray(children).flatMap((child,index)=>{
  const key=prefix+'/'+(isValidElement(child)?child.key??index:index);
  if(isValidElement<{children?:ReactNode}>(child)&&child.type===Fragment)return keyedRecordChildren(child.props.children,key);
  return [isValidElement(child)?cloneElement(child,{key}):child];
 });
}
