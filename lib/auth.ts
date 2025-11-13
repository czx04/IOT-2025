const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type LoginResponse = {
  access_token: string;
};

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  height: number;
  weight: number;
};

export type LatestData = {
  hr: number;
  spo2: number;
  timestamp: string;
};

export type Measurement = {
  id: number;
  hr: number;
  spo2: number;
  timestamp: string;
};

export type GetMeasurementsParams = {
  start_date?: string;
  end_date?: string;
  limit?: number;
};

type ErrorResponse = {
  message?: string;
};

export async function login(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const payload = await parseJson<LoginResponse | ErrorResponse>(response);

  if (!response.ok) {
    const message = (payload as ErrorResponse | null)?.message ?? 'Invalid username or password.';
    throw new Error(message);
  }

  if (!isLoginResponse(payload)) {
    throw new Error('Login response missing access token.');
  }

  return payload.access_token;
}

export async function registerAccount(username: string, password: string, name: string) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, name }),
  });

  const payload = await parseJson<{ message: string } | AuthUser | ErrorResponse>(response);

  if (!response.ok) {
    const message = (payload as ErrorResponse | null)?.message ?? 'Unable to register account.';
    throw new Error(message);
  }

  if (payload && typeof (payload as { message: string }).message === 'string') {
    return (payload as { message: string }).message;
  }

  if (isAuthUser(payload)) {
    return ``;
  }

  throw new Error('Register response is invalid.');
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/users/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await parseJson<AuthUser | ErrorResponse>(response);

  if (!response.ok) {
    const message =
      (payload as ErrorResponse | null)?.message ?? 'Unable to load user profile. Please sign in.';
    throw new Error(message);
  }

  if (!isAuthUser(payload)) {
    throw new Error('User profile response is invalid.');
  }

  return payload;
}

export async function updateUserProfile(token: string, userData: AuthUser): Promise<string> {
  const response = await fetch(`${API_URL}/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });

  const payload = await parseJson<{ message: string } | ErrorResponse>(response);

  if (!response.ok) {
    const message =
      (payload as ErrorResponse | null)?.message ?? 'Unable to update profile. Please try again.';
    throw new Error(message);
  }

  if (payload && typeof (payload as { message: string }).message === 'string') {
    return (payload as { message: string }).message;
  }

  throw new Error('Update response is invalid.');
}

export async function getLatestData(token: string): Promise<LatestData> {
  const response = await fetch(`${API_URL}/data/latest`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await parseJson<LatestData | ErrorResponse>(response);

  if (!response.ok) {
    const message =
      (payload as ErrorResponse | null)?.message ?? 'Không tìm thấy dữ liệu đo.';
    throw new Error(message);
  }

  if (!isLatestData(payload)) {
    throw new Error('Latest data response is invalid.');
  }

  return payload;
}

export async function getMeasurements(
  token: string,
  params?: GetMeasurementsParams
): Promise<Measurement[]> {
  const queryParams = new URLSearchParams();
  
  if (params?.start_date) {
    queryParams.append('start_date', params.start_date);
  }
  if (params?.end_date) {
    queryParams.append('end_date', params.end_date);
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  const url = `${API_URL}/data/measurements${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await parseJson<Measurement[] | ErrorResponse>(response);

  if (!response.ok) {
    const message =
      (payload as ErrorResponse | null)?.message ?? 'Không thể tải danh sách đo.';
    throw new Error(message);
  }

  if (!Array.isArray(payload)) {
    throw new Error('Measurements response is invalid.');
  }

  // Validate each measurement
  for (const item of payload) {
    if (!isMeasurement(item)) {
      throw new Error('Measurements response contains invalid item.');
    }
  }

  return payload;
}

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function isLoginResponse(payload: unknown): payload is LoginResponse {
  return Boolean(payload && typeof (payload as LoginResponse).access_token === 'string');
}

function isAuthUser(payload: unknown): payload is AuthUser {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as AuthUser;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.username === 'string' &&
    typeof candidate.name === 'string' &&
    (typeof candidate.date_of_birth === 'string' || candidate.date_of_birth === null) &&
    (typeof candidate.gender === 'string' || candidate.gender === null) &&
    typeof candidate.height === 'number' &&
    typeof candidate.weight === 'number'
  );
}

function isLatestData(payload: unknown): payload is LatestData {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as LatestData;
  return (
    typeof candidate.hr === 'number' &&
    typeof candidate.spo2 === 'number' &&
    typeof candidate.timestamp === 'string'
  );
}

function isMeasurement(payload: unknown): payload is Measurement {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as Measurement;
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.hr === 'number' &&
    typeof candidate.spo2 === 'number' &&
    typeof candidate.timestamp === 'string'
  );
}

export { API_URL };

