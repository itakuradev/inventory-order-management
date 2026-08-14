import {
  API_ERROR_CODE,
  DEMO_USER_HEADER,
  type ApiErrorBody,
  type DemoUserKey,
} from '@logimaster/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  searchParams?: Record<string, string | number | undefined>;
};

function buildUrl(path: string, searchParams?: RequestOptions['searchParams']): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * NestJS REST APIへの通信。Demo Userの識別子はここでのみヘッダーへ付与する。
 * 業務ルールの判定はサーバー側が担当するため、ここではエラーの型変換だけを行う。
 */
export async function apiRequest<TResponse>(
  demoUserKey: DemoUserKey,
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const response = await fetch(buildUrl(path, options.searchParams), {
    method: options.method ?? 'GET',
    headers: {
      [DEMO_USER_HEADER]: demoUserKey,
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(response.status, toApiErrorBody(payload));
  }

  return payload as TResponse;
}

function toApiErrorBody(payload: unknown): ApiErrorBody {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'code' in payload &&
    'message' in payload &&
    typeof (payload as ApiErrorBody).message === 'string'
  ) {
    return payload as ApiErrorBody;
  }

  return {
    code: API_ERROR_CODE.INTERNAL_ERROR,
    message: 'サーバーとの通信に失敗しました',
  };
}
