# LatinHub Auth Testing Playbook

Mobile app uses Bearer tokens (not cookies) because Expo React Native clients do not persist httpOnly cookies naturally. Tokens are stored in AsyncStorage on the client.

## Step 1: MongoDB Verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Expected: bcrypt hash starts with `$2b$`. Indexes exist on `users.email` (unique).

## Step 2: API Testing (Bearer token flow)

Register:
```
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@latinhub.it","password":"test1234","name":"Test User"}'
```
Expected: 200, `{user: {...}, access_token: "..."}`.

Login (admin seeded):
```
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@latinhub.it","password":"admin123"}'
```
Expected: 200, returns access_token.

Get current user:
```
TOKEN="<paste access_token>"
curl http://localhost:8001/api/auth/me -H "Authorization: Bearer $TOKEN"
```
Expected: user object with id, email, name, role.

Wrong password:
```
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@latinhub.it","password":"wrong"}'
```
Expected: 401 "Invalid credentials".

## Step 3: Resources
- GET /api/events  (list, supports ?city=&genre=)
- GET /api/events/{id}
- GET /api/djs
- GET /api/djs/{id}
- GET /api/mixes
- GET /api/mixes/{id}
- POST /api/events (Bearer required)
