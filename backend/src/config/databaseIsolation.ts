// This reads an intentionally unused collection; no documents are created or deleted.
export async function assertProductionDatabaseIsolation(probeDemoRead: () => Promise<unknown>): Promise<void> {
  try {
    await probeDemoRead();
  } catch (error) {
    const failure = error as { code?: number; message?: string } | null;
    if (failure?.code === 13 || failure?.code === 8000 &&
      /not authorized|not allowed|unauthorized/i.test(failure.message ?? '')) return;
    // A timeout or network failure does not prove that access is denied.
    throw new Error('No se pudo verificar el aislamiento de la base de producción.');
  }
  throw new Error('El usuario de producción tiene acceso a la base demo. Restringe sus permisos en Atlas.');
}
