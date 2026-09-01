// Horodatage du dernier rafraichissement reussi, toutes sources confondues.
// Chaque panneau y ecrit via usePolledData ; le bandeau de bas de page le lit.
let last = null
const subscribers = new Set()

export function markRefreshed(at = Date.now()) {
  last = at
  for (const fn of subscribers) fn(at)
}

export function subscribeRefresh(fn) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

export function getLastRefresh() {
  return last
}
