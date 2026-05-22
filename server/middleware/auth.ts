import { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';

// 可运行时修改的密码 (初始值来自环境变量)
let currentPassword = process.env.ADMIN_PASSWORD || 'sam888';
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmac(data: string, key: string): string {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/** 验证密码是否正确 */
export function verifyPassword(password: string): boolean {
  return sha256(password) === sha256(currentPassword);
}

/** 修改管理员密码，返回新的 token */
export function changePassword(oldPassword: string, newPassword: string): string | null {
  if (sha256(oldPassword) !== sha256(currentPassword)) return null;
  if (!newPassword || newPassword.length < 4) return null;
  currentPassword = newPassword;
  return generateToken();
}

/** 生成一个有时效的 auth token */
export function generateToken(): string {
  const expires = Date.now() + TOKEN_EXPIRY_MS;
  const payload = `${expires}`;
  const signature = hmac(payload, currentPassword);
  return `${payload}.${signature}`;
}

/** 验证 token 是否有效 */
export function verifyToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [expiresStr, signature] = parts;
  const expectedSig = hmac(expiresStr, currentPassword);
  if (signature !== expectedSig) return false;
  const expires = parseInt(expiresStr, 10);
  if (isNaN(expires)) return false;
  return expires > Date.now();
}

/** 鉴权中间件：保护管理类 API 路由 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !verifyToken(token)) {
    res.status(401).json({ success: false, error: '未授权访问' });
    return;
  }
  next();
}
