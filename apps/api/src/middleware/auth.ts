import type { Request, Response, NextFunction } from 'express';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const response = await fetch(`https://api.clerk.com/v1/tokens/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const session = await response.json() as { userId: string };
    (req as any).userId = session.userId;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}
