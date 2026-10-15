import * as FileSystem from 'expo-file-system';
import { createFinanceRetry, financeRetryScope } from '../../../shared/utils/financeRetry';
export { financeRetryScope };
function file(name: string) {
  if (!FileSystem.documentDirectory) throw new Error('No se pudo acceder al almacenamiento de operaciones pendientes.');
  return FileSystem.documentDirectory + name + '.txt';
}
export const financeRetry = createFinanceRetry({
  read: async name => {
    const path = file(name);
    return (await FileSystem.getInfoAsync(path)).exists ? FileSystem.readAsStringAsync(path) : null;
  },
  write: async (name, value) => { await FileSystem.writeAsStringAsync(file(name), value); },
  remove: async name => { await FileSystem.deleteAsync(file(name), { idempotent: true }); }
});
