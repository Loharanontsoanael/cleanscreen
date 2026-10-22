import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

/** A Hugeicons icon with the usual stroke, in the text colour. */
export function glyph(icon: IconSvgElement, size = 17, strokeWidth = 1.6) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={strokeWidth} color="currentColor" />;
}
