import { MapPin, Plus, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { dbActions, useDemoQuery, useSession, type Address } from '@/data'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { AddressCard } from '@/components/commerce/address-card'
import { useConfirm } from '@/components/ui/use-confirm'
import { pluralWithCount } from '@/lib/format'
import { AddressForm } from '../components/checkout/address-form'

/** Where parcels go: add, edit, remove and pick the default. */
export default function AddressesPage() {
  const customerId = useSession((state) => state.customerId)
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Address | null>(null)
  const [adding, setAdding] = useState(false)

  const query = useDemoQuery((view) => view.customerById.get(customerId), [customerId])
  const customer = query.data
  // `?demo=empty` forces the empty state even when addresses are saved.
  const addresses = query.status === 'empty' ? [] : (customer?.addresses ?? [])
  const open = adding || Boolean(editing)

  const closeSheet = () => {
    setAdding(false)
    setEditing(null)
  }

  const onSaved = (address: Address, makeDefault: boolean) => {
    const result = dbActions.saveAddress(customerId, address, makeDefault)
    if (!result.ok) {
      toast.error('We couldn’t save that address', { description: result.error })
      return
    }
    const wasEditing = Boolean(editing)
    closeSheet()
    toast.success(wasEditing ? 'Address updated' : 'Address saved', {
      description: `${address.line1}, ${address.city} ${address.pin}`,
    })
  }

  const onRemove = async (address: Address) => {
    const ok = await confirm({
      title: 'Remove this address?',
      description: `${address.line1}, ${address.city} ${address.pin} will no longer appear at checkout.`,
      confirmLabel: 'Remove address',
      tone: 'danger',
    })
    if (!ok) return
    const result = dbActions.removeAddress(customerId, address.id)
    if (!result.ok) {
      toast.error('We couldn’t remove that address', { description: result.error })
      return
    }
    toast.success('Address removed')
  }

  return (
    <>
      <PageHeader
        title="Addresses"
        breadcrumbs={[{ label: 'My account', to: '/account' }, { label: 'Addresses' }]}
        description="These are the addresses checkout offers you. The default is selected for you."
        meta={query.status === 'success' ? <span>{pluralWithCount(addresses.length, 'address', 'addresses')}</span> : null}
        actions={
          <Button leftIcon={<Plus aria-hidden />} onClick={() => setAdding(true)}>
            Add address
          </Button>
        }
      />

      {query.status === 'error' ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<TriangleAlert aria-hidden />}
            title="We couldn’t load your addresses"
            description="Something went wrong on our side. Try again in a moment."
            action={<Button onClick={query.retry}>Retry</Button>}
          />
        </div>
      ) : query.status === 'loading' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<MapPin aria-hidden />}
            title="No addresses saved"
            description="Add one now and checkout will be a single tap next time."
            action={<Button onClick={() => setAdding(true)}>Add your first address</Button>}
          />
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="flex">
              <AddressCard
                address={address}
                isDefault={address.id === customer?.defaultAddressId}
                className="w-full"
                actions={
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(address)}>
                      Edit
                    </Button>
                    {address.id === customer?.defaultAddressId ? null : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          dbActions.setDefaultAddress(customerId, address.id)
                          toast.success('Default address updated', { description: `${address.city} ${address.pin}` })
                        }}
                      >
                        Set as default
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-danger-subtle-fg" onClick={() => void onRemove(address)}>
                      Remove
                    </Button>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open} onOpenChange={(next) => !next && closeSheet()}>
        <SheetContent
          side="right"
          title={editing ? 'Edit address' : 'Add a new address'}
          description="The PIN code fills in the city and the state for you."
        >
          {open ? (
            <AddressForm
              address={editing ?? undefined}
              suggest={{ name: customer?.name, phone: customer?.phone }}
              submitLabel={editing ? 'Save changes' : 'Save address'}
              defaultChecked={addresses.length === 0}
              onSubmit={onSaved}
              onCancel={closeSheet}
              stickyActions
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
