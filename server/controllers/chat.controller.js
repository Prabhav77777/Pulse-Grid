import * as chatService from "../services/chat.service.js";

export async function handleChat(req, res, next) {
  try {
    const response = await chatService.handleChat(req.body);

    res.json(response);
  } catch (err) {
    next(err);
  }
}