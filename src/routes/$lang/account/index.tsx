import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFileRoute,
  useNavigate,
  useParams,
  useRouter,
  Link,
} from '@tanstack/react-router'
import {
  Package,
  MapPin,
  User,
  LogOut,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import { logoutFn } from '../../../server/auth'
import { getCustomerSessionFn } from '../../../server/customers'

const AccountPage = () => {
  const { lang } = useParams({ strict: false }) as { lang: string }
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  // Get customer from query (parent layout ensures customer exists)
  const { data } = useQuery({
    queryKey: ['customer', 'session'],
    queryFn: getCustomerSessionFn,
    staleTime: 5 * 60 * 1000,
  })
  const customer = data?.customer

  const handleLogout = async () => {
    await logoutFn()
    // Clear customer session and invalidate router
    queryClient.removeQueries({ queryKey: ['customer', 'session'] })
    await router.invalidate()
    navigate({ to: '/$lang', params: { lang } })
  }

  const menuItems = [
    {
      icon: Package,
      label: t('Order History'),
      description: t('View your past orders'),
      href: `/${lang}/account/orders`,
    },
    {
      icon: MapPin,
      label: t('Addresses'),
      description: t('Manage your shipping addresses'),
      href: `/${lang}/account/addresses`,
    },
    ...(customer?.role === 'admin'
      ? [
          {
            icon: Shield,
            label: t('Admin Panel'),
            description: t('Manage products, orders, and site settings'),
            href: '/admin',
          },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {t('My Account')}
            </h1>
            {customer && (
              <p className="text-white/60">
                {customer.firstName
                  ? `${t('Welcome back')}, ${customer.firstName}!`
                  : customer.email}
              </p>
            )}
          </div>

          {/* Account info card */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                <User className="w-7 h-7 text-white/60" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  {customer?.firstName && customer?.lastName
                    ? `${customer.firstName} ${customer.lastName}`
                    : t('Customer')}
                </p>
                <p className="text-sm text-white/60">{customer?.email}</p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="space-y-3 mb-8">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center gap-4 p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-white/60" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{item.label}</p>
                  <p className="text-sm text-white/60">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/40" />
              </Link>
            ))}
          </div>

          {/* Logout button */}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full border-white/10 hover:bg-white/10 text-white"
            icon={<LogOut className="w-4 h-4" />}
          >
            {t('Log out')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/$lang/account/')({
  component: AccountPage,
})
