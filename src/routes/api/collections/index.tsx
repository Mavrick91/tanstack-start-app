import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/collections/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/api/collections/"!</div>
}
