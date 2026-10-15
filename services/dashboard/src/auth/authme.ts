import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Validates a plaintext password against an AuthMe hashed password string.
 * Supports AuthMe's standard SHA256 ($SHA$salt$hash) and BCrypt ($2a$, $2b$).
 */
export function verifyAuthMePassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) {
    return false;
  }

  // AuthMe SHA256: $SHA$salt$hash
  if (storedHash.startsWith('$SHA$')) {
    const parts = storedHash.split('$');
    // parts: ['', 'SHA', 'salt', 'hash']
    if (parts.length < 4) {
      return false;
    }
    const salt = parts[2];
    const expectedHash = parts[3];

    // Compute: sha256(sha256(password) + salt)
    const passHash = crypto.createHash('sha256').update(password).digest('hex');
    const finalHash = crypto.createHash('sha256').update(passHash + salt).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(finalHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  }

  // AuthMe BCrypt: $2a$... or $2b$...
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return bcrypt.compareSync(password, storedHash);
  }

  // Fallback for simple SHA256 or MD5 legacy hashes if applicable
  return false;
}

