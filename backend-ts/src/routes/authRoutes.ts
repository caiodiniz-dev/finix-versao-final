import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { authRateLimit } from '../middlewares/rateLimit';
import {
  signupController,
  verifyEmailController,
  resendCodeController,
  loginController,
  getMeController,
} from '../controllers/authController';

const router = Router();
router.use(authRateLimit);

router.post('/signup', signupController);
router.post('/verify', verifyEmailController);
router.post('/resend-code', resendCodeController);
router.post('/login', loginController);
router.get('/me', authenticate, getMeController);

export default router;