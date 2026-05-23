import { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface TokenPayload {
  expires: number;
  nonce: string;
}

let passwordHash: string | null = null;

function getInitialPassword(): string {
  return process.env.ADMIN_PASSWORD || 'sam888';
}

async function getPasswordHash(): Promise<string> {
  if (!passwordHash) {
    const initialPwd = getInitialPassword();
    passwordHash = await bcrypt.hash(initialPwd, BCRYPT_ROUNDS);
  }
  return passwordHash;
}

let cachedTokenSecret: string | null = null;

function getTokenSecret(): string {
  if (!cachedTokenSecret) {
    cachedTokenSecret = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
  }
  return cachedTokenSecret;
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/** 验证密码是否正确 */
export async function verifyPassword(password: string): Promise<boolean> {
  const hash = await getPasswordHash();
  return bcrypt.compare(password, hash);
}

/** 修改管理员密码，返回新的 token */
export async function changePassword(oldPassword: string, newPassword: string): Promise<string | null> {
  const hash = await getPasswordHash();
  const valid = await bcrypt.compare(oldPassword, hash);
  if (!valid) return null;
  if (!newPassword || newPassword.length < 4) return null;
  passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  return generateToken();
}

/** 生成认证 token */
export function generateToken(): string {
  const expires = Date.now() + TOKEN_EXPIRY_MS;
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload: TokenPayload = { expires, nonce };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signPayload(payloadBase64, getTokenSecret());
  return `${payloadBase64}.${signature}`;
}

/** 验证 token 是否有效 */
export function verifyToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadBase64, signature] = parts;

  const expectedSig = signPayload(payloadBase64, getTokenSecret());
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return false;

  try {
    const payload: TokenPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (!payload.expires || !payload.nonce) return false;
    return payload.expires > Date.now();
  } catch {
    return false;
  }
}

/** 鉴权中间件 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !verifyToken(token)) {
    res.status(401).json({ success: false, error: '未授权访问' });
    return;
  }
  next();
}
