import { SolutionsTaxonomy } from './types/solutions-card.types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: SolutionsTaxonomy;
}

export function validateTaxonomyPayload(input: unknown): ValidationResult {
  if (!input) {
    return { valid: false, error: 'Taxonomy payload is empty or null' };
  }

  let parsed: any = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      return { valid: false, error: 'Taxonomy payload is not valid JSON string' };
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, error: 'Taxonomy must be an object with categories and institutions' };
  }

  // Validate categories
  if (!Array.isArray(parsed.categories)) {
    return { valid: false, error: 'Taxonomy "categories" must be an array' };
  }

  const REQUIRED_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const presentCodes = new Set<string>();
  const presentCategoryIds = new Set<string>();

  for (let i = 0; i < parsed.categories.length; i++) {
    const cat = parsed.categories[i];
    if (!cat || typeof cat !== 'object') {
      return { valid: false, error: `Category at index ${i} must be an object` };
    }
    if (typeof cat.id !== 'string' || cat.id.trim().length === 0) {
      return { valid: false, error: `Category at index ${i} missing valid "id" string` };
    }
    if (typeof cat.label !== 'string' || cat.label.trim().length === 0) {
      return { valid: false, error: `Category at index ${i} missing valid "label" string` };
    }
    if (typeof cat.letterCode !== 'string' || cat.letterCode.trim().length === 0) {
      return { valid: false, error: `Category at index ${i} missing valid "letterCode" (A-J)` };
    }

    const code = cat.letterCode.trim().toUpperCase();
    const id = cat.id.trim();

    if (presentCodes.has(code)) {
      return { valid: false, error: `Duplicate category letterCode "${code}" at index ${i}` };
    }
    if (presentCategoryIds.has(id)) {
      return { valid: false, error: `Duplicate category id "${id}" at index ${i}` };
    }

    presentCodes.add(code);
    presentCategoryIds.add(id);
  }

  for (const requiredLetter of REQUIRED_LETTERS) {
    if (!presentCodes.has(requiredLetter)) {
      return { valid: false, error: `Taxonomy must preserve all 10 standard categories. Missing letterCode: "${requiredLetter}".` };
    }
  }

  // Validate institutions
  if (!Array.isArray(parsed.institutions)) {
    return { valid: false, error: 'Taxonomy "institutions" must be an array' };
  }

  const presentInstIds = new Set<string>();

  for (let i = 0; i < parsed.institutions.length; i++) {
    const inst = parsed.institutions[i];
    if (!inst || typeof inst !== 'object') {
      return { valid: false, error: `Institution at index ${i} must be an object` };
    }
    if (typeof inst.id !== 'string' || inst.id.trim().length === 0) {
      return { valid: false, error: `Institution at index ${i} missing valid "id" string` };
    }
    if (typeof inst.label !== 'string' || inst.label.trim().length === 0) {
      return { valid: false, error: `Institution at index ${i} missing valid "label" string` };
    }

    const id = inst.id.trim();
    if (presentInstIds.has(id)) {
      return { valid: false, error: `Duplicate institution id "${id}" at index ${i}` };
    }
    presentInstIds.add(id);
  }

  return {
    valid: true,
    data: {
      categories: parsed.categories.map((c: any) => ({
        id: c.id.trim(),
        label: c.label.trim(),
        shortLabel: typeof c.shortLabel === 'string' ? c.shortLabel.trim() : c.label.trim(),
        letterCode: c.letterCode.trim().toUpperCase(),
        iconName: typeof c.iconName === 'string' ? c.iconName.trim() : undefined,
        subcategories: Array.isArray(c.subcategories) ? c.subcategories.map((s: any) => String(s).trim()) : [],
      })),
      institutions: parsed.institutions.map((inst: any) => ({
        id: inst.id.trim(),
        label: inst.label.trim(),
        shortLabel: typeof inst.shortLabel === 'string' ? inst.shortLabel.trim() : inst.label.trim(),
      })),
      popularSearchPrompts: Array.isArray(parsed.popularSearchPrompts)
        ? parsed.popularSearchPrompts.map((p: any) => String(p).trim())
        : [],
    },
  };
}
