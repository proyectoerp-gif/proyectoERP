import React, { useEffect, useState } from 'react';

export function useDeploymentEnvironment(apiUrl:string) {
  const [environment, setEnvironment] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    const healthUrl = apiUrl.replace(/\/api\/v1\/?$/, '') + '/health/version';
    fetch(healthUrl, { signal: controller.signal, cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if(!controller.signal.aborted)setEnvironment(data?.environment); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [apiUrl]);
  return environment;
}
export function EnvironmentNotice({environment}:{environment:string|undefined}){
  if(!environment||environment==='production')return null;
  return <span className="environment-badge" role="status" title="Entorno de pruebas: usa únicamente datos ficticios.">{environment==='demo'?'Demo':'Pruebas'}</span>;
}
