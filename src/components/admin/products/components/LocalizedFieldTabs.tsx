import { Input } from '../../../ui/input'
import { RichTextEditor } from '../../../ui/rich-text-editor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs'
import { Textarea } from '../../../ui/textarea'

export type LocalizedString = { en: string; fr?: string; id?: string }

type FieldType = 'input' | 'textarea' | 'richtext'

interface LocalizedFieldTabsProps {
  value: LocalizedString
  onChange: (value: LocalizedString) => void
  type?: FieldType
  placeholder?: {
    en?: string
    fr?: string
    id?: string
  }
  className?: string
  onBlurEn?: () => void
  hasError?: boolean
}

const tabTriggerClass =
  'rounded-lg px-4 py-1 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all'

const inputBaseClass =
  'h-12 bg-background/50 border-border rounded-xl focus:ring-pink-500/20 focus:border-pink-500'

/**
 * Reusable component for localized (en/fr/id) field input with tabs.
 * Supports input, textarea, and rich text editor field types.
 */
export const LocalizedFieldTabs = ({
  value,
  onChange,
  type = 'input',
  placeholder,
  className,
  onBlurEn,
  hasError,
}: LocalizedFieldTabsProps) => {
  const handleChange = (lang: 'en' | 'fr' | 'id', newValue: string) => {
    onChange({
      ...value,
      [lang]: newValue,
    })
  }

  const renderField = (lang: 'en' | 'fr' | 'id') => {
    const fieldValue = value[lang] || ''
    const fieldPlaceholder = placeholder?.[lang] || ''
    const isEnglish = lang === 'en'

    if (type === 'richtext') {
      return (
        <RichTextEditor
          value={fieldValue}
          onChange={(val) => handleChange(lang, val)}
          placeholder={fieldPlaceholder}
        />
      )
    }

    if (type === 'textarea') {
      return (
        <Textarea
          className={`${inputBaseClass} ${className || ''} ${hasError && isEnglish ? 'border-destructive' : ''}`}
          value={fieldValue}
          onChange={(e) => handleChange(lang, e.target.value)}
          placeholder={fieldPlaceholder}
          rows={3}
        />
      )
    }

    return (
      <Input
        className={`${inputBaseClass} ${className || ''} ${hasError && isEnglish ? 'border-destructive' : ''}`}
        value={fieldValue}
        onChange={(e) => handleChange(lang, e.target.value)}
        onBlur={isEnglish ? onBlurEn : undefined}
        placeholder={fieldPlaceholder}
      />
    )
  }

  return (
    <Tabs defaultValue="en" className="w-full">
      <TabsList className="bg-muted/30 p-1 rounded-xl mb-3 flex-wrap h-auto">
        <TabsTrigger value="en" className={tabTriggerClass}>
          EN
        </TabsTrigger>
        <TabsTrigger value="fr" className={tabTriggerClass}>
          FR
        </TabsTrigger>
        <TabsTrigger value="id" className={tabTriggerClass}>
          ID
        </TabsTrigger>
      </TabsList>
      <TabsContent value="en" className="mt-0">
        {renderField('en')}
      </TabsContent>
      <TabsContent value="fr" className="mt-0">
        {renderField('fr')}
      </TabsContent>
      <TabsContent value="id" className="mt-0">
        {renderField('id')}
      </TabsContent>
    </Tabs>
  )
}
