import { db, exercisesTable } from "@workspace/db";
import { and, isNull, eq } from "drizzle-orm";
import { logger } from "./logger";

type Seed = {
  name: string;
  muscleGroup: string;
  equipment: string;
  description: string;
  formCues: string[];
};

const CATALOG: Seed[] = [
  // Chest
  {
    name: "Bench Press",
    muscleGroup: "chest",
    equipment: "full_gym",
    description:
      "King of upper-body pressing. Builds raw chest, front delt, and triceps strength.",
    formCues: [
      "Plant your feet flat and drive through them",
      "Pinch shoulder blades back and down on the bench",
      "Lower the bar with control to mid-chest",
      "Press explosively, keeping wrists stacked over elbows",
    ],
  },
  {
    name: "Incline Press",
    muscleGroup: "chest",
    equipment: "full_gym",
    description: "Targets the upper chest fibers.",
    formCues: [
      "Set bench to a 30 to 45 degree incline",
      "Keep elbows at about 60 degrees from your torso",
      "Lower to the upper chest, just below the collarbone",
      "Press until elbows are nearly locked, then control the descent",
    ],
  },
  {
    name: "Chest Fly",
    muscleGroup: "chest",
    equipment: "machines_only",
    description: "Isolation movement for chest stretch and contraction.",
    formCues: [
      "Slight bend in the elbows, keep it locked",
      "Open arms wide, feeling a deep stretch",
      "Squeeze chest hard at the top of the movement",
      "Move only at the shoulder joint",
    ],
  },
  {
    name: "Push Ups",
    muscleGroup: "chest",
    equipment: "home",
    description: "Bodyweight pressing — scalable and joint friendly.",
    formCues: [
      "Brace your core and keep a straight line head to heels",
      "Hands slightly wider than shoulders",
      "Lower until chest grazes the floor",
      "Drive the floor away with full lockout",
    ],
  },
  {
    name: "Pec Deck",
    muscleGroup: "chest",
    equipment: "machines_only",
    description: "Machine fly for safe chest isolation.",
    formCues: [
      "Adjust seat so handles align with mid-chest",
      "Press the pads together with chest, not arms",
      "Pause briefly at peak contraction",
      "Resist the eccentric back to the start",
    ],
  },

  // Back
  {
    name: "Lat Pulldown",
    muscleGroup: "back",
    equipment: "full_gym",
    description: "Builds lat width and pulling strength.",
    formCues: [
      "Grip slightly wider than shoulders",
      "Lean back about 10 to 15 degrees",
      "Pull the bar to the upper chest with elbows down",
      "Squeeze your lats at the bottom",
    ],
  },
  {
    name: "Seated Row",
    muscleGroup: "back",
    equipment: "full_gym",
    description: "Mid-back thickness and posture builder.",
    formCues: [
      "Sit tall with chest up and shoulders down",
      "Pull the handle to your lower ribs",
      "Drive elbows back, not just hands",
      "Control the stretch on the return",
    ],
  },
  {
    name: "Deadlift",
    muscleGroup: "back",
    equipment: "full_gym",
    description: "Full posterior chain strength builder.",
    formCues: [
      "Bar over mid-foot, shins close",
      "Brace your core and pull the slack out of the bar",
      "Drive the floor away while keeping the bar against your legs",
      "Stand tall — do not hyperextend at the top",
    ],
  },
  {
    name: "Pull Ups",
    muscleGroup: "back",
    equipment: "home",
    description: "Bodyweight back builder — width and strength.",
    formCues: [
      "Hang fully with shoulders engaged",
      "Pull until chin clears the bar",
      "Drive elbows down and back",
      "Lower under control to a full stretch",
    ],
  },
  {
    name: "Cable Row",
    muscleGroup: "back",
    equipment: "machines_only",
    description: "Constant-tension back row.",
    formCues: [
      "Keep torso upright and braced",
      "Initiate with the back, not the arms",
      "Pull to the lower ribs with elbows tucked",
      "Pause and squeeze before the return",
    ],
  },

  // Legs
  {
    name: "Squat",
    muscleGroup: "legs",
    equipment: "full_gym",
    description: "The foundational leg builder.",
    formCues: [
      "Feet shoulder width, toes slightly out",
      "Brace your core and keep chest up",
      "Knees track over the toes",
      "Drive through the whole foot to stand",
    ],
  },
  {
    name: "Leg Press",
    muscleGroup: "legs",
    equipment: "machines_only",
    description: "Heavy-loadable leg builder, joint friendly.",
    formCues: [
      "Feet flat on the platform, shoulder width",
      "Lower until thighs near 90 degrees",
      "Do not let lower back round off the pad",
      "Press through heels, leaving a slight knee bend",
    ],
  },
  {
    name: "Lunges",
    muscleGroup: "legs",
    equipment: "dumbbells_only",
    description: "Single-leg work for size, balance, and stability.",
    formCues: [
      "Step out far enough that the front shin stays vertical",
      "Drop the back knee toward the floor",
      "Drive through the front heel to return",
      "Keep torso tall throughout",
    ],
  },
  {
    name: "Leg Extension",
    muscleGroup: "legs",
    equipment: "machines_only",
    description: "Quad isolation for slope-shaped quads.",
    formCues: [
      "Align knees with the machine pivot",
      "Extend fully and squeeze the quads",
      "Lower with a slow eccentric",
      "Keep hips planted in the seat",
    ],
  },
  {
    name: "Hamstring Curl",
    muscleGroup: "legs",
    equipment: "machines_only",
    description: "Direct hamstring isolation.",
    formCues: [
      "Pin against the back pad, hips down",
      "Curl with smooth tempo",
      "Squeeze hamstrings at the peak",
      "Resist the negative back to start",
    ],
  },
  {
    name: "Calf Raise",
    muscleGroup: "legs",
    equipment: "home",
    description: "Calves for the days you skip them.",
    formCues: [
      "Stand tall on the balls of the feet",
      "Drive up onto the toes with full extension",
      "Pause briefly at the top",
      "Lower with a deep, controlled stretch",
    ],
  },

  // Shoulders
  {
    name: "Shoulder Press",
    muscleGroup: "shoulders",
    equipment: "full_gym",
    description: "Builds round, capped delts.",
    formCues: [
      "Brace your core and squeeze the glutes",
      "Press the bar in a straight line overhead",
      "Lock out with biceps near the ears",
      "Lower under control to chin level",
    ],
  },
  {
    name: "Lateral Raise",
    muscleGroup: "shoulders",
    equipment: "dumbbells_only",
    description: "Isolation for that wide shoulder cap.",
    formCues: [
      "Slight bend in the elbows, lock it",
      "Lead with the elbows, not the hands",
      "Raise just below shoulder height",
      "Lower slowly with control",
    ],
  },
  {
    name: "Rear Delt Fly",
    muscleGroup: "shoulders",
    equipment: "dumbbells_only",
    description: "Rear delt and upper-back posture builder.",
    formCues: [
      "Hinge at the hips, flat back",
      "Open arms out to the sides",
      "Squeeze rear delts and upper back",
      "Avoid swinging — pure isolation",
    ],
  },
  {
    name: "Front Raise",
    muscleGroup: "shoulders",
    equipment: "dumbbells_only",
    description: "Front delt isolation.",
    formCues: [
      "Stand tall, brace the core",
      "Raise dumbbells to shoulder height",
      "Avoid leaning back to swing the weight",
      "Lower with a smooth tempo",
    ],
  },

  // Arms
  {
    name: "Bicep Curl",
    muscleGroup: "arms",
    equipment: "dumbbells_only",
    description: "Classic bicep builder.",
    formCues: [
      "Elbows pinned at the sides",
      "Curl with biceps, not momentum",
      "Squeeze hard at the top",
      "Lower fully for a complete stretch",
    ],
  },
  {
    name: "Hammer Curl",
    muscleGroup: "arms",
    equipment: "dumbbells_only",
    description: "Targets brachialis and forearm thickness.",
    formCues: [
      "Neutral grip, palms facing in",
      "Curl with control, no body english",
      "Pause at the top",
      "Resist the negative on the way down",
    ],
  },
  {
    name: "Tricep Pushdown",
    muscleGroup: "arms",
    equipment: "machines_only",
    description: "Tricep isolation with constant tension.",
    formCues: [
      "Elbows tight to the sides",
      "Push down to a full lockout",
      "Squeeze triceps hard at the bottom",
      "Control the return to the start",
    ],
  },
  {
    name: "Skull Crushers",
    muscleGroup: "arms",
    equipment: "dumbbells_only",
    description: "Tricep mass builder targeting the long head.",
    formCues: [
      "Keep upper arms vertical, elbows fixed",
      "Lower the weight toward the forehead",
      "Extend at the elbows only",
      "Lock out without flaring the elbows",
    ],
  },

  // Core / Full body
  {
    name: "Plank",
    muscleGroup: "core",
    equipment: "home",
    description: "Anti-extension core strength.",
    formCues: [
      "Forearms under shoulders",
      "Brace abs and squeeze glutes",
      "Keep a straight line head to heels",
      "Breathe steadily — do not hold your breath",
    ],
  },
  {
    name: "Hanging Leg Raise",
    muscleGroup: "core",
    equipment: "full_gym",
    description: "Lower-ab and hip-flexor builder.",
    formCues: [
      "Hang with shoulders engaged",
      "Raise legs with control, no swinging",
      "Curl the pelvis up at the top",
      "Lower slowly to a full hang",
    ],
  },
  {
    name: "Burpee",
    muscleGroup: "full_body",
    equipment: "home",
    description: "Full-body conditioning movement.",
    formCues: [
      "Drop to a plank in one motion",
      "Keep the core tight in the push-up",
      "Snap feet back under hips",
      "Explode up with arms overhead",
    ],
  },
];

export async function seedExerciseCatalogIfNeeded(): Promise<void> {
  try {
    const existing = await db
      .select({ name: exercisesTable.name })
      .from(exercisesTable)
      .where(and(isNull(exercisesTable.userId), eq(exercisesTable.isCustom, false)));
    const existingNames = new Set(existing.map((r) => r.name));
    const toInsert = CATALOG.filter((c) => !existingNames.has(c.name));
    if (toInsert.length === 0) return;
    await db.insert(exercisesTable).values(
      toInsert.map((c) => ({
        userId: null,
        name: c.name,
        muscleGroup: c.muscleGroup,
        equipment: c.equipment,
        description: c.description,
        formCues: c.formCues,
        isCustom: false,
      })),
    );
    logger.info({ count: toInsert.length }, "Seeded exercise catalog");
  } catch (err) {
    logger.error({ err }, "Failed to seed exercise catalog");
  }
}
