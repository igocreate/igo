import { Outlet } from 'react-router';

export function AppLayout() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Outlet />
    </div>
  );
}
