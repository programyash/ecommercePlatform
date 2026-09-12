import { createBrowserRouter, createHashRouter } from 'react-router'
import { routes } from './routes'

// Static builds (`npm run build:static`) use hash URLs so they work on any host without rewrites.
const createRouter = import.meta.env.VITE_HASH_ROUTER === '1' ? createHashRouter : createBrowserRouter

export const router = createRouter(routes)
