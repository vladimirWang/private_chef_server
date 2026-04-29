export type SuccessResponse<T> = {
  success: true;
  code: number;
  message: string;
  data: T;
};

export type ErrorResponse<E = unknown> = {
  success: false;
  code: number;
  message: string;
  data: null;
  error?: E;
};

export type ApiResponse<T, E = unknown> = SuccessResponse<T> | ErrorResponse<E>;

export const successResponse = <T>(
  data: T,
  message: string = "success",
  code: number = 200
): SuccessResponse<T> => {
  return {
    success: true,
    code,
    message,
    data,
  };
};

export const errorResponse = <E = unknown>(
  code: number,
  message: string,
  error?: E
): ErrorResponse<E> => {
  return {
    success: false,
    code,
    message,
    data: null,
    ...(error !== undefined ? { error } : {}),
  };
};