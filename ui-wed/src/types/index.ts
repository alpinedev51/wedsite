// Generic offset/limit page envelope shared by every admin list endpoint --
// mirrors service-wed/src/service_wed/schemas/common.py::Page.
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// Mirrors schemas/common.py::SuccessResponse -- the generic {success,
// message} shape returned by auth (login/logout) and rsvp (submit) alike.
export interface SuccessResponse {
  success: boolean;
  message?: string | null;
}
