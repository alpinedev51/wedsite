// Mirrors service-wed/src/service_wed/schemas/auth.py::AdminLoginRequest --
// keep in sync if that backend DTO changes shape. SuccessResponse lives in
// src/types (shared with rsvp.types.ts) and is re-exported here so existing
// imports of it from this file still work.
export type { SuccessResponse } from "../../types";

export interface AdminLoginRequest {
  email: string;
  password: string;
}
