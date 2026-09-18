import { MapPinOff, Plus, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { dbActions, DEMO, useCart, useSession, type Address } from '@/data'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { AddressCard } from '@/components/commerce/address-card'
import { formatDayShort } from '@/lib/format'
import { OtpSignIn } from '../components/account/otp-sign-in'
import { AddressForm } from '../components/checkout/address-form'
import { CheckoutColumns, StepHeading, StepPanel } from '../components/checkout/checkout-step'
import { EmptyBag } from '../components/checkout/empty-bag'
import { PriceColumn } from '../components/checkout/price-column'
import { useCheckout } from '../components/checkout/use-checkout'

/** Step 1 of checkout: who the parcel goes to, and where. */
export default function CheckoutAddressPage() {
  const checkout = useCheckout()
  const navigate = useNavigate()
  const setCheckout = useCart((state) => state.setCheckout)
  const customerId = useSession((state) => state.customerId)
  const signedIn = useSession((state) => state.customerSignedIn)
  const signInCustomer = useSession((state) => state.signInCustomer)

  const [editing, setEditing] = useState<Address | null>(null)
  const [adding, setAdding] = useState(false)

  if (checkout.isEmpty) return <EmptyBag />

  if (checkout.status === 'error') {
    return (
      <>
        <PageHeader title="Delivery address" documentTitle="Checkout · Delivery address" />
        <div className="mt-4 rounded-card border border-border bg-surface">
          <EmptyState
            icon={<TriangleAlert aria-hidden />}
            title="We couldn’t load your checkout"
            description="Nothing has been charged. Try again in a moment."
            action={<Button onClick={checkout.retry}>Retry</Button>}
          />
        </div>
      </>
    )
  }

  if (checkout.status === 'loading' || !checkout.data) {
    return (
      <CheckoutColumns aside={<Skeleton className="h-72 rounded-card" />}>
        <PageHeader title="Delivery address" documentTitle="Checkout · Delivery address" />
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-32 rounded-card" />
      </CheckoutColumns>
    )
  }

  const { customer, addresses, summary, shipments } = checkout.data
  const chosen = checkout.data.address
  const chosenId = chosen?.id ?? null
  const unserviceable = chosen ? shipments.some((shipment) => shipment.estimate?.serviceable === false) : false
  const soonest = shipments
    .map((shipment) => shipment.estimate)
    .filter((estimate) => estimate?.serviceable)
    .map((estimate) => estimate?.date)
    .sort()[0]

  const deliverHere = () => {
    if (!chosen) return
    setCheckout({ addressId: chosen.id })
    void navigate('/checkout/summary')
  }

  const onSaved = (address: Address, makeDefault: boolean) => {
    const result = dbActions.saveAddress(customerId, address, makeDefault)
    if (!result.ok) {
      toast.error('We couldn’t save that address', { description: result.error })
      return
    }
    setCheckout({ addressId: address.id })
    setAdding(false)
    setEditing(null)
    toast.success(editing ? 'Address updated' : 'Address saved', {
      description: `${address.line1}, ${address.city} ${address.pin}`,
    })
  }

  return (
    <CheckoutColumns
      aside={
        <PriceColumn
          summary={summary}
          barLabel="Order total"
          cta={
            <Button size="lg" fullWidth disabled={!chosen || unserviceable} onClick={deliverHere}>
              {signedIn ? 'Deliver here' : 'Sign in to continue'}
            </Button>
          }
          note={
            soonest ? <span className="block">Earliest delivery by {formatDayShort(soonest)}.</span> : null
          }
        />
      }
    >
      <StepHeading
        title="Delivery address"
        documentTitle="Checkout · Delivery address"
        description={
          signedIn
            ? 'Choose where this order should go. You can add a new address at any time.'
            : 'Sign in with your mobile number to use your saved addresses.'
        }
      />

      {!signedIn ? (
        <StepPanel title="Sign in to continue" description="Your bag is saved on this device.">
          <OtpSignIn
            verifyLabel="Verify and continue"
            onVerified={() => {
              signInCustomer(DEMO.customerId)
              toast.success('Signed in', { description: 'Your saved addresses are ready.' })
            }}
          />
        </StepPanel>
      ) : (
        <>
          {addresses.length > 0 ? (
            <StepPanel
              title={`Saved addresses (${addresses.length})`}
              description="Select the one this order should go to."
            >
              <fieldset className="flex flex-col gap-3">
                <legend className="sr-only">Choose a delivery address</legend>
                {addresses.map((address) => (
                  <AddressCard
                    key={address.id}
                    address={address}
                    selectable
                    selected={address.id === chosenId}
                    isDefault={address.id === customer?.defaultAddressId}
                    onSelect={(id) => {
                      setCheckout({ addressId: id })
                      setEditing(null)
                      setAdding(false)
                    }}
                    actions={
                      address.id === chosenId ? (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setEditing(address)
                            setAdding(false)
                          }}
                        >
                          Edit this address
                        </Button>
                      ) : undefined
                    }
                  />
                ))}
              </fieldset>

              {unserviceable && chosen ? (
                <p className="flex items-start gap-2 rounded-control border border-warning-border bg-warning-subtle px-3 py-2 type-caption text-warning-subtle-fg">
                  <MapPinOff aria-hidden className="mt-px size-4 shrink-0" />
                  <span>
                    We don’t deliver to {chosen.pin} yet. Choose another address, or save these items to your wishlist.
                  </span>
                </p>
              ) : null}

              {!adding && !editing ? (
                <Button variant="outline" leftIcon={<Plus aria-hidden />} className="self-start" onClick={() => setAdding(true)}>
                  Add a new address
                </Button>
              ) : null}
            </StepPanel>
          ) : null}

          {adding || editing || addresses.length === 0 ? (
            <StepPanel
              title={editing ? 'Edit address' : 'Add a new address'}
              description="The PIN code fills in the city and the state for you."
            >
              <AddressForm
                address={editing ?? undefined}
                suggest={{ name: customer?.name, phone: customer?.phone }}
                submitLabel={editing ? 'Save changes' : 'Save and use this address'}
                showDefaultToggle={addresses.length > 0}
                onSubmit={onSaved}
                onCancel={
                  addresses.length > 0
                    ? () => {
                        setAdding(false)
                        setEditing(null)
                      }
                    : undefined
                }
              />
            </StepPanel>
          ) : null}
        </>
      )}
    </CheckoutColumns>
  )
}
