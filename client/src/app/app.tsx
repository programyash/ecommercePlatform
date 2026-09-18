import { Tooltip } from 'radix-ui'
import { RouterProvider } from 'react-router/dom'
import { router } from './router'
import { SocketProvider } from '../lib/socket-provider'

export function App() {
  return (
    <Tooltip.Provider delayDuration={300} skipDelayDuration={150}>
      <SocketProvider>
        <RouterProvider router={router} />
      </SocketProvider>
    </Tooltip.Provider>
  )
}
