/**
 * RFC-7807 ProblemDetails as produced by StreetBiz-BE's GlobalExceptionHandler.
 * `type` carries the backend's error code (validation_error, conflict, ...) and
 * `errors` is only present on validation failures.
 */
export type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
  retryAfterSeconds?: number;
};

export type ApiErrorCode =
  | 'validation_error'
  | 'conflict'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'domain_rule'
  | 'otp_cooldown'
  | 'bad_request'
  | 'server_error'
  | 'network_error';

const FALLBACK_MESSAGES: Record<ApiErrorCode, string> = {
  validation_error: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
  conflict: 'Thao tác không thực hiện được do trùng lặp hoặc đã thay đổi trạng thái.',
  unauthorized: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  forbidden: 'Bạn không có quyền thực hiện thao tác này.',
  not_found: 'Không tìm thấy dữ liệu.',
  domain_rule: 'Thao tác không hợp lệ theo quy định.',
  otp_cooldown: 'Vui lòng chờ trước khi yêu cầu mã xác thực mới.',
  bad_request: 'Yêu cầu không hợp lệ.',
  server_error: 'Hệ thống đang bận. Vui lòng thử lại sau.',
  network_error: 'Không kết nối được máy chủ. Kiểm tra kết nối mạng và thử lại.',
};

/**
 * Vietnamese copies of the backend's user-facing messages (AppMessages,
 * RegMessages, validator messages). The API speaks English; the UI must not.
 * Unknown messages fall through unchanged rather than being hidden.
 */
const BACKEND_MESSAGES: Record<string, string> = {
  'A verification code has been sent to your phone number.': 'Mã xác thực đã được gửi tới số điện thoại của bạn.',
  'The verification code is incorrect. Please try again.': 'Mã xác thực không đúng. Vui lòng thử lại.',
  'The verification code has expired. Please request a new one.': 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.',
  'Too many failed verification attempts. Please try again later.': 'Nhập sai mã quá nhiều lần. Vui lòng yêu cầu mã mới và thử lại sau.',
  'Please wait before requesting another verification code.': 'Vui lòng chờ trước khi yêu cầu mã xác thực mới.',
  'Your session has expired. Please sign in again.': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'You do not have permission to access this resource.': 'Bạn không có quyền thực hiện thao tác này.',
  'Invalid phone number or password.': 'Số điện thoại hoặc mật khẩu không đúng.',
  'This phone number is already registered. Please sign in instead.': 'Số điện thoại này đã được đăng ký. Vui lòng đăng nhập.',
  'You cannot revoke the session you are currently using. Use Sign Out instead.': 'Không thể đăng xuất phiên đang dùng. Hãy dùng chức năng Đăng xuất.',
  'The current password you entered is incorrect.': 'Mật khẩu hiện tại không đúng.',
  'This account is suspended. Please contact support.': 'Tài khoản đã bị tạm khoá. Vui lòng liên hệ hỗ trợ.',
  'Please select a valid ward.': 'Vui lòng chọn phường/xã hợp lệ.',
  'Please enter a valid phone number.': 'Số điện thoại phải gồm 10 số, bắt đầu bằng 0.',
  'Password is required.': 'Vui lòng nhập mật khẩu.',
  'Password must be at least 8 characters and include upper, lower, number and special characters.':
    'Mật khẩu cần tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.',
  'The new password does not meet the security requirements.': 'Mật khẩu mới chưa đạt yêu cầu bảo mật.',
  'The new password must be different from the current password.': 'Mật khẩu mới phải khác mật khẩu hiện tại.',
  'Your current password is required.': 'Vui lòng nhập mật khẩu hiện tại.',
  'The verification code must be 6 digits.': 'Mã xác thực gồm 6 chữ số.',
  'You can only register as a Customer or Vendor.': 'Chỉ có thể đăng ký vai trò Người mua hoặc Hộ kinh doanh.',
  'Please select a vendor type before continuing.': 'Vui lòng chọn loại hình kinh doanh.',
  'You already have a registration under review. Please wait for a decision or withdraw it first.':
    'Bạn đang có một hồ sơ chờ xét duyệt. Vui lòng chờ kết quả hoặc rút hồ sơ đó trước.',
  'A fixed-storefront registration requires a business address.': 'Cửa hàng cố định cần nhập địa chỉ kinh doanh.',
  'Please upload a valid identity or business-licence document.': 'Vui lòng tải lên giấy tờ tuỳ thân hoặc giấy phép kinh doanh hợp lệ.',
  'Please upload a JPG, PNG, WEBP or PDF file.': 'Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc file PDF.',
  'The file must be 5 MB or smaller.': 'Dung lượng file tối đa 5 MB.',
  'Your registration has been withdrawn.': 'Đã rút hồ sơ đăng ký.',
  'This registration cannot be withdrawn while it has an active rental contract.':
    'Không thể rút hồ sơ khi đang có hợp đồng thuê ô vỉa hè hiệu lực.',
  'Only vendor accounts can manage business registrations.': 'Chỉ tài khoản Hộ kinh doanh mới quản lý được hồ sơ đăng ký.',
  'Business registration not found.': 'Không tìm thấy hồ sơ đăng ký.',
  'Business/display name is required.': 'Vui lòng nhập tên hộ kinh doanh.',
  'Session not found.': 'Không tìm thấy phiên đăng nhập.',
};

const STATUS_WORDS: Record<string, string> = {
  APPROVED: 'đã được duyệt',
  REJECTED: 'đã bị từ chối',
  WITHDRAWN: 'đã được rút',
  UNDER_REVIEW: 'đang được xét duyệt',
};

export function translateBackendMessage(message: string): string {
  const known = BACKEND_MESSAGES[message];
  if (known) return known;

  // RegMessages.NotEditable: "This registration can no longer be edited because it is {0}."
  const notEditable = /^This registration can no longer be edited because it is (\w+)\.$/.exec(message);
  if (notEditable) {
    const status = notEditable[1]!;
    return `Hồ sơ không thể chỉnh sửa vì ${STATUS_WORDS[status] ?? status}.`;
  }

  return message;
}

/** Normalized error every API call rejects with, so screens never touch axios types. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  /** Field name (as sent by the backend) -> messages, for validation failures. */
  readonly fieldErrors: Record<string, string[]>;
  /** Seconds until the request may be retried (429 OTP cooldown). */
  readonly retryAfterSeconds?: number;

  constructor(
    code: ApiErrorCode,
    status: number,
    message: string,
    fieldErrors: Record<string, string[]> = {},
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  /**
   * First message for a backend field name. The backend uses PascalCase
   * (FluentValidation property names), so lookups are case-insensitive.
   */
  fieldError(field: string): string | undefined {
    const key = Object.keys(this.fieldErrors).find(
      (k) => k.toLowerCase() === field.toLowerCase(),
    );
    return key ? this.fieldErrors[key]?.[0] : undefined;
  }

  get isValidation(): boolean {
    return this.code === 'validation_error';
  }
}

function codeFromStatus(status: number): ApiErrorCode {
  if (status === 400) return 'validation_error';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 413) return 'bad_request';
  if (status === 422) return 'domain_rule';
  if (status === 429) return 'otp_cooldown';
  return 'server_error';
}

const KNOWN_CODES = new Set<string>(Object.keys(FALLBACK_MESSAGES));

/** Builds an ApiError from a ProblemDetails body (or from a transport failure). */
export function toApiError(status: number | undefined, body: unknown): ApiError {
  if (status === undefined) {
    return new ApiError('network_error', 0, FALLBACK_MESSAGES.network_error);
  }

  const problem = (typeof body === 'object' && body !== null ? body : {}) as ProblemDetails;
  const code =
    problem.type && KNOWN_CODES.has(problem.type)
      ? (problem.type as ApiErrorCode)
      : codeFromStatus(status);

  const fieldErrors = Object.fromEntries(
    Object.entries(problem.errors ?? {}).map(([field, messages]) => [
      field,
      messages.map(translateBackendMessage),
    ]),
  );

  // For AppExceptions the backend puts the human message in `detail`; for
  // validation failures `detail` is absent, so prefer the first field message.
  const message = problem.detail
    ? translateBackendMessage(problem.detail)
    : (Object.values(fieldErrors)[0]?.[0] ?? FALLBACK_MESSAGES[code]);

  return new ApiError(code, status, message, fieldErrors, problem.retryAfterSeconds);
}

/**
 * True when a 401 came from the JWT middleware (missing, expired or revoked
 * token), as opposed to a handler rejecting the request. Only the former is
 * worth a refresh-and-retry; the middleware answers with an empty body.
 */
export function isTokenFailure(status: number | undefined, body: unknown): boolean {
  if (status !== 401) return false;
  if (body === undefined || body === null) return true;
  return typeof body === 'string' && body.trim() === '';
}

/** Safe message extraction for any thrown value, for use in catch blocks. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return FALLBACK_MESSAGES.server_error;
}
