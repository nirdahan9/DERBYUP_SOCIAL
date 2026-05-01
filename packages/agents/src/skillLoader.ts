import { readFile } from "node:fs/promises";

export type SkillFrontmatterValue = string | string[] | Record<string, string | string[]>;

export interface LoadedSkill {
  id: string;
  title: string;
  description: string;
  capabilities: string[];
  content: string;
  version?: string;
  frontmatter: Record<string, SkillFrontmatterValue>;
}

export async function loadSkill(path: string): Promise<LoadedSkill> {
  const raw = await readFile(path, "utf8");
  const { frontmatter, body } = parseSkillMarkdown(raw);

  return {
    id: stringValue(frontmatter.name, stringValue(frontmatter.id, path)),
    title: stringValue(frontmatter.title, stringValue(frontmatter.name, stringValue(frontmatter.id, path))),
    description: stringValue(frontmatter.description, ""),
    capabilities: arrayValue(frontmatter.capabilities),
    content: body.trim(),
    version: nestedStringValue(frontmatter.metadata, "version"),
    frontmatter
  };
}

export function parseSkillMarkdown(raw: string): { frontmatter: Record<string, SkillFrontmatterValue>; body: string } {
  if (!raw.startsWith("---\n")) {
    return { frontmatter: {}, body: raw };
  }

  const end = raw.indexOf("\n---", 4);
  if (end === -1) {
    return { frontmatter: {}, body: raw };
  }

  const frontmatterText = raw.slice(4, end).trim();
  const body = raw.slice(end + 4);
  const frontmatter: Record<string, SkillFrontmatterValue> = {};
  let currentArrayKey: string | undefined;
  let currentObjectKey: string | undefined;

  for (const line of frontmatterText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const indentation = line.match(/^\s*/)?.[0].length ?? 0;

    if (trimmed.startsWith("- ") && currentArrayKey) {
      const existing = arrayValue(frontmatter[currentArrayKey]);
      existing.push(trimmed.slice(2).trim());
      frontmatter[currentArrayKey] = existing;
      continue;
    }

    if (indentation > 0 && currentObjectKey) {
      const nestedSeparator = trimmed.indexOf(":");
      if (nestedSeparator === -1) continue;
      const nestedKey = trimmed.slice(0, nestedSeparator).trim();
      const nestedValue = trimmed.slice(nestedSeparator + 1).trim();
      const existing = objectValue(frontmatter[currentObjectKey]);
      existing[nestedKey] = parseScalarOrArray(nestedValue);
      frontmatter[currentObjectKey] = existing;
      continue;
    }

    const separator = trimmed.indexOf(":");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    currentArrayKey = undefined;
    currentObjectKey = undefined;

    if (value === "") {
      frontmatter[key] = {};
      currentArrayKey = key;
      currentObjectKey = key;
    } else {
      frontmatter[key] = parseScalarOrArray(value);
    }
  }

  return { frontmatter, body };
}

function stringValue(value: SkillFrontmatterValue | undefined, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function nestedStringValue(value: SkillFrontmatterValue | undefined, key: string): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const nested = value[key];
  return typeof nested === "string" ? nested : undefined;
}

function arrayValue(value: SkillFrontmatterValue | undefined): string[] {
  if (Array.isArray(value)) return [...value];
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}

function objectValue(value: SkillFrontmatterValue | undefined): Record<string, string | string[]> {
  if (value && typeof value === "object" && !Array.isArray(value)) return { ...value };
  return {};
}

function parseScalarOrArray(value: string): string | string[] {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }

  return value.replace(/^["']|["']$/g, "");
}
