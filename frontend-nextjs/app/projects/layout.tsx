import { ReactNode } from 'react';
import { ProtectedRoute } from '@/lib/protected-route';

export default function ProjectsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
