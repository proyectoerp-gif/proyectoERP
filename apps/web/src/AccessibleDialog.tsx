import { useEffect, useRef, type ReactNode } from 'react';
import {useAdminPresentation} from './AdminUi';
export function AccessibleDialog({ titleId, onClose, children }: { titleId: string; onClose: () => void; children: ReactNode }) {
  const admin=useAdminPresentation();
  const ref = useRef<HTMLElement>(null), close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const background=admin?document.querySelector<HTMLElement>('.dashboard-layout'):null;
    const previousInert=background?.inert;
    if(background)background.inert=true;
    const dialog = ref.current;
    const getFocusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0);
    (getFocusable()[0] ?? dialog)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const elements = getFocusable(), first = elements[0], last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); dialog?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; document.addEventListener('keydown', onKey);
    return () => {
      if(background)background.inert=previousInert??false;
      document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', onKey);
      if (previous?.isConnected && previous.getClientRects().length > 0 && getComputedStyle(previous).visibility !== 'hidden') previous.focus();
      else document.querySelector<HTMLElement>('.topbar .icon-button:not(.mobile-menu), .auth-controls .icon-button')?.focus();
    };
  }, []);
  return <><button className="drawer-backdrop" tabIndex={-1} aria-label="Cerrar ajustes" onClick={onClose}/><aside ref={ref} className="theme-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>{children}</aside></>;
}
