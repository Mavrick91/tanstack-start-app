import {
  createFileRoute,
  useNavigate,
  useParams,
  Link,
} from '@tanstack/react-router'
import { ArrowLeft, MapPin, Plus, Trash2, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AddressForm } from '../../../components/checkout/AddressForm'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog'
import { useAuthStore } from '../../../hooks/useAuth'
import {
  getCustomerAddressesFn,
  createAddressFn,
  deleteAddressFn,
} from '../../../server/customers'

import type { AddressFormData } from '../../../lib/checkout-schemas'

type CustomerAddress = {
  id: string
  type: 'shipping' | 'billing'
  firstName: string
  lastName: string
  company?: string
  address1: string
  address2?: string
  city: string
  province?: string
  provinceCode?: string
  country: string
  countryCode: string
  zip: string
  phone?: string
  isDefault: boolean
}

export const Route = createFileRoute('/$lang/account/addresses')({
  component: AccountAddressesPage,
})

function AccountAddressesPage() {
  const { lang } = useParams({ strict: false }) as { lang: string }
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    isAuthenticated,
    isLoading: authLoading,
    checkSession,
  } = useAuthStore()

  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const addressFormRef = useRef<{ submit: () => void } | null>(null)

  useEffect(() => {
    checkSession()
  }, [checkSession])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/$lang', params: { lang } })
      return
    }

    if (isAuthenticated) {
      loadAddresses()
    }
  }, [authLoading, isAuthenticated, lang, navigate])

  const loadAddresses = async () => {
    setIsLoading(true)
    try {
      const data = await getCustomerAddressesFn()
      setAddresses(data.addresses as CustomerAddress[])
    } catch (err) {
      console.error('Failed to fetch addresses:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAddress = async (addressData: AddressFormData) => {
    setIsSubmitting(true)
    try {
      await createAddressFn({
        data: {
          type: 'shipping',
          firstName: addressData.firstName,
          lastName: addressData.lastName,
          company: addressData.company,
          address1: addressData.address1,
          address2: addressData.address2,
          city: addressData.city,
          province: addressData.province,
          provinceCode: addressData.provinceCode,
          country: addressData.country,
          countryCode: addressData.countryCode,
          zip: addressData.zip,
          phone: addressData.phone,
          isDefault: false,
        },
      })
      toast.success(t('Address added'))
      setIsDialogOpen(false)
      loadAddresses()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('Failed to add address'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitClick = () => {
    addressFormRef.current?.submit()
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm(t('Are you sure you want to delete this address?'))) return

    try {
      await deleteAddressFn({ data: { addressId } })
      toast.success(t('Address deleted'))
      loadAddresses()
    } catch {
      toast.error(t('Failed to delete address'))
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/$lang/account"
              params={{ lang }}
              className="inline-flex items-center text-white/60 hover:text-white mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('Back to account')}
            </Link>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white">
                {t('Addresses')}
              </h1>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-black hover:bg-white/90">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('Add address')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{t('Add new address')}</DialogTitle>
                    <DialogDescription className="sr-only">
                      {t('Fill out the form to add a new shipping address')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <AddressForm
                      onSubmit={handleAddAddress}
                      formRef={addressFormRef}
                    />
                    <div className="flex justify-end gap-3 mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        className="border-white/10 text-white hover:bg-white/10"
                      >
                        {t('Cancel')}
                      </Button>
                      <Button
                        onClick={handleSubmitClick}
                        disabled={isSubmitting}
                        className="bg-white text-black hover:bg-white/90"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t('Save address')
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Addresses list */}
          {addresses.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-12 text-center">
              <MapPin className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 mb-4">
                {t("You haven't added any addresses yet.")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="text-white/80 space-y-1">
                      <p className="font-medium text-white">
                        {address.firstName} {address.lastName}
                        {address.isDefault && (
                          <span className="ml-2 text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded">
                            {t('Default')}
                          </span>
                        )}
                      </p>
                      {address.company && <p>{address.company}</p>}
                      <p>{address.address1}</p>
                      {address.address2 && <p>{address.address2}</p>}
                      <p>
                        {address.city}, {address.province} {address.zip}
                      </p>
                      <p>{address.country}</p>
                      {address.phone && (
                        <p className="text-white/60">{address.phone}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAddress(address.id)}
                      className="text-white/40 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
