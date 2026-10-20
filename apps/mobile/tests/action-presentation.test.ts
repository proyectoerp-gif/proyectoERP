import assert from 'node:assert/strict';
import test from 'node:test';
import {actionPresentation} from '../src/actionPresentation';

test('business cancellation and deletion are visually destructive',()=>{
 for(const label of ['Eliminar del catálogo','Retirar almacén','Desactivar rol','Cancelar registro','Cancelar venta'])assert.equal(actionPresentation(label).variant,'danger',label);
});
test('leaving an editor does not look like deleting its record',()=>{
 for(const label of ['Cancelar','Cancelar edición','Cerrar y actualizar','Volver al listado'])assert.equal(actionPresentation(label).variant,'secondary',label);
});
test('save, creation and settlement actions receive primary emphasis',()=>{
 for(const label of ['Nuevo activo','Nueva venta','Guardar cambios','Revisar y registrar','Cobrar y entregar','Recibir y pagar','Aprobar compra'])assert.equal(actionPresentation(label).variant,'primary',label);
});
test('exports, paging and recovery retain secondary emphasis and meaningful icons',()=>{
 assert.deepEqual(actionPresentation('Exportar Excel'),{variant:'secondary',icon:'download'});
 assert.equal(actionPresentation('Anterior').icon,'chevron-left');
 assert.equal(actionPresentation('Siguiente').icon,'chevron-right');
 assert.equal(actionPresentation('Restaurar').icon,'rotate-ccw');
 assert.equal(actionPresentation('Actualizar').icon,'refresh-cw');
 assert.equal(actionPresentation('Reintentar el mismo ajuste').variant,'secondary');
});
