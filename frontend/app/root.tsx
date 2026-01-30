import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Outlet,
  Meta,
  Links,
  ScrollRestoration,
  Scripts,
  isRouteErrorResponse,
  useLocation,
} from 'react-router';

import { MainLayout } from './components/layouts/main-layout';
import { ClarityContextProvider } from './context/clarity';
import { ConfigProvider } from './context/config-context';
import { MonitoringProvider } from './context/monitoring';
import { SnackbarProvider } from './context/snackbar-context';
import LoadingScreen from './features/loading-screen/loading-screen';
import { AuthProvider } from './firebase/auth-provider';
import theme from './styles/theme';

import type { Route } from '.react-router/types/app/+types/root';

import './styles/app.css';
import './i18n';

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen relative">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return <LoadingScreen />;
}

export default function App() {
  const queryClient = new QueryClient();
  const location = useLocation();

  // Check if current route is a dev page
  const isDevPage = location.pathname.startsWith('/dev');

  return (
    <SnackbarProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ConfigProvider>
              {isDevPage ? (
                // Dev pages without MainLayout
                <Outlet />
              ) : (
                // Regular pages with MainLayout
                <ClarityContextProvider>
                  <MonitoringProvider>
                    <MainLayout>
                      <Outlet />
                    </MainLayout>
                  </MonitoringProvider>
                </ClarityContextProvider>
              )}
            </ConfigProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SnackbarProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
