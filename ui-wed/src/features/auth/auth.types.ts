// Mirrors service-wed/src/service_wed/schemas/auth.py::AdminLoginRequest
// and schemas/common.py::SuccessResponse -- keep these in sync if those
// backend DTOs change shape.
export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface SuccessResponse {
  success: boolean;
  message?: string | null;
}
