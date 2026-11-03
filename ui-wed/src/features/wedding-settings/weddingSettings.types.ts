// All datetimes are UTC ISO strings over the wire; the admin form converts
// them to and from venue time with lib/date.ts.
import type { Schemas } from "../../types";

export type WeddingAdminView = Schemas["WeddingAdminView"];
export type WeddingUpsertRequest = Schemas["WeddingUpsertRequest"];
