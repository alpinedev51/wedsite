// API types shared across features. The request/response types come from
// lib/api.schema.ts, generated from service-wed's OpenAPI schema
// (`npm run gen:api`) -- don't edit that file by hand.
import type { components } from "../lib/api.schema";

export type Schemas = components["schemas"];

// Offset/limit page envelope of every admin list endpoint. Written as a
// generic here because the schema has one copy per item type
// (Page_HouseholdAdminView_, ...), all with this shape.
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export type SuccessResponse = Schemas["SuccessResponse"];
