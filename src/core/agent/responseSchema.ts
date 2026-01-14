import { z } from "zod";

export const ProductCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  priceInr: z.number(),
  highlights: z.array(z.string()).default([])
});

export const ComparisonRowSchema = z.object({
  label: z.string(),
  values: z.array(z.string())
});

export const ComparisonViewSchema = z.object({
  productIds: z.array(z.string()),
  headers: z.array(z.string()),
  rows: z.array(ComparisonRowSchema)
});

export const ChatResponseSchema = z.object({
  mode: z.enum(["recommend", "compare", "explain", "clarify", "refuse"]),
  message: z.string(),
  products: z.array(ProductCardSchema).optional(),
  comparison: ComparisonViewSchema.optional(),
  usedCatalogIds: z.array(z.string()).optional()
});

export type ChatResponseValidated = z.infer<typeof ChatResponseSchema>;
