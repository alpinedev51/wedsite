// Generic offset/limit page envelope shared by every admin list endpoint --
// mirrors service-wed/src/service_wed/schemas/common.py::Page.
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
