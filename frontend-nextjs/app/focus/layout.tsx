'use client';

import { ProtectedRoute } from '@/lib/protected-route';

export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
