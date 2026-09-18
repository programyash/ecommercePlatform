import type { Shipment } from '@/data'
import { OrderTimeline } from '@/components/commerce/order-timeline'
import { useIsDesktop } from '@/lib/use-media-query'
import { SHIPMENT_PROGRESS, statusMeta } from '@/lib/status'

/**
 * One parcel's journey: a horizontal tracker where there is room, a vertical log on
 * phones. Steps still to come are shown greyed so the shopper knows what is left.
 */
export function ShipmentTracker({ shipment }: { shipment: Shipment }) {
  const isDesktop = useIsDesktop()
  const reached = SHIPMENT_PROGRESS.indexOf(shipment.status)

  const upcoming =
    shipment.status === 'cancelled' || reached < 0
      ? []
      : SHIPMENT_PROGRESS.slice(reached + 1).map((status) => ({
          code: status,
          label: statusMeta('shipment', status).label,
        }))

  return (
    <OrderTimeline
      events={shipment.events}
      upcoming={upcoming}
      orientation={isDesktop ? 'horizontal' : 'vertical'}
    />
  )
}
