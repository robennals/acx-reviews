'use client';

import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useFootnotes } from './footnote-context';

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [breakpoint]);
  return isMobile;
}

export function FootnoteSheet() {
  const { footnotes, openId, close } = useFootnotes();
  const isMobile = useIsMobile();
  const current = openId ? footnotes.find((f) => f.id === openId) : null;
  const isOpen = Boolean(current);

  if (isMobile) {
    return (
      <Drawer.Root open={isOpen} onOpenChange={(o) => !o && close()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-auto max-h-[85vh] flex-col rounded-t-xl bg-background border-t border-border focus:outline-none">
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            <div className="flex-1 overflow-y-auto p-6">
              <Drawer.Title className="text-lg font-semibold mb-3">
                Footnote [{openId}]
              </Drawer.Title>
              {current && (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: current.html }}
                />
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogTitle className="mb-3">Footnote [{openId}]</DialogTitle>
        {current && (
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: current.html }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
