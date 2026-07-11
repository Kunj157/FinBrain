import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';

const router = Router();

router.get('/profile', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        birthDate: true,
        avatarUrl: true,
        currency: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { username, birthDate, password } = req.body;

    const updateData: Record<string, unknown> = {};

    if (username !== undefined) {
      if (typeof username !== 'string' || username.length < 3) {
        return res.status(400).json({ success: false, error: 'Username must be at least 3 characters' });
      }
      updateData.username = username.trim();
    }

    if (birthDate !== undefined) {
      const parsed = new Date(birthDate);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid birth date' });
      }
      updateData.birthDate = parsed;
    }

    if (password !== undefined) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        });
      }
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        birthDate: true,
        avatarUrl: true,
        currency: true,
        onboardingCompleted: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

router.delete('/profile', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    await prisma.user.delete({ where: { id: req.userId } });

    res.json({ success: true, data: { message: 'Account deleted successfully' } });
  } catch (error) {
    console.error('Profile delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

export default router;
