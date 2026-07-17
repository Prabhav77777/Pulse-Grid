import { Router } from 'express';
import sessionManager, { generateMockStaffUsers, verifyMockPassword } from '../../action/sessionManager.js';
import { setCsrfToken } from '../middleware/csrf.js';
import { authLimiter, generalLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const mockUsers = generateMockStaffUsers();

router.post('/login', authLimiter.middleware(), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = mockUsers.find((candidate) => candidate.username === username);
  if (!user || !verifyMockPassword(user, password)) return res.status(401).json({ error: 'Invalid credentials' });
  const session = sessionManager.createSession({ id: user.id, username: user.username, role: user.role, permissions: user.permissions });
  sessionManager.setSessionCookie(res, session.sessionId);
  const csrfToken = setCsrfToken(res);
  return res.json({ message: 'Authenticated', csrfToken, user: { id: user.id, username: user.username, role: user.role } });
});

router.get('/me', generalLimiter.middleware(), sessionManager.requireAuthentication(), (req, res) => {
  const { userId, username, role, permissions } = req.staffSession;
  res.json({ user: { id: userId, username, role, permissions } });
});

router.post('/logout', authLimiter.middleware(), (req, res) => {
  const sessionId = req.signedCookies?.pulsegrid_sid;
  if (sessionId) sessionManager.destroySession(sessionId);
  res.clearCookie('pulsegrid_sid');
  res.json({ message: 'Logged out' });
});
export default router;
