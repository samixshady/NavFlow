import { ReactNode } from 'react';
import { ProtectedRoute } from '@/lib/protected-route';

export default function OrganizationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
