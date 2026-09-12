import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { dbActions, lookupPin, STATES, type Address } from '@/data'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { RadioGroup } from '@/components/ui/radio-group'
import { Select } from '@/components/ui/select'
import { Form, FormActions, FormField, FormRow } from '@/components/forms/form'
import { PhoneInput, PinCodeInput } from '@/components/forms/inputs'
import { addressSchema, type AddressFormValues } from '@/lib/validators'
import { SubmitErrors } from './submit-errors'

const STATE_OPTIONS = STATES.map((state) => ({ value: state.name, label: state.name }))

const TYPE_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'other', label: 'Other' },
]

const FIELD_ORDER: (keyof AddressFormValues)[] = ['name', 'phone', 'pin', 'line1', 'line2', 'landmark', 'city', 'state', 'type']

const LABELS: Record<keyof AddressFormValues, string> = {
  name: 'Full name',
  phone: 'Mobile number',
  pin: 'PIN code',
  line1: 'Flat, house number or building',
  line2: 'Area, street or locality',
  landmark: 'Landmark',
  city: 'Town or city',
  state: 'State or union territory',
  type: 'Address type',
}

interface AddressFormProps {
  /** Editing an existing address; omit to add a new one. */
  address?: Address
  /** Pre-fills the name and mobile of a brand-new address. */
  suggest?: { name?: string; phone?: string }
  submitLabel: string
  onSubmit: (address: Address, makeDefault: boolean) => void
  onCancel?: () => void
  /** Hidden when the shopper has no other address to be the default. */
  showDefaultToggle?: boolean
  defaultChecked?: boolean
  stickyActions?: boolean
}

/**
 * The one delivery-address form: checkout's "add a new address" and the account
 * addresses drawer render exactly this. The PIN code fills the city and the state,
 * and says so out loud for screen readers.
 */
export function AddressForm({
  address,
  suggest,
  submitLabel,
  onSubmit,
  onCancel,
  showDefaultToggle = true,
  defaultChecked = false,
  stickyActions = false,
}: AddressFormProps) {
  const [announcement, setAnnouncement] = useState('')
  const [makeDefault, setMakeDefault] = useState(defaultChecked)

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    mode: 'onBlur',
    defaultValues: {
      name: address?.name ?? suggest?.name ?? '',
      phone: address?.phone ?? suggest?.phone ?? '',
      pin: address?.pin ?? '',
      line1: address?.line1 ?? '',
      line2: address?.line2 ?? '',
      landmark: address?.landmark ?? '',
      city: address?.city ?? '',
      state: address?.state ?? '',
      type: address?.type ?? 'home',
    },
  })

  const errors = FIELD_ORDER.filter((name) => form.formState.errors[name]).map((name) => ({
    name,
    message: form.formState.errors[name]?.message ?? `Check ${LABELS[name].toLowerCase()}.`,
  }))

  const fillFromPin = (pin: string) => {
    if (pin.length !== 6) return
    const info = lookupPin(pin)
    if (!info) {
      setAnnouncement('')
      return
    }
    if (info.city) form.setValue('city', info.city, { shouldValidate: true })
    form.setValue('state', info.state, { shouldValidate: true })
    setAnnouncement(
      info.city ? `City and state filled: ${info.city}, ${info.state}` : `State filled: ${info.state}`,
    )
  }

  const submit = (values: AddressFormValues) => {
    const info = lookupPin(values.pin)
    const stateCode = STATES.find((state) => state.name === values.state)?.code ?? info?.stateCode ?? '00'
    onSubmit(
      {
        id: address?.id ?? dbActions.newAccountId('addr_'),
        name: values.name,
        phone: values.phone,
        line1: values.line1,
        line2: values.line2,
        ...(values.landmark ? { landmark: values.landmark } : {}),
        city: values.city,
        state: values.state,
        stateCode,
        pin: values.pin,
        type: values.type,
      },
      makeDefault,
    )
  }

  return (
    <Form form={form} onSubmit={submit}>
      <SubmitErrors errors={errors} submitCount={form.formState.submitCount} />

      <FormRow>
        <FormField<AddressFormValues> name="name" label={LABELS.name}>
          {(field) => (
            <Input
              id={field.id}
              name={field.name}
              value={String(field.value ?? '')}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref as React.Ref<HTMLInputElement>}
              invalid={field.invalid}
              aria-describedby={field.describedBy}
              autoComplete="name"
              placeholder="Priya Nair"
            />
          )}
        </FormField>
        <FormField<AddressFormValues> name="phone" label={LABELS.phone} hint="We share this with the delivery partner only.">
          {(field) => (
            <PhoneInput
              id={field.id}
              name={field.name}
              value={String(field.value ?? '')}
              onChange={(event) => field.onChange(event.target.value.replace(/\D/g, ''))}
              onBlur={field.onBlur}
              ref={field.ref as React.Ref<HTMLInputElement>}
              invalid={field.invalid}
              aria-describedby={field.describedBy}
            />
          )}
        </FormField>
      </FormRow>

      <FormRow>
        <FormField<AddressFormValues> name="pin" label={LABELS.pin} hint="The city and state fill themselves.">
          {(field) => (
            <PinCodeInput
              id={field.id}
              name={field.name}
              value={String(field.value ?? '')}
              onChange={(event) => {
                const next = event.target.value.replace(/\D/g, '').slice(0, 6)
                field.onChange(next)
                fillFromPin(next)
              }}
              onBlur={field.onBlur}
              ref={field.ref as React.Ref<HTMLInputElement>}
              invalid={field.invalid}
              aria-describedby={field.describedBy}
            />
          )}
        </FormField>
        <FormField<AddressFormValues> name="city" label={LABELS.city}>
          {(field) => (
            <Input
              id={field.id}
              name={field.name}
              value={String(field.value ?? '')}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref as React.Ref<HTMLInputElement>}
              invalid={field.invalid}
              aria-describedby={field.describedBy}
              autoComplete="address-level2"
            />
          )}
        </FormField>
      </FormRow>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <FormField<AddressFormValues> name="line1" label={LABELS.line1}>
        {(field) => (
          <Input
            id={field.id}
            name={field.name}
            value={String(field.value ?? '')}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref as React.Ref<HTMLInputElement>}
            invalid={field.invalid}
            aria-describedby={field.describedBy}
            autoComplete="address-line1"
            placeholder="Flat 3B, Maple Residency"
          />
        )}
      </FormField>

      <FormField<AddressFormValues> name="line2" label={LABELS.line2}>
        {(field) => (
          <Input
            id={field.id}
            name={field.name}
            value={String(field.value ?? '')}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref as React.Ref<HTMLInputElement>}
            invalid={field.invalid}
            aria-describedby={field.describedBy}
            autoComplete="address-line2"
            placeholder="Kadavanthra"
          />
        )}
      </FormField>

      <FormRow>
        <FormField<AddressFormValues> name="landmark" label={LABELS.landmark} optional>
          {(field) => (
            <Input
              id={field.id}
              name={field.name}
              value={String(field.value ?? '')}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref as React.Ref<HTMLInputElement>}
              invalid={field.invalid}
              aria-describedby={field.describedBy}
              placeholder="Opposite the BSNL office"
            />
          )}
        </FormField>
        <FormField<AddressFormValues> name="state" label={LABELS.state}>
          {(field) => (
            <Select
              id={field.id}
              name={field.name}
              value={String(field.value ?? '') || undefined}
              onValueChange={field.onChange}
              options={STATE_OPTIONS}
              placeholder="Choose a state"
              invalid={field.invalid}
              aria-describedby={field.describedBy}
              className="w-full"
            />
          )}
        </FormField>
      </FormRow>

      <FormField<AddressFormValues> name="type" label={LABELS.type} hint="Work addresses are delivered on working days only.">
        {(field) => (
          <RadioGroup
            orientation="horizontal"
            value={String(field.value ?? 'home')}
            onValueChange={field.onChange}
            options={TYPE_OPTIONS}
            aria-label={LABELS.type}
          />
        )}
      </FormField>

      {showDefaultToggle ? (
        <Checkbox
          label="Make this my default address"
          checked={makeDefault}
          onCheckedChange={(checked) => setMakeDefault(checked === true)}
        />
      ) : null}

      <FormActions sticky={stickyActions}>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit">{submitLabel}</Button>
      </FormActions>
    </Form>
  )
}
