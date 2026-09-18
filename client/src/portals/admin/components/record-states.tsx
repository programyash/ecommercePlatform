import { SearchX, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

interface RecordNotFoundProps {
  title: string
  description: string
  backTo: string
  backLabel: string
}

/** The shape every admin detail screen falls back to when the id does not exist. */
export function RecordNotFound({ title, description, backTo, backLabel }: RecordNotFoundProps) {
  return (
    <EmptyState
      icon={<SearchX aria-hidden />}
      title={title}
      description={description}
      action={
        <Button variant="outline" asChild>
          <Link to={backTo}>{backLabel}</Link>
        </Button>
      }
    />
  )
}

interface LoadFailedProps {
  title: string
  description?: string
  onRetry: () => void
}

/** The shared error state: say what failed, then offer the one thing that helps. */
export function LoadFailed({
  title,
  description = 'The numbers didn’t come back. Try again.',
  onRetry,
}: LoadFailedProps) {
  return (
    <EmptyState
      icon={<TriangleAlert aria-hidden />}
      title={title}
      description={description}
      action={<Button onClick={onRetry}>Retry</Button>}
    />
  )
}
