// Isolated test configuration. Uses a separate database that the tests wipe.
// Override with MONGODB_TEST_URI (e.g. in CI) if Mongo isn't on localhost.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/throughmytrails_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-9876543210';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'Test-password-123';
process.env.ADMIN_NAME = 'Test Admin';
process.env.ADMIN_NOTIFY_EMAIL = 'notify@test.local';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.UPLOAD_DIR = 'uploads-test';
process.env.TRUST_PROXY = '0';
