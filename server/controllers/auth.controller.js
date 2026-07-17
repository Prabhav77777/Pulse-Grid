import * as authService from "../services/auth.service.js";

export async function login(req, res, next) {
  try {
    const result = await authService.login(
      req.body,
      res
    );

    res.json(result);

  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(req, res) {
  const { userId, username, role, permissions } =
    req.staffSession;

  res.json({
    user: {
      id: userId,
      username,
      role,
      permissions,
    },
  });
}

export async function logout(req, res) {
  await authService.logout(req, res);

  res.json({
    message: "Logged out",
  });
}