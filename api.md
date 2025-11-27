# Tài liệu API - Hệ thống IoT Giám sát Sức khỏe

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Xác thực (Authentication)](#xác-thực-authentication)
- [API Endpoints](#api-endpoints)
  - [Auth APIs](#auth-apis)
  - [User APIs](#user-apis)
  - [Device APIs](#device-apis)
  - [Health Record APIs](#health-record-apis)
  - [Alert APIs](#alert-apis)
  - [WebSocket APIs](#websocket-apis)
- [Models](#models)
- [Error Handling](#error-handling)
- [Batch Processing](#batch-processing)

---

## Tổng quan

Hệ thống IoT giám sát sức khỏe được xây dựng bằng **Go** với **Gin framework** cho REST API và **Uber Fx** để quản lý dependency injection. Hệ thống sử dụng:

- **MongoDB**: Lưu trữ dữ liệu người dùng, thiết bị, hồ sơ sức khỏe và cảnh báo
- **Redis**: Pub/Sub cho real-time data streaming và batch processing
- **WebSocket**: Kết nối real-time giữa thiết bị IoT, server và ứng dụng người dùng
- **JWT**: Xác thực và phân quyền người dùng

### Các tính năng chính:

- ✅ Đăng ký/Đăng nhập người dùng với JWT authentication
- ✅ Quản lý thiết bị IoT (đăng ký, liên kết, hủy liên kết)
- ✅ Thu thập dữ liệu sức khỏe real-time từ thiết bị (nhịp tim, SpO2, nhiệt độ, huyết áp, bước chân)
- ✅ Lưu trữ và truy vấn dữ liệu sức khỏe theo ngày
- ✅ Batch processing mỗi 5 phút để lưu dữ liệu vào MongoDB
- ✅ Tính toán tự động daily summary (trung bình, min, max, calories)
- ✅ Hệ thống cảnh báo tự động khi phát hiện chỉ số bất thường
- ✅ WebSocket real-time cho thiết bị và người dùng
- ✅ Redis Pub/Sub cho data streaming

---

## Cấu trúc dự án

```
iot-2025/
├── main.go                           # Entry point của ứng dụng
├── docker-compose.yml                 # Docker compose cho MongoDB & Redis
├── src/
│   ├── bootstrap/                    # Khởi tạo dependencies và server
│   │   ├── controllers.go            # Đăng ký controllers và middlewares
│   │   ├── provider.go               # Đăng ký crypto providers (Hash, JWT)
│   │   ├── server.go                 # Cấu hình HTTP server, WebSocket Hub, Batch processor
│   │   ├── services.go               # Đăng ký business services
│   │   └── storages.go               # Đăng ký MongoDB, Redis, repositories
│   │
│   ├── common/                       # Shared utilities
│   │   ├── configs/                  # Configuration management
│   │   │   └── config.go             # Load config từ environment variables
│   │   ├── crypto/                   # Cryptography utilities
│   │   │   ├── hash.go               # Bcrypt password hashing
│   │   │   └── jwt.go                # JWT token generation & verification
│   │   ├── fault/                    # Error handling
│   │   │   └── err.go                # Custom error types với status codes
│   │   ├── log/                      # Logging utilities
│   │   │   ├── logger.go             # Zap logger configuration
│   │   │   └── global.go             # Global logger functions
│   │   └── ws/                       # WebSocket utilities
│   │       ├── client.go             # WebSocket client
│   │       └── hub.go                # WebSocket hub (quản lý connections)
│   │
│   ├── core/                         # Business logic layer
│   │   ├── model/                    # Domain models
│   │   │   ├── user_model.go         # User entity
│   │   │   ├── device_model.go       # Device entity
│   │   │   ├── heath_record_model.go # Health data với array of records
│   │   │   ├── daily_summary_model.go # Daily aggregated summary
│   │   │   └── alert_model.go        # Alert/notification entity
│   │   │
│   │   └── service/                  # Business services
│   │       ├── auth_service.go       # Authentication & authorization
│   │       ├── user_service.go       # User management
│   │       ├── device_service.go     # Device management
│   │       ├── health_service.go     # Health data processing
│   │       ├── health_batch_service.go # Batch processing every 5 minutes
│   │       └── alert_service.go      # Alert management
│   │
│   ├── infrastructure/               # Infrastructure layer
│   │   ├── cache/                    # Redis cache & pub/sub
│   │   │   ├── redis.go              # Redis client setup
│   │   │   └── health_pubsub.go      # Pub/Sub cho health data streaming
│   │   │
│   │   └── repository/               # Data access layer (MongoDB)
│   │       ├── user_repository.go
│   │       ├── device_repository.go
│   │       ├── health_record_repository.go
│   │       ├── daily_summary_repository.go
│   │       └── alert_repository.go
│   │
│   └── present/                      # Presentation layer
│       ├── controller/               # HTTP controllers
│       │   ├── base_controller.go    # Base controller với response helpers
│       │   ├── auth_controller.go    # Auth endpoints
│       │   ├── user_controller.go    # User endpoints
│       │   ├── device_controller.go  # Device endpoints
│       │   ├── health_controller.go  # Health data endpoints
│       │   ├── alert_controller.go   # Alert endpoints
│       │   └── ws_controller.go      # WebSocket endpoints
│       │
│       ├── middleware/               # HTTP middlewares
│       │   ├── auth.go               # JWT authentication middleware
│       │   └── log.go                # Request logging middleware
│       │
│       ├── request/                  # Request DTOs
│       │   └── request.go            # Request structures
│       │
│       ├── response/                 # Response DTOs
│       │   └── response.go           # Response structures
│       │
│       └── router/                   # Route definitions
│           └── router.go             # Đăng ký tất cả routes
```

---

## Kiến trúc hệ thống

### Luồng dữ liệu Real-time:

```
┌─────────────┐         WebSocket          ┌──────────────┐
│   ESP32     │───────────────────────────→│   Backend    │
│  (Device)   │    {bpm: 75, spo2: 98}     │   Go Server  │
└─────────────┘                             └──────┬───────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    │              │              │
                              Publish to      Store in      Check thresholds
                              Redis PubSub    Batch Queue   → Create Alerts
                                    │              │              │
                              ┌─────▼─────┐  ┌────▼─────┐  ┌─────▼────┐
                              │   Redis   │  │  Redis   │  │ MongoDB  │
                              │ Channel:  │  │  Batch:  │  │  Alerts  │
                              │device:XXX │  │device:XXX│  └──────────┘
                              └─────┬─────┘  └────┬─────┘
                                    │              │
                              Subscribe       Every 5 min
                              to channels     Batch Save
                                    │              │
                              ┌─────▼─────┐  ┌────▼─────────┐
                              │   User    │  │   MongoDB    │
                              │WebSocket  │  │HealthRecords │
                              │  Client   │  └──────────────┘
                              └───────────┘
```

### Batch Processing Flow:

```
┌─────────────────────────────────────────────────────────────┐
│              Batch Processor (Every 5 minutes)              │
└────────────────────────────┬────────────────────────────────┘
                             │
                    1. Get active devices
                    2. For each device:
                             │
                    ┌────────▼────────┐
                    │ Get batch data  │
                    │   from Redis    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────────┐
                    │ Process each record │
                    │  - Save to MongoDB  │
                    │  - Check alerts     │
                    │  - Update summary   │
                    └────────┬────────────┘
                             │
                    ┌────────▼────────┐
                    │ Clear batch     │
                    │   from Redis    │
                    └─────────────────┘
```

---

## Xác thực (Authentication)

Hệ thống sử dụng **JWT (JSON Web Token)** để xác thực người dùng.

### Flow đăng nhập:

1. Client gửi `username` và `password` đến `/api/v1/auth/login`
2. Server xác thực thông tin và tạo JWT access token
3. Client lưu token và gửi kèm trong header `Authorization: Bearer <token>` cho các request sau

### Protected Routes:

Tất cả các endpoint (trừ Auth APIs) đều yêu cầu JWT token trong header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Middleware `AuthMiddleware.RequireAuth()` sẽ:

- Verify JWT token
- Lấy thông tin user từ database
- Gắn user vào context để controllers sử dụng

---

## API Endpoints

### Base URL

```
http://localhost:8080/api/v1
```

---

## Auth APIs

### 1. Đăng ký tài khoản

**POST** `/auth/register`

Tạo tài khoản người dùng mới.

**Request Body:**

```json
{
  "username": "john_doe",
  "password": "secure_password",
  "name": "John Doe"
}
```

**Response (200):**

```json
{
  "message": "user registered successfully"
}
```

**Validation:**

- `username`: required
- `password`: required (sẽ được hash bằng bcrypt)
- `name`: required

**Errors:**

- `400 BAD_REQUEST`: Missing hoặc invalid fields
- `409 DUPLICATE`: Username đã tồn tại

---

### 2. Đăng nhập

**POST** `/auth/login`

Đăng nhập và nhận JWT access token.

**Request Body:**

```json
{
  "username": "john_doe",
  "password": "secure_password"
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**

- `400 BAD_REQUEST`: Missing fields
- `401 UNAUTHORIZED`: Sai username hoặc password

---

### 3. Refresh Token

**POST** `/auth/refresh`

Làm mới access token từ refresh token (nếu hết hạn).

**Request Body:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**

- `401 UNAUTHORIZED`: Token không hợp lệ

---

## User APIs

### 1. Lấy thông tin cá nhân

**GET** `/user/me`

Lấy thông tin người dùng hiện tại (từ JWT token).

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "id": "673c5f8e9b1234567890abcd",
  "username": "john_doe",
  "name": "John Doe",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "height": 175.5,
  "weight": 70.2,
  "device_ids": ["ESP32_001", "ESP32_002"]
}
```

**Errors:**

- `401 UNAUTHORIZED`: Token không hợp lệ hoặc hết hạn

---

### 2. Lấy thông tin user theo ID

**GET** `/user/:id`

Lấy thông tin user khác theo ID (có thể dùng để admin xem).

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "id": "673c5f8e9b1234567890abcd",
  "username": "jane_smith",
  "name": "Jane Smith",
  "date_of_birth": "1995-08-22",
  "gender": "female",
  "height": 165.0,
  "weight": 58.5,
  "device_ids": []
}
```

**Errors:**

- `401 UNAUTHORIZED`: Token không hợp lệ
- `404 NOT_FOUND`: User không tồn tại

---

### 3. Cập nhật thông tin cá nhân

**PUT** `/user/:id`

Cập nhật thông tin profile của user.

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "John Doe Updated",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "height": 176.0,
  "weight": 72.5
}
```

**Response (200):**

```json
{
  "message": "profile updated successfully"
}
```

**Validation:**

- `name`: required
- `date_of_birth`: required, format `YYYY-MM-DD`
- `gender`: required, oneof: `male`, `female`, `other`
- `height`: required (cm)
- `weight`: required (kg)

**Errors:**

- `400 BAD_REQUEST`: Invalid fields
- `401 UNAUTHORIZED`: Token không hợp lệ

---

## Device APIs

### 1. Đăng ký thiết bị mới

**POST** `/device`

Tạo thiết bị IoT mới trong hệ thống (chưa liên kết với user).

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "device_id": "ESP32_001",
  "device_name": "Smart Watch Pro",
  "device_type": "smartwatch",
  "manufacturer": "XYZ Corp"
}
```

**Response (200):**

```json
{
  "message": "device created successfully"
}
```

**Validation:**

- `device_id`: required, unique identifier
- `device_name`: required
- `device_type`: required (e.g., `smartwatch`, `fitness_band`)
- `manufacturer`: required

**Errors:**

- `400 BAD_REQUEST`: Invalid fields
- `409 DUPLICATE`: Device ID đã tồn tại

---

### 2. Liên kết thiết bị với user

**POST** `/device/link`

Liên kết thiết bị với tài khoản người dùng hiện tại.

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "device_id": "ESP32_001"
}
```

**Response (200):**

```json
{
  "message": "device linked successfully"
}
```

**Errors:**

- `400 BAD_REQUEST`: Missing device_id
- `403 FORBIDDEN`: Thiết bị đã được liên kết với user khác
- `404 NOT_FOUND`: Thiết bị không tồn tại

---

### 3. Hủy liên kết thiết bị

**DELETE** `/device/link`

Hủy liên kết thiết bị khỏi tài khoản người dùng.

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "device_id": "ESP32_001"
}
```

**Response (200):**

```json
{
  "message": "device unlinked successfully"
}
```

**Errors:**

- `403 FORBIDDEN`: Thiết bị không thuộc về user hiện tại
- `404 NOT_FOUND`: Thiết bị không tồn tại

---

## Health Record APIs

### 1. Lấy dữ liệu sức khỏe theo ngày

**GET** `/health-record?date=YYYY-MM-DD`

Lấy tất cả records sức khỏe của user trong một ngày cụ thể.

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `date` (optional): Ngày muốn lấy dữ liệu, format `YYYY-MM-DD`. Mặc định là ngày hôm nay.

**Response (200):**

```json
{
  "id": "673c5f8e9b1234567890abcd",
  "user_id": "673c5f8e9b1234567890user",
  "device_id": "ESP32_001",
  "date": "2025-11-24T00:00:00Z",
  "data": [
    {
      "timestamp": "2025-11-24T08:30:15Z",
      "device_id": "ESP32_001",
      "user_id": "673c5f8e9b1234567890user",
      "heart_rate": {
        "value": 75,
        "status": "normal"
      },
      "spo2": {
        "value": 98,
        "status": "normal"
      },
      "temperature": {
        "value": 36.5,
        "status": "normal"
      },
      "blood_pressure": {
        "systolic": 120,
        "diastolic": 80,
        "status": "normal"
      },
      "steps": {
        "count": 5000
      },
      "calories": {
        "estimated": 7.5
      }
    },
    {
      "timestamp": "2025-11-24T08:35:20Z",
      "device_id": "ESP32_001",
      "user_id": "673c5f8e9b1234567890user",
      "heart_rate": {
        "value": 78,
        "status": "normal"
      },
      "spo2": {
        "value": 97,
        "status": "normal"
      },
      "calories": {
        "estimated": 7.8
      }
    }
  ],
  "created_at": "2025-11-24T08:30:15Z",
  "updated_at": "2025-11-24T08:35:20Z"
}
```

**Usage Example (Track tab):**

```
curl -H "Authorization: Bearer <token>" \
     "${API_BASE_URL}/health-record?date=2025-11-24"
```

**Data Structure:**

- `data`: Array các record trong ngày, mỗi record chứa timestamp và các chỉ số sức khỏe
- `heart_rate`: Nhịp tim (bpm)
  - `value`: Giá trị đo được
  - `status`: `normal`, `high`, `low`
- `spo2`: Nồng độ oxy trong máu (%)
  - `value`: Giá trị đo được
  - `status`: `normal`, `low`
- `temperature`: Nhiệt độ cơ thể (°C)
- `blood_pressure`: Huyết áp (mmHg)
- `steps`: Số bước chân
- `calories`: Calories tiêu thụ ước tính
- Tab Track sẽ sử dụng endpoint này để tải danh sách bản ghi chi tiết khi người dùng chọn khoảng ngày.

**Errors:**

- `401 UNAUTHORIZED`: Token không hợp lệ
- `404 NOT_FOUND`: Không có dữ liệu cho ngày đó

---

### 2. Lấy tổng kết theo ngày

**GET** `/summary?date=YYYY-MM-DD`

Lấy daily summary (tổng kết) các chỉ số sức khỏe trong ngày.

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `date` (optional): Ngày muốn lấy summary, format `YYYY-MM-DD`. Mặc định là ngày hôm nay.

**Response (200):**

```json
{
  "id": "673c5f8e9b1234567890sum",
  "user_id": "673c5f8e9b1234567890user",
  "date": "2025-11-24T00:00:00Z",
  "heart_rate": {
    "avg": 76.5,
    "min": 65,
    "max": 95,
    "resting_hr": 65,
    "measurements": 288
  },
  "spo2": {
    "avg": 97.8,
    "min": 95,
    "max": 99,
    "measurements": 288
  },
  "calories": {
    "total": 2150.5,
    "avg_per_hour": 89.6
  },
  "created_at": "2025-11-24T23:55:00Z",
  "updated_at": "2025-11-24T23:55:00Z"
}
```

**Usage Example (Track tab):**

```
curl -H "Authorization: Bearer <token>" \
     "${API_BASE_URL}/summary?date=2025-11-24"
```

**Giải thích:**

- Summary được tự động tính toán mỗi khi có data mới
- `measurements`: Số lần đo trong ngày
- `resting_hr`: Nhịp tim nghỉ (giá trị min)
- `total`: Tổng calories tiêu thụ trong ngày
- `avg_per_hour`: Trung bình calories/giờ
- Tab Track sẽ dùng endpoint này để hiển thị phần tổng quan (avg/min/max) thay cho dữ liệu realtime trong app.

**Errors:**

- `401 UNAUTHORIZED`: Token không hợp lệ
- `404 NOT_FOUND`: Chưa có summary cho ngày đó

---

## Alert APIs

### 1. Lấy danh sách cảnh báo

**GET** `/alert?limit=50`

Lấy danh sách các cảnh báo của user (sắp xếp theo thời gian mới nhất).

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `limit` (optional): Số lượng alerts tối đa trả về. Mặc định: `50`

**Response (200):**

```json
[
  {
    "id": "673c5f8e9b1234567890ale1",
    "user_id": "673c5f8e9b1234567890user",
    "device_id": "ESP32_001",
    "alert_type": "high_heart_rate",
    "severity": "warning",
    "trigger": {
      "metric": "heartRate",
      "value": 125,
      "threshold": 120,
      "condition": "exceeded"
    },
    "message": "Nhịp tim cao hơn bình thường",
    "status": "unread",
    "triggered_at": "2025-11-24T14:30:15Z",
    "created_at": "2025-11-24T14:30:15Z",
    "updated_at": "2025-11-24T14:30:15Z"
  },
  {
    "id": "673c5f8e9b1234567890ale2",
    "user_id": "673c5f8e9b1234567890user",
    "device_id": "ESP32_001",
    "alert_type": "low_spo2",
    "severity": "critical",
    "trigger": {
      "metric": "spo2",
      "value": 88,
      "threshold": 90,
      "condition": "below"
    },
    "message": "Nồng độ oxy trong máu thấp",
    "status": "read",
    "triggered_at": "2025-11-24T12:15:30Z",
    "created_at": "2025-11-24T12:15:30Z",
    "updated_at": "2025-11-24T12:20:00Z"
  }
]
```

**Alert Types:**

- `high_heart_rate`: Nhịp tim > 120 bpm
- `low_heart_rate`: Nhịp tim < 50 bpm
- `low_spo2`: SpO2 < 90%

**Severity Levels:**

- `warning`: Cảnh báo thông thường
- `critical`: Nguy hiểm, cần xử lý ngay

**Status:**

- `unread`: Chưa đọc
- `read`: Đã đọc
- `acknowledged`: Đã xác nhận

**Errors:**

- `401 UNAUTHORIZED`: Token không hợp lệ

---

### 2. Lấy cảnh báo chưa đọc

**GET** `/alert/unread`

Lấy danh sách các cảnh báo chưa đọc của user.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
[
  {
    "id": "673c5f8e9b1234567890ale1",
    "user_id": "673c5f8e9b1234567890user",
    "device_id": "ESP32_001",
    "alert_type": "high_heart_rate",
    "severity": "warning",
    "trigger": {
      "metric": "heartRate",
      "value": 125,
      "threshold": 120,
      "condition": "exceeded"
    },
    "message": "Nhịp tim cao hơn bình thường",
    "status": "unread",
    "triggered_at": "2025-11-24T14:30:15Z",
    "created_at": "2025-11-24T14:30:15Z",
    "updated_at": "2025-11-24T14:30:15Z"
  }
]
```

---

### 3. Đánh dấu cảnh báo đã đọc

**PUT** `/alert/:id/read`

Đánh dấu một cảnh báo là đã đọc.

**Headers:**

```
Authorization: Bearer <token>
```

**URL Parameters:**

- `id`: Alert ID

**Response (200):**

```json
{
  "message": "Alert marked as read"
}
```

**Errors:**

- `404 NOT_FOUND`: Alert không tồn tại

---

### 4. Đánh dấu cảnh báo đã xử lý

**PUT** `/alert/:id/resolve`

Đánh dấu một cảnh báo là đã xử lý/giải quyết.

**Headers:**

```
Authorization: Bearer <token>
```

**URL Parameters:**

- `id`: Alert ID

**Response (200):**

```json
{
  "message": "Alert marked as resolved"
}
```

**Errors:**

- `404 NOT_FOUND`: Alert không tồn tại

---

## WebSocket APIs

Hệ thống hỗ trợ 2 loại WebSocket connections:

### 1. Device WebSocket

**WS** `/ws/device/:id`

WebSocket cho thiết bị IoT (ESP32) gửi dữ liệu real-time lên server.

**URL Parameters:**

- `id`: Device ID (ví dụ: `ESP32_001`)

**Connection:**

```javascript
const ws = new WebSocket('ws://localhost:8080/ws/device/ESP32_001');
```

**Message Format (Device → Server):**

```json
{
  "bpm": 75,
  "spo2": 98
}
```

**Server Actions:**

1. Nhận data từ device
2. Publish data vào Redis channel: `health_data:device:<device_id>`
3. Lưu vào batch queue trong Redis
4. Kiểm tra ngưỡng và tạo alert nếu cần
5. Forward real-time data đến user WebSocket (nếu có)

**Note:**

- Không cần authentication cho device WebSocket
- Device chỉ gửi, không nhận data
- Khi device disconnect, sẽ bị remove khỏi active devices list

---

### 2. User WebSocket

**WS** `/ws/user/:id?t=<token>`

WebSocket cho người dùng nhận dữ liệu real-time từ các thiết bị của họ.

**URL Parameters:**

- `id`: User ID
- `t` (query param): JWT access token

**Connection:**

```javascript
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const ws = new WebSocket(`ws://localhost:8080/ws/user/673c5f8e9b1234567890user?t=${token}`);
```

**Message Format (Server → User):**

```json
{
  "type": "device:ESP32_001",
  "data": {
    "deviceId": "ESP32_001",
    "heartRate": 75,
    "spo2": 98,
    "timestamp": "2025-11-24T14:30:15Z"
  }
}
```

**Server Actions:**

1. Verify JWT token
2. Lấy danh sách devices của user
3. Subscribe vào Redis channels của tất cả devices: `health_data:device:<device_id>`
4. Forward real-time data từ Redis đến user WebSocket

**Errors:**

- `401 UNAUTHORIZED`: Token không hợp lệ hoặc thiếu
- Connection sẽ bị đóng nếu token invalid

---

## Models

### User Model

```go
type User struct {
    ID          ObjectID   `json:"id"`
    Username    string     `json:"username"`
    Password    string     `json:"password"`      // Hashed with bcrypt
    Name        string     `json:"name"`
    DateOfBirth time.Time  `json:"dateOfBirth"`
    Gender      string     `json:"gender"`        // male, female, other
    Height      float64    `json:"height"`        // cm
    Weight      float64    `json:"weight"`        // kg
    DeviceIDs   []string   `json:"deviceIds"`     // Array of linked device IDs
    CreatedAt   time.Time  `json:"createdAt"`
    UpdatedAt   time.Time  `json:"updatedAt"`
}
```

### Device Model

```go
type Device struct {
    ID           ObjectID   `json:"id"`
    DeviceID     string     `json:"deviceId"`     // Unique identifier
    UserID       *ObjectID  `json:"userId"`       // Linked user (nullable)
    DeviceName   string     `json:"deviceName"`
    DeviceType   string     `json:"deviceType"`   // smartwatch, fitness_band
    Manufacturer string     `json:"manufacturer"`
    RegisteredAt time.Time  `json:"registeredAt"`
    LastSyncAt   time.Time  `json:"lastSyncAt"`
    IsActive     bool       `json:"isActive"`
    BatteryLevel int        `json:"batteryLevel"` // %
}
```

### HealthRecord Model

```go
type HealthRecord struct {
    ID        ObjectID   `json:"id"`
    UserID    ObjectID   `json:"user_id"`
    DeviceID  string     `json:"device_id"`
    Date      time.Time  `json:"date"`         // Ngày (00:00:00)
    Data      []Record   `json:"data"`         // Array các record trong ngày
    CreatedAt time.Time  `json:"created_at"`
    UpdatedAt time.Time  `json:"updated_at"`
}

type Record struct {
    Timestamp     time.Time         `json:"timestamp"`
    DeviceID      string            `json:"device_id"`
    UserID        ObjectID          `json:"user_id"`
    HeartRate     HeartRateData     `json:"heart_rate"`
    SpO2          SpO2Data          `json:"spo2"`
    Temperature   TemperatureData   `json:"temperature,omitempty"`
    BloodPressure BloodPressureData `json:"blood_pressure,omitempty"`
    Steps         StepsData         `json:"steps,omitempty"`
    Calories      CaloriesData      `json:"calories"`
}
```

### DailySummary Model

```go
type DailySummary struct {
    ID        ObjectID         `json:"id"`
    UserID    ObjectID         `json:"user_id"`
    Date      time.Time        `json:"date"`
    HeartRate HeartRateSummary `json:"heart_rate"`
    SpO2      SpO2Summary      `json:"spo2"`
    Calories  CaloriesSummary  `json:"calories"`
    CreatedAt time.Time        `json:"created_at"`
    UpdatedAt time.Time        `json:"updated_at"`
}

type HeartRateSummary struct {
    Avg          float64 `json:"avg"`
    Min          float32 `json:"min"`
    Max          float32 `json:"max"`
    RestingHR    float32 `json:"resting_hr"`
    Measurements int     `json:"measurements"`
}
```

### Alert Model

```go
type Alert struct {
    ID          ObjectID     `json:"id"`
    UserID      ObjectID     `json:"user_id"`
    DeviceID    string       `json:"device_id"`
    AlertType   string       `json:"alert_type"`   // high_heart_rate, low_heart_rate, low_spo2
    Severity    string       `json:"severity"`     // warning, critical
    Trigger     AlertTrigger `json:"trigger"`
    Message     string       `json:"message"`
    Status      string       `json:"status"`       // unread, read, acknowledged
    TriggeredAt time.Time    `json:"triggered_at"`
    CreatedAt   time.Time    `json:"created_at"`
    UpdatedAt   time.Time    `json:"updated_at"`
}

type AlertTrigger struct {
    Metric    string  `json:"metric"`       // heartRate, spo2, temperature
    Value     float64 `json:"value"`        // Giá trị thực tế
    Threshold float64 `json:"threshold"`    // Ngưỡng cảnh báo
    Condition string  `json:"condition"`    // exceeded, below
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "message": "Mô tả lỗi chi tiết",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

### HTTP Status Codes

| Status Code | Tag             | Mô tả                                          |
| ----------- | --------------- | ---------------------------------------------- |
| 200         | -               | Success                                        |
| 400         | BAD_REQUEST     | Request không hợp lệ (thiếu field, sai format) |
| 401         | UNAUTHORIZED    | Không có token hoặc token không hợp lệ         |
| 403         | FORBIDDEN       | Không có quyền truy cập resource               |
| 404         | NOT_FOUND       | Resource không tồn tại                         |
| 409         | DUPLICATE       | Resource đã tồn tại (duplicate key)            |
| 500         | INTERNAL_SERVER | Lỗi server                                     |

### Common Errors

**401 UNAUTHORIZED:**

```json
{
  "error": {
    "message": "token is expired",
    "code": "UNAUTHORIZED",
    "status": 401
  }
}
```

**404 NOT_FOUND:**

```json
{
  "error": {
    "message": "device ESP32_999 not found",
    "code": "NOT_FOUND",
    "status": 404
  }
}
```

**403 FORBIDDEN:**

```json
{
  "error": {
    "message": "device already linked to another user",
    "code": "FORBIDDEN",
    "status": 403
  }
}
```

---

## Batch Processing

### Cơ chế hoạt động:

1. **Real-time Data Collection:**
   - Device gửi data qua WebSocket
   - Server lưu vào Redis batch queue: `batch:health:device:<device_id>`
   - Mỗi device có batch riêng

2. **Batch Processor (chạy mỗi 5 phút):**

   ```
   Ticker (5 minutes)
   ├─ Get active devices từ Redis Set: `active_devices`
   ├─ For each device:
   │  ├─ Get batch size: LLEN batch:health:device:<device_id>
   │  ├─ If batch size > 0:
   │  │  ├─ Get all data: LRANGE batch:health:device:<device_id> 0 -1
   │  │  ├─ Process each record:
   │  │  │  ├─ Save to MongoDB (HealthRecord)
   │  │  │  ├─ Check thresholds → Create alerts
   │  │  │  └─ Update daily summary
   │  │  └─ Clear batch: DEL batch:health:device:<device_id>
   │  └─ Log success count
   └─ Log total processed devices
   ```

3. **Active Devices Tracking:**
   - Khi device connect: `SADD active_devices <device_id>`
   - Mỗi message: Refresh tracking
   - Khi disconnect: `SREM active_devices <device_id>`

4. **Data Persistence:**
   - Batch data có TTL 10 phút (phòng trường hợp batch processor failed)
   - Nếu device không linked với user → Clear batch ngay (không save DB)

### Logging:

```
🚀 Health batch processor started (interval: 5 minutes)
⏰ Starting batch processing cycle...
📊 Processing batch for 3 active device(s)
Processing 15 records for device ESP32_001
💾 Saving 15 records for device ESP32_001 to database
✅ Saved 15/15 records for device ESP32_001 to database
✅ Successfully processed batches for 3/3 devices
✅ Batch processing completed successfully
```

---

## Configuration

### Environment Variables

Tất cả config được load từ file `.env`:

```env
# Server
MODE=dev
SERVER_NAME=IoT Health Server
SERVER_ADDRESS=:8080
SERVER_PREFIX=/api/v1

# JWT
JWT_ACCESS_SECRET=your_access_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_EXPIRE_ACCESS=3600      # 1 hour
JWT_EXPIRE_REFRESH=86400    # 24 hours

# MongoDB
MONGO_URI=mongodb://localhost:27017
MONGO_DB=iot_health
MONGO_AUTO_MIGRATE=true
MONGO_MAX_LIFE_TIME=60

# Redis
REDIS_ADDRESS=localhost:6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Khởi động hệ thống:

1. Start MongoDB và Redis:

```bash
docker-compose up -d
```

2. Set environment variables hoặc tạo file `.env`

3. Run server:

```bash
go run main.go
```

4. Server sẽ khởi động:
   - HTTP Server trên port `:8080`
   - WebSocket Hub
   - Batch Processor (background worker)

---

## Testing Examples

### 1. Đăng ký và đăng nhập:

```bash
# Register
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 2. Lấy thông tin user:

```bash
TOKEN="your_jwt_token_here"

curl -X GET http://localhost:8080/api/v1/user/me \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Đăng ký và link device:

```bash
# Create device
curl -X POST http://localhost:8080/api/v1/device \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "ESP32_001",
    "device_name": "My Smart Watch",
    "device_type": "smartwatch",
    "manufacturer": "ESP32"
  }'

# Link device
curl -X POST http://localhost:8080/api/v1/device/link \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "ESP32_001"
  }'
```

### 4. WebSocket Connection (JavaScript):

```javascript
// Device WebSocket
const deviceWs = new WebSocket('ws://localhost:8080/ws/device/ESP32_001');

deviceWs.onopen = () => {
  // Send health data every 5 seconds
  setInterval(() => {
    deviceWs.send(
      JSON.stringify({
        bpm: Math.floor(Math.random() * 30) + 60, // 60-90
        spo2: Math.floor(Math.random() * 5) + 95, // 95-100
      })
    );
  }, 5000);
};

// User WebSocket
const token = 'your_jwt_token_here';
const userWs = new WebSocket(`ws://localhost:8080/ws/user/673c5f8e9b1234567890user?t=${token}`);

userWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received health data:', data);
};
```

### 5. Lấy health records:

```bash
# Today's records
curl -X GET "http://localhost:8080/api/v1/health-record" \
  -H "Authorization: Bearer $TOKEN"

# Specific date
curl -X GET "http://localhost:8080/api/v1/health-record?date=2025-11-24" \
  -H "Authorization: Bearer $TOKEN"

# Daily summary
curl -X GET "http://localhost:8080/api/v1/summary?date=2025-11-24" \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Quản lý alerts:

```bash
# Get all alerts
curl -X GET "http://localhost:8080/api/v1/alert?limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Get unread alerts
curl -X GET "http://localhost:8080/api/v1/alert/unread" \
  -H "Authorization: Bearer $TOKEN"

# Mark as read
curl -X PUT "http://localhost:8080/api/v1/alert/673c5f8e9b1234567890ale1/read" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Best Practices

### 1. Security:

- ✅ Tất cả passwords được hash bằng bcrypt
- ✅ JWT tokens có expiration time
- ✅ Protected routes yêu cầu authentication
- ⚠️ Nên implement rate limiting cho login endpoint
- ⚠️ Nên add HTTPS cho production

### 2. Performance:

- ✅ Sử dụng Redis cho real-time data streaming
- ✅ Batch processing giảm tải MongoDB writes
- ✅ WebSocket cho real-time communication
- ✅ Index MongoDB collections theo user_id và date

### 3. Data Management:

- ✅ Health records được group theo ngày
- ✅ Daily summary tự động cập nhật
- ✅ Batch data có TTL để tránh memory leak
- ✅ Active devices tracking tự động cleanup

### 4. Error Handling:

- ✅ Consistent error response format
- ✅ Proper HTTP status codes
- ✅ Logging với context tracking
- ✅ Graceful error recovery trong batch processor

---

## Support & Contact

Để biết thêm chi tiết về kiến trúc hệ thống, vui lòng tham khảo:

- `DEVICE_CENTRIC_ARCHITECTURE.md`: Kiến trúc tập trung vào thiết bị
- `REDIS_PUBSUB_ARCHITECTURE.md`: Chi tiết về Redis Pub/Sub implementation
- `README.md`: Hướng dẫn setup và chạy project

---

**Version:** 1.0  
**Last Updated:** 2025-11-24  
**Maintainer:** IoT Health Team
