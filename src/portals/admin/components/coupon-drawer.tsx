import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { Coupon } from '@/data'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input, Textarea } from '@/components/ui/input'
import { RadioGroup } from '@/components/ui/radio-group'
import { Select } from '@/components/ui/select'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { CurrencyInput } from '@/components/forms/inputs'
import { ErrorSummary, Form, FormActions, FormField, FormRow, FormSection } from '@/components/forms/form'

const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, 'Use at least 4 characters.')
    .max(16, 'Keep the code under 16 characters.')
    .regex(/^[A-Za-z0-9]+$/, 'Use letters and numbers only — no spaces or symbols.'),
  title: z.string().trim().min(3, 'Give the coupon a short name shoppers will recognise.'),
  description: z.string().trim().min(10, 'Explain in one line when this coupon applies.'),
  kind: z.enum(['flat', 'percent']),
  value: z.number().min(1, 'Enter the discount.'),
  maxDiscount: z.number().min(1, 'Enter the cap, or leave it blank.').optional(),
  minOrder: z.number().min(0, 'Enter 0 if there is no minimum.'),
  fundedBy: z.enum(['platform', 'seller']),
  sellerId: z.string(),
  startsAt: z.string().min(1, 'Pick the first day this coupon works.'),
  endsAt: z.string().min(1, 'Pick the last day this coupon works.'),
  usageLimit: z.number().min(1, 'Enter a limit, or leave it blank.').optional(),
  firstOrderOnly: z.boolean(),
  prepaidOnly: z.boolean(),
  categoryIds: z.array(z.string()),
})

type CouponFormValues = z.infer<typeof couponSchema>

const BLANK: CouponFormValues = {
  code: '',
  title: '',
  description: '',
  kind: 'percent',
  value: 10,
  minOrder: 0,
  fundedBy: 'platform',
  sellerId: '',
  startsAt: '',
  endsAt: '',
  firstOrderOnly: false,
  prepaidOnly: false,
  categoryIds: [],
}

function valuesOf(coupon: Coupon): CouponFormValues {
  return {
    code: coupon.code,
    title: coupon.title,
    description: coupon.description,
    kind: coupon.kind,
    value: coupon.value,
    ...(coupon.maxDiscount !== undefined ? { maxDiscount: coupon.maxDiscount } : {}),
    minOrder: coupon.minOrder,
    fundedBy: coupon.fundedBy,
    sellerId: coupon.sellerId ?? '',
    startsAt: coupon.startsAt.slice(0, 10),
    endsAt: coupon.endsAt.slice(0, 10),
    ...(coupon.usageLimit !== undefined ? { usageLimit: coupon.usageLimit } : {}),
    firstOrderOnly: coupon.firstOrderOnly ?? false,
    prepaidOnly: coupon.prepaidOnly ?? false,
    categoryIds: coupon.categoryIds ?? [],
  }
}

interface CouponDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The coupon being edited; omit to create a new one. */
  editing?: Coupon
  sellers: { value: string; label: string }[]
  categories: { id: string; name: string }[]
  onSave: (coupon: Coupon) => void
}

/** Create or edit a coupon without leaving the list. */
export function CouponDrawer({ open, onOpenChange, editing, sellers, categories, onSave }: CouponDrawerProps) {
  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: editing ? valuesOf(editing) : BLANK,
    mode: 'onBlur',
  })

  const kind = useWatch({ control: form.control, name: 'kind' })
  const fundedBy = useWatch({ control: form.control, name: 'fundedBy' })
  const errors = Object.entries(form.formState.errors).map(([name, error]) => ({
    name,
    message: String(error?.message ?? 'Check this field.'),
  }))

  const submit = (values: CouponFormValues) => {
    if (values.kind === 'percent' && values.value > 90) {
      form.setError('value', { message: 'A percentage coupon cannot be more than 90%.' })
      return
    }
    if (values.endsAt < values.startsAt) {
      form.setError('endsAt', { message: 'The last day cannot be before the first day.' })
      return
    }
    if (values.fundedBy === 'seller' && !values.sellerId) {
      form.setError('sellerId', { message: 'Choose the seller funding this coupon.' })
      return
    }

    onSave({
      code: values.code.toUpperCase(),
      title: values.title,
      description: values.description,
      kind: values.kind,
      value: values.value,
      ...(values.kind === 'percent' && values.maxDiscount !== undefined ? { maxDiscount: values.maxDiscount } : {}),
      minOrder: values.minOrder,
      ...(values.categoryIds.length > 0 ? { categoryIds: values.categoryIds } : {}),
      ...(values.firstOrderOnly ? { firstOrderOnly: true } : {}),
      ...(values.prepaidOnly ? { prepaidOnly: true } : {}),
      fundedBy: values.fundedBy,
      ...(values.fundedBy === 'seller' && values.sellerId ? { sellerId: values.sellerId } : {}),
      startsAt: `${values.startsAt}T00:00:00+05:30`,
      endsAt: `${values.endsAt}T23:59:59+05:30`,
      ...(values.usageLimit !== undefined ? { usageLimit: values.usageLimit } : {}),
      used: editing?.used ?? 0,
      ...(editing?.paused ? { paused: true } : {}),
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={editing ? `Edit ${editing.code}` : 'Create a coupon'}
        description={
          editing
            ? 'Changes apply to new orders. Orders already placed keep the discount they were given.'
            : 'Shoppers type the code at checkout; it only discounts the lines it applies to.'
        }
        className="max-w-xl"
      >
        <Form form={form} onSubmit={submit}>
          <ErrorSummary errors={errors} />

          <FormSection title="The offer" description="What shoppers see when the code is applied.">
            <FormRow>
              <FormField<CouponFormValues> name="code" label="Code" hint="Letters and numbers, shown in capitals.">
                {({ id, value, onChange, onBlur, invalid, describedBy }) => (
                  <Input
                    id={id}
                    value={String(value ?? '')}
                    onChange={(event) => onChange(event.target.value.toUpperCase())}
                    onBlur={onBlur}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    autoComplete="off"
                    disabled={Boolean(editing)}
                    placeholder="FESTIVE20"
                  />
                )}
              </FormField>
              <FormField<CouponFormValues> name="title" label="Name">
                {({ id, value, onChange, onBlur, invalid, describedBy }) => (
                  <Input
                    id={id}
                    value={String(value ?? '')}
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={onBlur}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    placeholder="Festive week discount"
                  />
                )}
              </FormField>
            </FormRow>

            <FormField<CouponFormValues>
              name="description"
              label="One-line description"
              hint="Shown beside the code in the shopper’s coupon list."
            >
              {({ id, value, onChange, onBlur, invalid, describedBy }) => (
                <Textarea
                  id={id}
                  rows={2}
                  value={String(value ?? '')}
                  onChange={(event) => onChange(event.target.value)}
                  onBlur={onBlur}
                  invalid={invalid}
                  aria-describedby={describedBy}
                  placeholder="20% off fashion, up to ₹500, on orders above ₹999."
                />
              )}
            </FormField>

            <FormField<CouponFormValues> name="kind" label="Discount type">
              {({ value, onChange }) => (
                <RadioGroup
                  aria-label="Discount type"
                  orientation="horizontal"
                  variant="card"
                  value={String(value ?? 'percent')}
                  onValueChange={onChange}
                  options={[
                    { value: 'percent', label: 'Percentage off' },
                    { value: 'flat', label: 'Flat amount off' },
                  ]}
                />
              )}
            </FormField>

            <FormRow>
              <FormField<CouponFormValues> name="value" label={kind === 'percent' ? 'Percentage off' : 'Amount off'}>
                {({ id, value, onChange, onBlur, invalid, describedBy }) =>
                  kind === 'percent' ? (
                    <Input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={90}
                      suffix="%"
                      value={Number.isFinite(value as number) ? String(value) : ''}
                      onChange={(event) => onChange(event.target.valueAsNumber)}
                      onBlur={onBlur}
                      invalid={invalid}
                      aria-describedby={describedBy}
                      className="tabular"
                    />
                  ) : (
                    <CurrencyInput
                      id={id}
                      type="number"
                      min={1}
                      value={Number.isFinite(value as number) ? String(value) : ''}
                      onChange={(event) => onChange(event.target.valueAsNumber)}
                      onBlur={onBlur}
                      invalid={invalid}
                      aria-describedby={describedBy}
                    />
                  )
                }
              </FormField>

              {kind === 'percent' ? (
                <FormField<CouponFormValues> name="maxDiscount" label="Maximum discount" optional>
                  {({ id, value, onChange, onBlur, invalid, describedBy }) => (
                    <CurrencyInput
                      id={id}
                      type="number"
                      min={1}
                      value={Number.isFinite(value as number) ? String(value) : ''}
                      onChange={(event) =>
                        onChange(Number.isNaN(event.target.valueAsNumber) ? undefined : event.target.valueAsNumber)
                      }
                      onBlur={onBlur}
                      invalid={invalid}
                      aria-describedby={describedBy}
                      placeholder="500"
                    />
                  )}
                </FormField>
              ) : null}
            </FormRow>

            <FormRow>
              <FormField<CouponFormValues> name="minOrder" label="Minimum order value">
                {({ id, value, onChange, onBlur, invalid, describedBy }) => (
                  <CurrencyInput
                    id={id}
                    type="number"
                    min={0}
                    value={Number.isFinite(value as number) ? String(value) : ''}
                    onChange={(event) => onChange(event.target.valueAsNumber)}
                    onBlur={onBlur}
                    invalid={invalid}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
              <FormField<CouponFormValues> name="usageLimit" label="Usage limit" optional hint="Total uses across all shoppers.">
                {({ id, value, onChange, onBlur, invalid, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={Number.isFinite(value as number) ? String(value) : ''}
                    onChange={(event) =>
                      onChange(Number.isNaN(event.target.valueAsNumber) ? undefined : event.target.valueAsNumber)
                    }
                    onBlur={onBlur}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    className="tabular"
                    placeholder="Unlimited"
                  />
                )}
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="Who pays, and where it works">
            <FormField<CouponFormValues> name="fundedBy" label="Funded by">
              {({ value, onChange }) => (
                <RadioGroup
                  aria-label="Funded by"
                  variant="card"
                  value={String(value ?? 'platform')}
                  onValueChange={onChange}
                  options={[
                    { value: 'platform', label: 'Chowk', description: 'Does not reduce the seller’s payout.' },
                    { value: 'seller', label: 'A seller', description: 'Deducted from that seller’s settlement.' },
                  ]}
                />
              )}
            </FormField>

            {fundedBy === 'seller' ? (
              <FormField<CouponFormValues> name="sellerId" label="Seller">
                {({ id, value, onChange, invalid, describedBy }) => (
                  <Select
                    id={id}
                    value={String(value ?? '') || 'none'}
                    onValueChange={(next) => onChange(next === 'none' ? '' : next)}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    options={[{ value: 'none', label: 'Choose a seller' }, ...sellers]}
                  />
                )}
              </FormField>
            ) : null}

            <FormField<CouponFormValues>
              name="categoryIds"
              label="Categories"
              optional
              hint="Leave every box clear to apply the coupon across the marketplace."
            >
              {({ value, onChange }) => {
                const selected = Array.isArray(value) ? (value as string[]) : []
                return (
                  <fieldset className="grid gap-2 sm:grid-cols-2">
                    <legend className="sr-only">Categories this coupon applies to</legend>
                    {categories.map((category) => (
                      <Checkbox
                        key={category.id}
                        label={category.name}
                        checked={selected.includes(category.id)}
                        onCheckedChange={(checked) =>
                          onChange(
                            checked ? [...selected, category.id] : selected.filter((entry) => entry !== category.id),
                          )
                        }
                      />
                    ))}
                  </fieldset>
                )
              }}
            </FormField>

            <FormField<CouponFormValues> name="firstOrderOnly" label="First order only">
              {({ value, onChange }) => (
                <Switch
                  label="Only on a shopper’s first order"
                  description="Used for welcome offers such as WELCOME100."
                  checked={Boolean(value)}
                  onCheckedChange={onChange}
                />
              )}
            </FormField>

            <FormField<CouponFormValues> name="prepaidOnly" label="Prepaid only">
              {({ value, onChange }) => (
                <Switch
                  label="Not valid on cash on delivery"
                  description="Shoppers paying in cash will see why the code did not apply."
                  checked={Boolean(value)}
                  onCheckedChange={onChange}
                />
              )}
            </FormField>
          </FormSection>

          <FormSection title="Validity">
            <FormRow>
              <FormField<CouponFormValues> name="startsAt" label="First day">
                {({ id, value, onChange, onBlur, invalid, describedBy }) => (
                  <Input
                    id={id}
                    type="date"
                    value={String(value ?? '')}
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={onBlur}
                    invalid={invalid}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
              <FormField<CouponFormValues> name="endsAt" label="Last day">
                {({ id, value, onChange, onBlur, invalid, describedBy }) => (
                  <Input
                    id={id}
                    type="date"
                    value={String(value ?? '')}
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={onBlur}
                    invalid={invalid}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
            </FormRow>
          </FormSection>

          <FormActions sticky>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {editing ? 'Save coupon' : 'Create coupon'}
            </Button>
          </FormActions>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
