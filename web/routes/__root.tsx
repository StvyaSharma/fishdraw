import { createRootRoute, Outlet } from '@tanstack/react-router';
import { DialRoot } from 'dialkit';
import 'dialkit/styles.css';
import '../styles.css';

export const Route = createRootRoute({
  component: () => <>
    <Outlet />
    <DialRoot productionEnabled versions="menu" />
  </>,
});
