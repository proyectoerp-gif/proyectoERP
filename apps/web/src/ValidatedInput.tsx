import {useId,useState,type InputHTMLAttributes} from 'react';

/** Keeps native constraints and exposes their result beside the field in Spanish. */
export function ValidatedInput(props:InputHTMLAttributes<HTMLInputElement>) {
  const generated=useId(),id=props.id??generated,[message,setMessage]=useState(''),[touched,setTouched]=useState(false);
  const describe=(input:HTMLInputElement)=>{
    const v=input.validity;
    const value=props.type==='password'?input.value:input.value.trim();
    if(props.required&&!value)return 'Completa este campo obligatorio.';
    if(value&&props.minLength!==undefined&&value.length<props.minLength)return `Escribe al menos ${props.minLength} caracteres.`;
    if(props.maxLength!==undefined&&value.length>props.maxLength)return `Usa como máximo ${props.maxLength} caracteres.`;
    if(v.valid)return '';
    if(v.valueMissing)return 'Completa este campo obligatorio.';
    if(v.typeMismatch)return props.type==='email'?'Escribe un correo válido, por ejemplo nombre@ejemplo.com.':'Revisa el formato de este campo.';
    if(v.tooShort)return `Escribe al menos ${input.minLength} caracteres.`;
    if(v.tooLong)return `Usa como máximo ${input.maxLength} caracteres.`;
    if(v.rangeUnderflow)return `El valor mínimo es ${input.min}.`;
    if(v.rangeOverflow)return `El valor máximo es ${input.max}.`;
    if(v.stepMismatch)return 'Revisa los decimales permitidos para este importe o cantidad.';
    return 'Revisa el valor y el formato de este campo.';
  };
  return <><input {...props} id={id} aria-invalid={message?true:props['aria-invalid']} aria-describedby={[props['aria-describedby'],message?id+'-validation':null].filter(Boolean).join(' ')||undefined}
    onBlur={event=>{setTouched(true);setMessage(describe(event.currentTarget));props.onBlur?.(event);}}
    onChange={event=>{if(touched)setMessage(describe(event.currentTarget));props.onChange?.(event);}}
    onInvalid={event=>{event.preventDefault();const input=event.currentTarget;setTouched(true);setMessage(describe(input));if(input.form?.querySelector('input:invalid,select:invalid,textarea:invalid')===input)requestAnimationFrame(()=>input.focus());props.onInvalid?.(event);}}/>
    {message&&<small id={id+'-validation'} className="field-error" aria-live="polite">{message}</small>}
  </>;
}
