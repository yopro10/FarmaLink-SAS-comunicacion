import { Router } from 'express';
import { assistant, health } from './aiController.js';

const router = Router();

router.get('/health', health);
router.post('/assistant', assistant);

export default router;
