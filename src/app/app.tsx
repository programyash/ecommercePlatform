import { Tooltip } from 'radix-ui'
import { RouterProvider } from 'react-router/dom'
import { router } from './router'

export function App() {
  return (
    <Tooltip.Provider delayDuration={300} skipDelayDuration={150}>
      <RouterProvider router={router} />
    </Tooltip.Provider>
  )
}
