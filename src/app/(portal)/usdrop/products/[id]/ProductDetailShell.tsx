"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  EditProductDrawer,
  type ProductEditable,
} from "../_components/EditProductDrawer"

export function ProductDetailShell({
  product,
  categories,
  suppliers,
}: {
  product: ProductEditable
  categories: Array<{ id: string; name: string | null }>
  suppliers: Array<{ id: string; name: string | null }>
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="size-4 mr-1.5" /> Edit
      </Button>
      <EditProductDrawer
        open={open}
        onClose={() => setOpen(false)}
        product={product}
        categories={categories}
        suppliers={suppliers}
      />
    </>
  )
}
