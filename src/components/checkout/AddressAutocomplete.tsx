import { Loader2 } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { cn } from '../../lib/utils'
import { Input } from '../ui/input'

import type { AddressFormData } from '../../lib/checkout-schemas'

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          AutocompleteSuggestion: {
            fetchAutocompleteSuggestions: (request: {
              input: string
              includedPrimaryTypes?: string[]
            }) => Promise<{
              suggestions: Array<{
                placePrediction?: {
                  placeId: string
                  mainText?: { text: string }
                  secondaryText?: { text: string }
                  text?: { text: string }
                }
              }>
            }>
          }
          Place: new (options: { id: string }) => {
            fetchFields: (options: { fields: string[] }) => Promise<void>
            addressComponents?: Array<{
              types: string[]
              longText?: string
              shortText?: string
            }>
          }
        }
      }
    }
  }
}

type Suggestion = {
  placeId: string
  mainText: string
  secondaryText: string
  fullText: string
}

type AddressAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  onAddressSelect: (address: Partial<AddressFormData>) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Track script loading state externally to avoid setState in effect
let googleMapsLoaded = false
const listeners = new Set<() => void>()

const subscribeToGoogleMaps = (callback: () => void) => {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

const getGoogleMapsSnapshot = () => {
  return googleMapsLoaded || !!window.google?.maps?.places
}

const loadGoogleMapsScript = () => {
  if (googleMapsLoaded || window.google?.maps?.places) {
    googleMapsLoaded = true
    listeners.forEach((l) => l())
    return
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.warn('Google Maps API key not found')
    return
  }

  // Check if script is already being loaded
  const existingScript = document.querySelector(
    'script[src*="maps.googleapis.com"]',
  )
  if (existingScript) return

  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
  script.async = true
  script.defer = true
  script.onload = () => {
    googleMapsLoaded = true
    listeners.forEach((l) => l())
  }
  document.head.appendChild(script)
}

export const AddressAutocomplete = ({
  value,
  onChange,
  onAddressSelect,
  placeholder = 'Start typing an address...',
  className,
  disabled,
}: AddressAutocompleteProps) => {
  const isScriptLoaded = useSyncExternalStore(
    subscribeToGoogleMaps,
    getGoogleMapsSnapshot,
    () => false,
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load Google Maps script
  useEffect(() => {
    loadGoogleMapsScript()
  }, [])

  // Fetch suggestions using the new AutocompleteSuggestion API
  const fetchSuggestions = useCallback(async (input: string) => {
    if (!input || input.length < 3 || !window.google?.maps?.places) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      const { AutocompleteSuggestion } = window.google.maps.places

      const request = {
        input,
        includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
      }

      const { suggestions: results } =
        await AutocompleteSuggestion.fetchAutocompleteSuggestions(request)

      const formattedSuggestions: Suggestion[] = results
        .filter((s) => s.placePrediction)
        .map((s) => ({
          placeId: s.placePrediction!.placeId,
          mainText: s.placePrediction!.mainText?.text || '',
          secondaryText: s.placePrediction!.secondaryText?.text || '',
          fullText: s.placePrediction!.text?.text || '',
        }))

      setSuggestions(formattedSuggestions)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Debounce the API call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue)
    }, 300)
  }

  const handleSelect = async (suggestion: Suggestion) => {
    onChange(suggestion.fullText)
    setSuggestions([])

    if (!window.google?.maps?.places) return

    try {
      const { Place } = window.google.maps.places
      const place = new Place({ id: suggestion.placeId })

      await place.fetchFields({
        fields: ['addressComponents'],
      })

      if (place.addressComponents) {
        const address: Partial<AddressFormData> = {}
        let streetNumber = ''
        let route = ''

        for (const component of place.addressComponents) {
          const types = component.types

          if (types.includes('street_number')) {
            streetNumber = component.longText || ''
          }
          if (types.includes('route')) {
            route = component.longText || ''
          }
          if (types.includes('locality')) {
            address.city = component.longText || ''
          }
          if (types.includes('administrative_area_level_1')) {
            address.province = component.longText || ''
            address.provinceCode = component.shortText || ''
          }
          if (types.includes('country')) {
            address.country = component.longText || ''
            address.countryCode = component.shortText || ''
          }
          if (types.includes('postal_code')) {
            address.zip = component.longText || ''
          }
        }

        address.address1 = streetNumber ? `${streetNumber} ${route}` : route

        onAddressSelect(address)
      }
    } catch (error) {
      console.error('Error fetching place details:', error)
    }
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // If Google Maps is not loaded, show a regular input
  if (!isScriptLoaded) {
    return (
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
        />
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInput}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="off"
      />

      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        </div>
      )}

      {suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <li key={suggestion.placeId}>
              <button
                type="button"
                onClick={() => handleSelect(suggestion)}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm hover:bg-gray-50',
                  'focus:bg-gray-50 focus:outline-none',
                )}
              >
                <span className="font-medium">{suggestion.mainText}</span>
                <span className="text-gray-500 ml-1">
                  {suggestion.secondaryText}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
