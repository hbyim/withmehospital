import { Hono } from 'hono'
import { query, queryOne } from '../db'
import { mapService, type ServiceRow } from '../lib/models'

export const serviceRoutes = new Hono()

serviceRoutes.get('/', async (c) => {
  const category = c.req.query('category')
  const rows = category
    ? await query<ServiceRow>(
        'SELECT * FROM services WHERE active = TRUE AND category = $1 ORDER BY name',
        [category],
      )
    : await query<ServiceRow>(
        'SELECT * FROM services WHERE active = TRUE ORDER BY category, name',
      )
  return c.json({ services: rows.map(mapService) })
})

serviceRoutes.get('/:id', async (c) => {
  const row = await queryOne<ServiceRow>(
    'SELECT * FROM services WHERE id = $1 AND active = TRUE',
    [c.req.param('id')],
  )
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ service: mapService(row) })
})
