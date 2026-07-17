import sessionManager, {
  generateMockStaffUsers,
  verifyMockPassword,
} from "../action/sessionManager.js";

import { setCsrfToken } from "../api/csrf.js";

const mockUsers = generateMockStaffUsers();

export async function login(body, res) {
  const { username, password } = body;

  if (!username || !password) {
    throw new Error("Username and password required");
  }

  const user = mockUsers.find(
    (u) => u.username === username
  );

  if (!user || !verifyMockPassword(user, password)) {
    const error = new Error("Invalid credentials");
    error.status = 401;
    throw error;
  }

  const session =
    sessionManager.createSession({
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    });

  sessionManager.setSessionCookie(
    res,
    session.sessionId
  );

  const csrfToken = setCsrfToken(res);

  return {
    message: "Authenticated",

    csrfToken,

    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}

export async function logout(req, res) {
  const sid = req.signedCookies?.pulsegrid_sid;

  if (sid) {
    sessionManager.destroySession(sid);
  }

  res.clearCookie("pulsegrid_sid");
}