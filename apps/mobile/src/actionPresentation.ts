export type ActionVariant='primary'|'secondary'|'danger';
export function actionPresentation(label:string):{variant:ActionVariant;icon:'plus'|'save'|'trash-2'|'x-circle'|'check'|'refresh-cw'|'chevron-left'|'chevron-right'|'download'|'edit-2'|'search'|'arrow-left'|'rotate-ccw'|'credit-card'|'log-out'|'arrow-right'}{
 const text=label.trim().toLocaleLowerCase('es');
 if(/^(eliminar|retirar|desactivar|anular)\b/.test(text)||/^cancelar (registro|venta|compra|pedido|documento|operación)\b/.test(text))return {variant:'danger',icon:text.startsWith('eliminar')||text.startsWith('retirar')?'trash-2':'x-circle'};
 if(/^(cancelar|cerrar|volver|salir)\b/.test(text))return {variant:'secondary',icon:text.startsWith('salir')?'log-out':'arrow-left'};
 if(/^anterior\b/.test(text))return {variant:'secondary',icon:'chevron-left'};
 if(/^siguiente\b/.test(text))return {variant:'secondary',icon:'chevron-right'};
 if(/^(exportar|descargar)\b/.test(text))return {variant:'secondary',icon:'download'};
 if(/^editar\b/.test(text))return {variant:'secondary',icon:'edit-2'};
 if(/^(restaurar|reactivar)\b/.test(text))return {variant:'secondary',icon:'rotate-ccw'};
 if(/^(buscar|consultar)\b/.test(text))return {variant:'secondary',icon:'search'};
 if(/^(actualizar|reintentar)\b/.test(text))return {variant:'secondary',icon:'refresh-cw'};
 if(/^(nuevo|nueva|crear)\b/.test(text))return {variant:'primary',icon:'plus'};
 if(/^guardar\b/.test(text))return {variant:'primary',icon:'save'};
 if(/^(cobrar|recibir|pagar)\b/.test(text))return {variant:'primary',icon:'credit-card'};
 if(/^(revisar|registrar|aprobar|confirmar)\b/.test(text))return {variant:'primary',icon:'check'};
 return {variant:'secondary',icon:'arrow-right'};
}
