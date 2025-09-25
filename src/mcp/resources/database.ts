export async function getSupportedRoutes(): Promise<string[]> {
  return [
    'KUL-SIN', 'KUL-BKI', 'KUL-MYY', 'SIN-BKI',
    'BKI-TWU', 'KUL-LBU', 'SIN-MYY',
  ];
}

export async function checkRouteSupported(origin: string, destination: string): Promise<boolean> {
  const routes = await getSupportedRoutes();
  return routes.includes(`${origin}-${destination}`) || routes.includes(`${destination}-${origin}`);
}

export async function getSuggestedAlternatives(
  origin: string,
  destination: string,
): Promise<string[]> {
  const allRoutes = await getSupportedRoutes();
  return allRoutes.filter((route) =>
    route.startsWith(origin) || route.endsWith(destination) ||
    route.startsWith(destination) || route.endsWith(origin),
  );
}
