'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const colorCtx = (() => {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  return canvas.getContext("2d");
})();

function toRgb(value: string): string {
  if (!value || value === "transparent") return value;
  if (!colorCtx) return value;
  try {
    colorCtx.fillStyle = value;
    return colorCtx.fillStyle || value;
  } catch {
    return value;
  }
}

function syncComputedStyles(source: Element, target: Element) {
  const srcChildren = Array.from(source.children);
  const tgtChildren = Array.from(target.children);

  const computed = window.getComputedStyle(source);
  const targetEl = target as HTMLElement;

  // Copy all color-related properties and shadows, converting oklch → rgb
  Array.from(computed).forEach((prop) => {
    if (/color|shadow/i.test(prop)) {
      const value = computed.getPropertyValue(prop);
      if (value) {
        targetEl.style.setProperty(prop, toRgb(value));
      }
    }
  });

  for (let i = 0; i < srcChildren.length; i++) {
    const srcChild = srcChildren[i];
    const tgtChild = tgtChildren[i];
    if (srcChild && tgtChild) {
      syncComputedStyles(srcChild, tgtChild);
    }
  }
}

function normalizeColorsDeep(root: Element) {
  const props = [
    "color",
    "backgroundColor",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "outlineColor",
    "textDecorationColor",
    "textShadow",
    "boxShadow",
  ];

  const all = root.querySelectorAll<HTMLElement>("*");
  all.forEach((el) => {
    const style = getComputedStyle(el);
    props.forEach((prop) => {
      const value = style.getPropertyValue(prop);
      if (!value) return;
      if (prop.includes("Shadow")) {
        // Shadow strings may include multiple colors; safest is to drop them
        el.style.setProperty(prop, "none");
      } else {
        el.style.setProperty(prop, toRgb(value));
      }
    });
  });
}

export function ExportPDFButton() {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const gridElement = document.getElementById('playground-grid')
      if (!gridElement) {
        throw new Error('Playground grid not found')
      }

      // Capture as image
      const canvas = await html2canvas(gridElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // Force color-scheme to light to avoid unsupported color spaces
          clonedDoc.documentElement.style.setProperty("color-scheme", "light");
          const clonedGrid = clonedDoc.getElementById('playground-grid')
          if (clonedGrid) {
            syncComputedStyles(gridElement, clonedGrid)
            normalizeColorsDeep(clonedGrid)
          }
        },
      })

      // Calculate dimensions
      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')

      // Add image to PDF (handle multi-page if needed)
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= 297 // A4 height

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= 297
      }

      // Download
      pdf.save(`playground-${Date.now()}.pdf`)
      toast.success('PDF exported successfully')
    } catch (error) {
      console.error('PDF export failed:', error)
      toast.error('Failed to export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button onClick={handleExport} disabled={isExporting}>
      <Download className="size-4 mr-2" />
      {isExporting ? 'Exporting...' : 'Export PDF'}
    </Button>
  )
}
