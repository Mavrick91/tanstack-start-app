import { createFileRoute } from '@tanstack/react-router'

const RouteComponent = () => {
  return <div>Hello &quot;/api/collections/&quot;!</div>
}

export const Route = createFileRoute('/api/collections/')({
  component: RouteComponent,
})
