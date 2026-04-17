"use client"

import { useState } from "react"
import { Tabs } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

import { useProductPatch } from "./use-product-patch"
import { TabsBasics } from "./tabs-basics"
import { TabsImage } from "./tabs-image"
import { TabsVariants } from "./tabs-variants"
import { TabsPricing } from "./tabs-pricing"
import { TabsCategory } from "./tabs-category"
import { TabsPublish } from "./tabs-publish"
import type { StudioCategory, StudioProduct, StudioVariant } from "./types"

type StudioTabId =
  | "basics"
  | "image"
  | "variants"
  | "pricing"
  | "category"
  | "publish"

const TAB_ORDER: Array<{ id: StudioTabId; label: string }> = [
  { id: "basics", label: "Basics" },
  { id: "image", label: "Image" },
  { id: "variants", label: "Variants" },
  { id: "pricing", label: "Pricing" },
  { id: "category", label: "Category" },
  { id: "publish", label: "Publish" },
]

export function StudioCanvas({
  product,
  variants: initialVariants,
  categories,
  fxRate,
}: {
  product: StudioProduct
  variants: StudioVariant[]
  categories: StudioCategory[]
  fxRate: number
}) {
  const handle = useProductPatch(product)
  const [variants, setVariants] = useState<StudioVariant[]>(initialVariants)
  const [tab, setTab] = useState<StudioTabId>("basics")

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
      <Tabs.Root
        value={tab}
        onValueChange={(v: unknown) => setTab(v as StudioTabId)}
      >
        <Tabs.List className="flex items-center border-b overflow-x-auto px-1">
          {TAB_ORDER.map((t) => (
            <Tabs.Tab
              key={t.id}
              value={t.id}
              className={cn(
                "relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors outline-none",
                "data-[selected]:text-foreground text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Tabs.Tab>
          ))}
          <Tabs.Indicator
            className="absolute bottom-0 left-0 h-[2px] bg-primary transition-all"
            style={{
              width: "var(--active-tab-width)",
              transform: "translateX(var(--active-tab-left))",
            }}
          />
        </Tabs.List>

        <Tabs.Panel value="basics" className="p-5 outline-none">
          <TabsBasics handle={handle} />
        </Tabs.Panel>
        <Tabs.Panel value="image" className="p-5 outline-none">
          <TabsImage handle={handle} />
        </Tabs.Panel>
        <Tabs.Panel value="variants" className="p-5 outline-none">
          <TabsVariants
            handle={handle}
            variants={variants}
            setVariants={setVariants}
          />
        </Tabs.Panel>
        <Tabs.Panel value="pricing" className="p-5 outline-none">
          <TabsPricing
            handle={handle}
            variants={variants}
            setVariants={setVariants}
            defaultFxRate={fxRate}
          />
        </Tabs.Panel>
        <Tabs.Panel value="category" className="p-5 outline-none">
          <TabsCategory handle={handle} categories={categories} />
        </Tabs.Panel>
        <Tabs.Panel value="publish" className="p-5 outline-none">
          <TabsPublish handle={handle} variants={variants} />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}
