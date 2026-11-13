'use client'

import * as React from 'react'

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'

function Collapsible({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  asChild = false,
  render,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Trigger> & { asChild?: boolean }) {
  const resolvedRender =
    render ?? (asChild && React.isValidElement(children) ? children : undefined)

  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      render={resolvedRender}
      {...props}
    >
      {resolvedRender && asChild ? undefined : children}
    </CollapsiblePrimitive.Trigger>
  )
}

function CollapsibleContent({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Panel>) {
  return <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
