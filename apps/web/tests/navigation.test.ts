import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navigationGroups, pageInfo, searchPages, visibleNavigation } from '../src/navigation';
import { accentForeground } from '../src/themeContrast';
import { transactionStatusLabel } from '../src/transactionLabels';
import { permissionLabel } from '../src/permissionLabels';
test('every ERP section belongs to one group, with a clear title and help', () => {
  const pages = navigationGroups.flatMap(group => group.pages);
  assert.equal(navigationGroups.length, 8);
  assert.equal(new Set(pages).size, pages.length);
  assert.deepEqual([...pages].sort(), Object.keys(pageInfo).sort());
  for (const page of pages) { assert.ok(pageInfo[page].label); assert.ok(pageInfo[page].tip); }
});
test('groups and search expose only permitted sections, matching accents and everyday terms', () => {
  assert.deepEqual(visibleNavigation(['usuarios.ver']).map(group => group.pages), [['users']]);
  assert.deepEqual(searchPages(['usuarios.ver'], 'venta'), []);
  assert.deepEqual(searchPages(['produccion.ver'], 'produccion').map(item => item.page), ['production']);
  assert.deepEqual(searchPages(['usuarios.ver'], 'accesos').map(item => item.page), ['users']);
  assert.deepEqual(searchPages(['rrhh.ver'], 'empleados').map(item => item.page), ['employees']);
  assert.deepEqual(searchPages(['usuarios.ver'], '   '), []);
  assert.deepEqual(visibleNavigation(['soporte.ver']).map(group=>({id:group.id,pages:group.pages})),[{id:'support',pages:['tickets']}]);
  assert.equal(searchPages(['soporte.ver'],'tickets')[0]?.group,'Solicitudes de ayuda');
  assert.ok(!visibleNavigation(['ventas.ver']).some(group=>group.id==='support'));
});
test('primary actions use a readable foreground for both pale and dark accent colors', () => {
  for (const color of ['#14786b', '#70e5ff', '#ffffff', '#000000', '#777777', '#ad435c', '#7755a6']) {
    const luminance = (hex: string) => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return c[0] * .2126 + c[1] * .7152 + c[2] * .0722; };
    const a = luminance(color), b = luminance(accentForeground(color));
    assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, color);
  }
});
test('friendly transaction labels preserve the meaning of the joint settlement', () => {
  assert.equal(transactionStatusLabel('sales', 'PAGADA'), 'Cobrada y entregada');
  assert.equal(transactionStatusLabel('purchase-orders', 'RECIBIDA'), 'Recibida y pagada');
  assert.equal(transactionStatusLabel('purchase-orders', 'PENDIENTE'), 'Pendiente de aprobación');
});
test('permissions are described plainly without altering or inventing unknown grants', () => {
  assert.equal(permissionLabel('usuarios.ver'), 'Accesos al sistema · Consultar');
  assert.equal(permissionLabel('ventas.liquidar'), 'Ventas · Cobrar y entregar');
  assert.equal(permissionLabel('compras.liquidar'), 'Compras · Recibir y pagar');
  assert.equal(permissionLabel('custom.unknown'), 'custom.unknown');
  assert.equal(permissionLabel('constructor.ver'), 'constructor.ver');
});
