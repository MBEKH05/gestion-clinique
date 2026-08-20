export function getHomeRoute(space, role) {
  if (space === 'laboratoire') {
    if (role === 'medecin') return '/lab/medecin';
    if (role === 'secretaire') return '/lab/secretaire';
    if (role === 'technicien') return '/lab/technicien';
    return '/lab/admin';
  }
  if (space === 'administration') {
    return '/admin';
  }
  return '/dashboard';
}
