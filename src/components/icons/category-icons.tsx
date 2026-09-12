import {
  Backpack,
  Baby,
  BookOpen,
  Camera,
  Coffee,
  CookingPot,
  Dumbbell,
  Footprints,
  Gem,
  Headphones,
  Lamp,
  Laptop,
  ShoppingBasket,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  Speaker,
  Tag,
  ToyBrick,
  Watch,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryIconKey } from '@/data/types'

export const CATEGORY_ICONS: Record<CategoryIconKey, LucideIcon> = {
  smartphone: Smartphone,
  headphones: Headphones,
  shirt: Shirt,
  footprints: Footprints,
  'cooking-pot': CookingPot,
  sparkles: Sparkles,
  dumbbell: Dumbbell,
  'book-open': BookOpen,
  'toy-brick': ToyBrick,
  'shopping-basket': ShoppingBasket,
  laptop: Laptop,
  watch: Watch,
  camera: Camera,
  speaker: Speaker,
  sofa: Sofa,
  lamp: Lamp,
  gem: Gem,
  backpack: Backpack,
  baby: Baby,
  coffee: Coffee,
  tag: Tag,
}

export function CategoryIcon({ name, className }: { name: CategoryIconKey; className?: string }) {
  const Icon = CATEGORY_ICONS[name] ?? Tag
  return <Icon aria-hidden className={className} />
}
