import { Router } from "express";
import {
  googleRedirectController,
  googleCallbackController,
} from "../controllers/oauthController";
import { authRateLimit } from "../middlewares/rateLimit";

const router = Router();
router.use(authRateLimit);
router.get("/", googleRedirectController);
router.get("/callback", googleCallbackController);

export default router;
