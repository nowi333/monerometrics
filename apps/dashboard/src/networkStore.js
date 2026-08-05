import { createContext, useContext } from 'react'

export const NetworkContext = createContext({ info: null, status: 'loading', lastUpdated: null })

export function useNetworkInfo() {
  return useContext(NetworkContext)
}
