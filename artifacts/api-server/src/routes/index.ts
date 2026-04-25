import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import exercisesRouter from "./exercises";
import planRouter from "./plan";
import sessionsRouter from "./sessions";
import statsRouter from "./stats";
import bodyweightRouter from "./bodyweight";
import waterRouter from "./water";
import { guestAuth } from "../middlewares/guest";

const router: IRouter = Router();

router.use(healthRouter);

// All routes below require a guest token.
router.use(guestAuth);
router.use(profileRouter);
router.use(exercisesRouter);
router.use(planRouter);
router.use(sessionsRouter);
router.use(statsRouter);
router.use(bodyweightRouter);
router.use(waterRouter);

export default router;
