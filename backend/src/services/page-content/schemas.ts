import { z } from 'zod';
import { COLLECTIONS, MAX_PAGEDATA_BYTES, MAX_ITEM_JSON_BYTES } from './constants';

export { MAX_PAGEDATA_BYTES, MAX_ITEM_JSON_BYTES };

/**
 * Validates payload byte size when serialized to JSON.
 */
export function checkJsonByteLength(payload: unknown, maxBytes: number): boolean {
  try {
    const json = JSON.stringify(payload);
    return Buffer.byteLength(json, 'utf8') <= maxBytes;
  } catch {
    return false;
  }
}

/**
 * SEO metadata schema for structured page items.
 */
export const ItemSeoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  ogImage: z.string().optional(),
  noindex: z.boolean().optional(),
});
export type ItemSeo = z.infer<typeof ItemSeoSchema>;

/**
 * Loosely typed object schema for legacy card inputs.
 * Enforces that if title-like keys exist, they must be strings.
 */
export const CardInputSchema = z.record(z.unknown()).superRefine((obj, ctx) => {
  const titleKeys = ['title', 'question', 'name', 'heading', 'label'];
  for (const key of titleKeys) {
    if (key in obj && obj[key] !== undefined && obj[key] !== null) {
      if (typeof obj[key] !== 'string') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Card property '${key}' must be a string if provided`,
          path: [key],
        });
      }
    }
  }
});

/**
 * Schema for creating a page item via either explicit fields or legacy card object.
 */
export const ItemInputSchema = z.object({
  collection: z.enum(COLLECTIONS, {
    errorMap: () => ({ message: `collection must be one of: ${COLLECTIONS.join(', ')}` }),
  }),
  title: z.string().min(1, 'Title cannot be empty').optional(),
  slug: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  href: z.string().optional().nullable(),
  badge: z.string().optional().nullable(),
  data: z.record(z.unknown()).optional(),
  detail: z.record(z.unknown()).optional(),
  categories: z.array(z.string()).optional(),
  published: z.boolean().optional(),
  position: z.number().int().optional(),
  card: CardInputSchema.optional(),
})
  .superRefine((val, ctx) => {
    if (!val.title && !val.card) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either title or card must be provided',
        path: ['title'],
      });
    }
    if (!checkJsonByteLength(val, MAX_ITEM_JSON_BYTES)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Item payload exceeds maximum allowed size of ${MAX_ITEM_JSON_BYTES} bytes`,
      });
    }
  });

/**
 * Schema for partially updating an item. `version` is optional and ignored by the server
 * (last write wins); older clients may still send it.
 */
export const ItemPatchSchema = z.object({
  version: z.number({
    invalid_type_error: 'version must be an integer',
  }).int('version must be an integer').optional(),
  collection: z.enum(COLLECTIONS).optional(),
  title: z.string().min(1, 'Title cannot be empty').optional(),
  slug: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  href: z.string().optional().nullable(),
  badge: z.string().optional().nullable(),
  data: z.record(z.unknown()).optional(),
  detail: z.record(z.unknown()).optional(),
  categories: z.array(z.string()).optional(),
  published: z.boolean().optional(),
  position: z.number().int().optional(),
  card: CardInputSchema.optional(),
})
  .superRefine((val, ctx) => {
    if (!checkJsonByteLength(val, MAX_ITEM_JSON_BYTES)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Item payload exceeds maximum allowed size of ${MAX_ITEM_JSON_BYTES} bytes`,
      });
    }
  });

/**
 * Schema for creating a category.
 */
export const CategoryInputSchema = z.object({
  name: z.string({
    required_error: 'Category name is required',
  })
    .trim()
    .min(1, 'Category name cannot be empty')
    .max(100, 'Category name cannot exceed 100 characters'),
});

/**
 * Schema for updating a category.
 */
export const CategoryPatchSchema = z.object({
  name: z.string().trim().min(1, 'Category name cannot be empty').max(100, 'Category name cannot exceed 100 characters').optional(),
  sortOrder: z.number().int('sortOrder must be an integer').optional(),
});

/**
 * Schema for reordering items or categories.
 */
export const ReorderSchema = z.object({
  orderedIds: z.array(z.number().int('IDs must be integers'), {
    required_error: 'orderedIds array is required',
  }).min(1, 'orderedIds must contain at least one ID'),
  collection: z.string().optional(),
});

/**
 * Schema for page settings. Accepts known keys with strict typing and passes unknown keys through.
 */
export const SettingsSchema = z.object({
  hero: z.record(z.unknown()).optional(),
  cta: z.record(z.unknown()).optional(),
  styles: z.record(z.unknown()).optional(),
  partnerLogos: z.array(z.unknown()).optional(),
  sections: z.array(z.unknown()).optional(),
  features: z.array(z.unknown()).optional(),
  hideCta: z.boolean().optional(),
  hideCategories: z.boolean().optional(),
  hideFilter: z.boolean().optional(),
  hideSearch: z.boolean().optional(),
  template: z.string().optional(),
  categories: z.array(z.string()).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  ogImage: z.string().optional(),
  noindex: z.boolean().optional(),
})
  .passthrough()
  .superRefine((val, ctx) => {
    if (!checkJsonByteLength(val, MAX_PAGEDATA_BYTES)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Settings payload exceeds maximum allowed size of ${MAX_PAGEDATA_BYTES} bytes`,
      });
    }
  });

export type ItemInput = z.infer<typeof ItemInputSchema>;
export type ItemPatch = z.infer<typeof ItemPatchSchema>;
export type CategoryInput = z.infer<typeof CategoryInputSchema>;
export type CategoryPatch = z.infer<typeof CategoryPatchSchema>;
export type ReorderInput = z.infer<typeof ReorderSchema>;
export type SettingsInput = z.infer<typeof SettingsSchema>;
