"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./ui";

/**
 * Submit button for server-action forms. It disables itself while the form is
 * submitting, so repeated clicks or Enter presses can't create duplicate records.
 */
export function SubmitButton({ children, pendingLabel }: { children: ReactNode; pendingLabel: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending} data-testid="submit">
      {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
