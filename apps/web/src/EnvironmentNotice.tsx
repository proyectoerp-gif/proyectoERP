import React, { useEffect, useState } from 'react';

export function EnvironmentNotice({ apiUrl }: { apiUrl: string }) {
  const [environment, setEnvironment] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    const healthUrl = apiUrl.replace(/\/api\/v1\/?$/, '') + '/health/version';
    fetch(healthUrl, { signal: controller.signal, cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => setEnvironment(data?.environment))
      .catch(() => undefined);
    return () => controller.abort();
  }, [apiUrl]);
  if (!environment || environment === 'production') return null;
  return <div role="status" style={{ padding: '10px 16px', background: '#fff3cd', color: '#493800', textAlign: 'center', fontFamily: 'system-ui', fontSize: 14 }}>
    Entorno de pruebas · Usa únicamente datos ficticios. {environment==='demo'&&<a href="/demo-atencion" style={{color:'inherit',fontWeight:700}}>Probar atención al cliente</a>}
  </div>;
}
