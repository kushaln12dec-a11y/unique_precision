export interface LoginResponse {
  token: string;
  user?: {
    id?: string;
    email?: string;
    role?: string;
    empId?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
  };
}

export interface LoginError {
  message: string;
}
