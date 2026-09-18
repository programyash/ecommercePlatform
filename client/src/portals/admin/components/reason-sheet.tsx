import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/input'
import { RadioGroup } from '@/components/ui/radio-group'
import { Sheet, SheetContent } from '@/components/ui/sheet'

export interface ReasonTemplate {
  id: string
  label: string
  description?: string
  body: string
}

interface ReasonSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  templates: ReasonTemplate[]
  /** Controlled message: the recipient reads it word for word. */
  value: string
  onValueChange: (value: string) => void
  /** "Chai & Crumbs Co. will see this in Seller Hub". */
  previewLabel: string
  /** The heading the recipient sees above the message. */
  previewHeading: string
  submitLabel: string
  tone?: 'default' | 'danger'
  onSubmit: () => void
}

const MIN_LENGTH = 20

/**
 * Reason templates beside a preview of exactly what the other portal will render.
 * The message is sent verbatim, so what is shown here is what the seller reads.
 */
export function ReasonSheet({
  open,
  onOpenChange,
  title,
  description,
  templates,
  value,
  onValueChange,
  previewLabel,
  previewHeading,
  submitLabel,
  tone = 'default',
  onSubmit,
}: ReasonSheetProps) {
  const trimmed = value.trim()
  const tooShort = trimmed.length < MIN_LENGTH
  const selected = templates.find((template) => template.body === value)?.id ?? 'custom'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={title}
        description={description}
        className="max-w-lg"
        footer={
          <div className="flex flex-col gap-2">
            {tooShort ? (
              <p className="type-caption text-fg-muted">
                Write at least a sentence — this message is the only explanation the seller gets.
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant={tone === 'danger' ? 'danger' : 'primary'} disabled={tooShort} onClick={onSubmit}>
                {submitLabel}
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-2 type-label text-fg">Start from a template</legend>
            <RadioGroup
              variant="card"
              aria-label="Reason template"
              value={selected}
              onValueChange={(next) => {
                const template = templates.find((entry) => entry.id === next)
                onValueChange(template ? template.body : '')
              }}
              options={[
                ...templates.map((template) => ({
                  value: template.id,
                  label: template.label,
                  description: template.description ?? template.body,
                })),
                { value: 'custom', label: 'Write my own', description: 'Start from a blank message.' },
              ]}
            />
          </fieldset>

          <Field
            label="Message to the seller"
            hint={`${trimmed.length} characters · sent word for word`}
          >
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                rows={5}
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                placeholder="Explain what is wrong and what to do next."
              />
            )}
          </Field>

          <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 type-label text-fg">
              <Eye aria-hidden className="size-4 text-fg-muted" />
              {previewLabel}
            </h3>
            <div className="rounded-card border border-warning-border bg-warning-subtle p-4">
              <p className="type-label text-warning-subtle-fg">{previewHeading}</p>
              <p className="mt-1 type-body whitespace-pre-line text-fg">
                {trimmed || 'Your message will appear here.'}
              </p>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
