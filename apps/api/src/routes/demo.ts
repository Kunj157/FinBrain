import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createClerkClient } from '@clerk/backend';
import { createDemoTicket, DemoUnavailableError } from '../services/demo-session';

const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

const router = Router();

// Public and unauthenticated, so it is keyed by IP alone. A visitor needs one
// ticket; a handful covers retries.
const demoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? '') || 'unknown',
  message: { success: false, error: 'Too many demo sign-ins. Please wait a few minutes.' },
});

router.get('/', (_req, res) => {
  res.json({ success: true, data: { enabled: !!process.env.DEMO_USER_EMAIL?.trim() && !!clerkClient } });
});

router.post('/session', demoLimiter, async (_req, res) => {
  try {
    const ticket = await createDemoTicket({ demoEmail: process.env.DEMO_USER_EMAIL, clerk: clerkClient });
    res.json({ success: true, data: { ticket } });
  } catch (error) {
    if (error instanceof DemoUnavailableError) {
      console.warn(`[demo] ${error.message}`);
      return res.status(404).json({ success: false, error: 'The demo is not available right now.' });
    }
    throw error;
  }
});

export default router;
