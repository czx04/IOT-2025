const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export type LoginResponse = {
  err: string;
  body: {
    access_token: string;
  };
  message: string;
};

export type AuthUser = {
  device_ids: boolean;
  id: string;
  username: string;
  name: string;
  date_of_birth: string;
  gender: string | null;
  height: number;
  weight: number;
};
export type UserProfileResponse = {
  err: string; 
  body: AuthUser; 
  message: string; 
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

// Health Record Types
export type HealthDataPoint = {
  timestamp: string;
  device_id: string;
  user_id: string;
  heart_rate?: {
    value: number;
    status: 'normal' | 'high' | 'low';
  };
  spo2?: {
    value: number;
    status: 'normal' | 'low';
  };
  temperature?: {
    value: number;
    status: 'normal' | 'high' | 'low';
  };
  blood_pressure?: {
    systolic: number;
    diastolic: number;
    status: 'normal' | 'high' | 'low';
  };
  steps?: {
    count: number;
  };
  calories?: {
    estimated: number;
  };
};

export type HealthRecord = {
  id: string;
  user_id: string;
  device_id: string;
  date: string;
  data: HealthDataPoint[];
  created_at: string;
  updated_at: string;
};

export type HealthRecordResponse = {
  err: string;
  body: HealthRecord;
  message: string;
};

// Daily Summary Types
export type DailySummary = {
  id: string;
  user_id: string;
  date: string;
  heart_rate?: {
    avg: number;
    min: number;
    max: number;
    resting_hr: number;
    measurements: number;
  };
  spo2?: {
    avg: number;
    min: number;
    max: number;
    measurements: number;
  };
  calories?: {
    total: number;
    avg_per_hour: number;
  };
  created_at: string;
  updated_at: string;
};

export type DailySummaryResponse = {
  err: string;
  body: DailySummary;
  message: string;
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
  return payload.body.access_token;
}

export function isProfileIncomplete(user: AuthUser): boolean {
  // Check if profile has default values that need to be updated
  const hasDefaultDateOfBirth = !user.date_of_birth || user.date_of_birth === '0001-01-01' || user.date_of_birth === '';
  const hasDefaultGender = !user.gender || user.gender === '';
  const hasDefaultHeight = user.height === 0;
  const hasDefaultWeight = user.weight === 0;
  
  return hasDefaultDateOfBirth || hasDefaultGender || hasDefaultHeight || hasDefaultWeight;
}

export async function registerAccount(username: string, password: string, name: string) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, name }),
  });

  
  console.log(response);
  const payload = await parseJson<{ message: string } | AuthUser | ErrorResponse>(response);
  console.log(payload);
  if (!response.ok) {
    const message = (payload as ErrorResponse | null)?.message ?? 'Unable to register account. Please try again.';
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
  const response = await fetch(`${API_URL}/user/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const fullPayload = await parseJson<UserProfileResponse | ErrorResponse>(response);

  if (!response.ok) {
    const message =
      (fullPayload as ErrorResponse | null)?.message ?? 'Unable to load user profile. Please sign in.';
    throw new Error(message);
  }
  if (!isUserProfileResponse(fullPayload)) { 
      throw new Error('User profile response is invalid or missing body data.');
  }

  const userPayload = (fullPayload as UserProfileResponse).body;

  // ⭐️ CHỈNH SỬA 2: Kiểm tra tính hợp lệ của dữ liệu người dùng LẤY TỪ body
  if (!isAuthUser(userPayload)) { 
    throw new Error('User profile data inside body is invalid.');
  }
  
  // ⭐️ CHỈNH SỬA 3: Trả về phần body chứa AuthUser
  return userPayload;
}

export async function updateUserProfile(token: string, userData: AuthUser): Promise<string> {
  const response = await fetch(`${API_URL}/user/${userData.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: userData.name,
      date_of_birth: userData.date_of_birth,
      gender: userData.gender,
      height: userData.height,
      weight: userData.weight,
    }),
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

export async function getHealthRecord(token: string, date?: string): Promise<HealthRecord> {
  const queryParams = new URLSearchParams();
  
  if (date) {
    queryParams.append('date', date);
  }

  const url = `${API_URL}/health-record${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await parseJson<HealthRecordResponse | ErrorResponse>(response);

  if (!response.ok) {
    const message =
      (payload as ErrorResponse | null)?.message ?? 'Không thể tải dữ liệu sức khỏe.';
    throw new Error(message);
  }

  if (!isHealthRecordResponse(payload)) {
    throw new Error('Health record response is invalid.');
  }

  return payload.body;
}

export async function getDailySummary(token: string, date?: string): Promise<DailySummary> {
  const queryParams = new URLSearchParams();
  
  if (date) {
    queryParams.append('date', date);
  }

  const url = `${API_URL}/summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await parseJson<DailySummaryResponse | ErrorResponse>(response);

  if (!response.ok) {
    const message =
      (payload as ErrorResponse | null)?.message ?? 'Không thể tải tổng kết trong ngày.';
    throw new Error(message);
  }

  if (!isDailySummaryResponse(payload)) {
    throw new Error('Daily summary response is invalid.');
  }

  return payload.body;
}

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function isLoginResponse(payload: unknown): payload is LoginResponse {
  return Boolean(payload && typeof (payload as LoginResponse).body.access_token === 'string');
}
function isUserProfileResponse(payload: unknown): payload is UserProfileResponse {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as UserProfileResponse;
  return (
    typeof candidate.err === 'string' &&
    typeof candidate.message === 'string' &&
    isAuthUser(candidate.body)
  );
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

function isHealthRecordResponse(payload: unknown): payload is HealthRecordResponse {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as HealthRecordResponse;
  return (
    typeof candidate.err === 'string' &&
    typeof candidate.message === 'string' &&
    candidate.body &&
    typeof candidate.body === 'object' &&
    typeof candidate.body.id === 'string' &&
    typeof candidate.body.user_id === 'string' &&
    typeof candidate.body.device_id === 'string' &&
    typeof candidate.body.date === 'string' &&
    Array.isArray(candidate.body.data)
  );
}

function isDailySummaryResponse(payload: unknown): payload is DailySummaryResponse {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as DailySummaryResponse;
  return (
    typeof candidate.err === 'string' &&
    typeof candidate.message === 'string' &&
    candidate.body &&
    typeof candidate.body === 'object' &&
    typeof candidate.body.id === 'string' &&
    typeof candidate.body.user_id === 'string' &&
    typeof candidate.body.date === 'string'
  );
}

export { API_URL };

