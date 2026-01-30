import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  // Protected routes with MainLayout
  route('/', 'routes/protected-layout.tsx', [
    index('routes/welcome.tsx'),
    route('/logout', 'routes/logout.tsx'),
    route('/test', 'routes/test.tsx'),
    route('/questionnaire', 'routes/questionnaire.tsx'),
    route('/research', 'routes/research.tsx'),
    route('/test-page/voting', 'routes/dev/test/voting.tsx'),

    route('/dev', 'routes/dev/layout.tsx', [
      index('routes/dev/home.tsx'),
      route('product-scanner', 'routes/dev/product-scanner.tsx'),
      route('color-scanner', 'routes/dev/color-scanner.tsx'),
      route('system-status', 'routes/dev/system-status.tsx'),
      route('clients-db', 'routes/dev/clients-db.tsx'),
      route('client-detail/:clientId', 'routes/dev/client-detail.tsx'),
      route('all-products', 'routes/dev/all-products.tsx'),
      route('device-monitoring', 'routes/dev/device-monitoring.tsx'),
      route('voting-dashboard', 'routes/dev/voting-dashboard.tsx'),
    ]),
  ]),

  // Public routes without protection
  route('/login', 'routes/login.tsx'),
  route('/results', 'routes/results.tsx'),
  route('/bundle/:productId', 'routes/bundle.tsx'),
  route('/public-voting', 'routes/voting-phone.tsx'),
] satisfies RouteConfig;
